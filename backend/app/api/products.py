import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from slugify import slugify
import uuid

from app.database.db import get_db
from app.models.product import Product, Category, ProductImage, ProductSpecification
from app.models.user import Seller
from app.models.review import Review
from app.models.enums import ProductStatus
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductCardOut, ProductDetailOut, PaginatedProducts,
)
from app.core.deps import get_current_seller, require_admin, get_current_user_optional
from app.services.storage import storage

router = APIRouter(prefix="/api/products", tags=["products"])


def _primary_image(product: Product) -> Optional[str]:
    if product.images:
        primary = next((i for i in product.images if i.is_primary), product.images[0])
        return primary.url
    return None


def _to_card(product: Product) -> ProductCardOut:
    return ProductCardOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        price=product.price,
        original_price=product.original_price,
        discount_percent=product.discount_percent,
        rating_avg=round(product.rating_avg or 0, 1),
        rating_count=product.rating_count or 0,
        stock=product.stock,
        status=product.status,
        image=_primary_image(product),
        brand=product.brand,
    )


@router.get("", response_model=PaginatedProducts)
def list_products(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Category slug"),
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock: Optional[bool] = None,
    min_discount: Optional[int] = None,
    sort: str = Query("relevance", pattern="^(relevance|price_asc|price_desc|rating|newest)$"),
    featured: Optional[bool] = None,
    seller_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(joinedload(Product.images)).filter(
        Product.status == ProductStatus.ACTIVE
    )

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Product.name.ilike(like),
                Product.description.ilike(like),
                Product.brand.ilike(like),
                Product.tags.ilike(like),
            )
        )

    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            child_ids = [c.id for c in db.query(Category).filter(Category.parent_id == cat.id).all()]
            query = query.filter(Product.category_id.in_([cat.id] + child_ids))
        else:
            query = query.filter(Product.id == None)  # noqa: E711

    if brand:
        query = query.filter(Product.brand.ilike(brand))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if min_rating is not None:
        query = query.filter(Product.rating_avg >= min_rating)
    if in_stock:
        query = query.filter(Product.stock > 0)
    if min_discount is not None:
        query = query.filter(
            (1 - (Product.price / Product.original_price)) * 100 >= min_discount
        )
    if featured:
        query = query.filter(Product.is_featured == True)  # noqa: E712
    if seller_id:
        query = query.filter(Product.seller_id == seller_id)

    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating_avg.desc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    else:
        query = query.order_by(Product.sold_count.desc(), Product.rating_avg.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedProducts(
        items=[_to_card(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/brands", response_model=List[str])
def list_brands(db: Session = Depends(get_db)):
    rows = db.query(Product.brand).filter(
        Product.status == ProductStatus.ACTIVE, Product.brand.isnot(None)
    ).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@router.get("/{slug}", response_model=ProductDetailOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.specifications), joinedload(Product.category), joinedload(Product.seller))
        .filter(Product.slug == slug)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.view_count = (product.view_count or 0) + 1
    db.commit()

    return ProductDetailOut(
        id=product.id, name=product.name, slug=product.slug, description=product.description,
        brand=product.brand, price=product.price, original_price=product.original_price,
        discount_percent=product.discount_percent, stock=product.stock, sku=product.sku,
        tags=product.tags, status=product.status, rejection_reason=product.rejection_reason,
        is_featured=product.is_featured, rating_avg=round(product.rating_avg or 0, 1),
        rating_count=product.rating_count or 0, sold_count=product.sold_count or 0,
        created_at=product.created_at, category=product.category, seller=product.seller,
        images=product.images,
        specifications=[{"key": s.spec_key, "value": s.spec_value} for s in product.specifications],
    )


@router.get("/{product_id}/related", response_model=List[ProductCardOut])
def related_products(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    items = (
        db.query(Product)
        .options(joinedload(Product.images))
        .filter(
            Product.category_id == product.category_id,
            Product.id != product.id,
            Product.status == ProductStatus.ACTIVE,
        )
        .order_by(Product.rating_avg.desc())
        .limit(8)
        .all()
    )
    return [_to_card(p) for p in items]


# ---------- Seller product management ----------

@router.get("/seller/mine", response_model=List[ProductCardOut])
def my_products(seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)):
    items = (
        db.query(Product)
        .options(joinedload(Product.images))
        .filter(Product.seller_id == seller.id)
        .order_by(Product.created_at.desc())
        .all()
    )
    return [_to_card(p) for p in items]


@router.get("/seller/mine/{product_id}")
def get_my_product(
    product_id: str, seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.specifications))
        .filter(Product.id == product_id, Product.seller_id == seller.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "category_id": product.category_id,
        "brand": product.brand,
        "price": product.price,
        "original_price": product.original_price,
        "stock": product.stock,
        "sku": product.sku,
        "tags": product.tags,
        "status": product.status.value,
        "images": [img.url for img in product.images],
        "specifications": [{"spec_key": s.spec_key, "spec_value": s.spec_value} for s in product.specifications],
    }


@router.post("/seller/upload-image")
def upload_product_image(
    file: UploadFile = File(...), seller: Seller = Depends(get_current_seller)
):
    url = storage.save(file, subfolder="products")
    return {"url": url}


@router.post("", response_model=ProductCardOut)
def create_product(
    payload: ProductCreate, seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)
):
    if payload.original_price < payload.price:
        raise HTTPException(status_code=400, detail="Original price cannot be less than sale price")

    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category")

    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    slug = payload.slug or slugify(payload.name)
    base_slug = slug
    i = 1
    while db.query(Product).filter(Product.slug == slug).first():
        slug = f"{base_slug}-{i}"
        i += 1

    product = Product(
        seller_id=seller.id,
        category_id=payload.category_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        brand=payload.brand,
        price=payload.price,
        original_price=payload.original_price,
        stock=payload.stock,
        sku=payload.sku,
        tags=payload.tags,
        status=ProductStatus.PENDING_APPROVAL,
    )
    db.add(product)
    db.flush()

    for idx, url in enumerate(payload.images or []):
        db.add(ProductImage(product_id=product.id, url=url, sort_order=idx, is_primary=(idx == 0)))
    for spec in payload.specifications or []:
        db.add(ProductSpecification(product_id=product.id, spec_key=spec.spec_key, spec_value=spec.spec_value))

    db.commit()
    db.refresh(product)
    return _to_card(product)


@router.put("/{product_id}", response_model=ProductCardOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True, exclude={"specifications", "images", "status"})
    for k, v in data.items():
        setattr(product, k, v)

    if payload.images is not None:
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for idx, url in enumerate(payload.images):
            db.add(ProductImage(product_id=product.id, url=url, sort_order=idx, is_primary=(idx == 0)))

    if payload.specifications is not None:
        db.query(ProductSpecification).filter(ProductSpecification.product_id == product.id).delete()
        for spec in payload.specifications:
            db.add(ProductSpecification(product_id=product.id, spec_key=spec.spec_key, spec_value=spec.spec_value))

    # Sellers editing an active product sends it back for re-approval to prevent
    # unreviewed price/content manipulation on live listings.
    if payload.status is None and any(k in data for k in ("name", "description", "price", "category_id")):
        if product.status == ProductStatus.ACTIVE:
            product.status = ProductStatus.PENDING_APPROVAL

    db.commit()
    db.refresh(product)
    return _to_card(product)


@router.delete("/{product_id}")
def delete_product(
    product_id: str, seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


# ---------- Admin moderation ----------

@router.get("/admin/pending", response_model=List[ProductCardOut], dependencies=[Depends(require_admin)])
def pending_products(db: Session = Depends(get_db)):
    items = (
        db.query(Product)
        .options(joinedload(Product.images))
        .filter(Product.status == ProductStatus.PENDING_APPROVAL)
        .order_by(Product.created_at.asc())
        .all()
    )
    return [_to_card(p) for p in items]


@router.post("/admin/{product_id}/approve", dependencies=[Depends(require_admin)])
def approve_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = ProductStatus.ACTIVE if product.stock > 0 else ProductStatus.OUT_OF_STOCK
    product.rejection_reason = None
    db.commit()
    return {"message": "Product approved"}


@router.post("/admin/{product_id}/reject", dependencies=[Depends(require_admin)])
def reject_product(product_id: str, reason: str = "", db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = ProductStatus.REJECTED
    product.rejection_reason = reason or "Did not meet marketplace guidelines"
    db.commit()
    return {"message": "Product rejected"}
