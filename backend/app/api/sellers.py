from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database.db import get_db
from app.models.user import User, Seller
from app.models.product import Product
from app.models.order import OrderItem
from app.models.enums import UserRole, SellerStatus, ProductStatus, OrderStatus
from app.schemas.seller import SellerRegister, SellerOut, SellerUpdate, SellerStatusUpdate
from app.core.deps import get_current_user, require_admin, get_current_seller
from app.services.storage import storage

router = APIRouter(prefix="/api/sellers", tags=["sellers"])


@router.post("/register", response_model=SellerOut)
def register_seller(payload: SellerRegister, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admin accounts cannot register as sellers")
    existing = db.query(Seller).filter(Seller.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a seller account")

    seller = Seller(
        user_id=user.id, store_name=payload.store_name, owner_name=payload.owner_name,
        email=payload.email, phone=payload.phone, description=payload.description,
        address=payload.address, status=SellerStatus.PENDING,
    )
    db.add(seller)
    user.role = UserRole.SELLER
    db.commit()
    db.refresh(seller)
    return seller


@router.get("/me", response_model=SellerOut)
def get_my_seller_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return seller


@router.put("/me", response_model=SellerOut)
def update_seller_profile(payload: SellerUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(seller, k, v)
    db.commit()
    db.refresh(seller)
    return seller


@router.post("/me/logo")
def upload_logo(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    url = storage.save(file, subfolder="sellers")
    seller.logo_url = url
    db.commit()
    return {"url": url}


@router.get("/me/dashboard")
def seller_dashboard(seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)):
    total_products = db.query(func.count(Product.id)).filter(Product.seller_id == seller.id).scalar() or 0
    items = db.query(OrderItem).filter(OrderItem.seller_id == seller.id).all()
    total_orders = len({i.order_id for i in items})
    revenue = sum(i.price * i.quantity for i in items if i.item_status != OrderStatus.CANCELLED)
    pending_orders = len({i.order_id for i in items if i.item_status in (OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING)})
    low_stock = db.query(func.count(Product.id)).filter(Product.seller_id == seller.id, Product.stock > 0, Product.stock <= 5).scalar() or 0
    out_of_stock = db.query(func.count(Product.id)).filter(Product.seller_id == seller.id, Product.stock == 0).scalar() or 0
    total_sales_qty = sum(i.quantity for i in items if i.item_status != OrderStatus.CANCELLED)

    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "revenue": round(revenue, 2),
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock,
        "total_units_sold": total_sales_qty,
        "commission_rate": seller.commission_rate,
        "net_earnings": round(revenue * (1 - seller.commission_rate / 100), 2),
    }


@router.get("/me/inventory")
def seller_inventory(seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.seller_id == seller.id).all()
    return [
        {
            "id": p.id, "name": p.name, "sku": p.sku, "stock": p.stock, "status": p.status.value,
            "price": p.price, "is_low_stock": 0 < p.stock <= 5, "is_out_of_stock": p.stock == 0,
        }
        for p in products
    ]


@router.put("/me/inventory/{product_id}")
def update_stock(product_id: str, stock: int, seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    product.stock = stock
    if stock == 0:
        product.status = ProductStatus.OUT_OF_STOCK
    elif product.status == ProductStatus.OUT_OF_STOCK and stock > 0:
        product.status = ProductStatus.ACTIVE
    db.commit()
    return {"message": "Stock updated", "stock": product.stock, "status": product.status.value}


# ---------- Admin: seller management ----------

@router.get("/admin/all", response_model=List[SellerOut], dependencies=[Depends(require_admin)])
def admin_list_sellers(db: Session = Depends(get_db)):
    return db.query(Seller).order_by(Seller.created_at.desc()).all()


@router.put("/admin/{seller_id}/status", response_model=SellerOut, dependencies=[Depends(require_admin)])
def admin_update_seller_status(seller_id: str, payload: SellerStatusUpdate, db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    seller.status = payload.status
    db.commit()
    db.refresh(seller)
    return seller
