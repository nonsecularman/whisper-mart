from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.db import get_db
from app.models.user import User
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.coupon import Coupon
from app.models.enums import ProductStatus, DiscountType
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartSummary, CartItemOut, ApplyCoupon
from app.core.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _get_or_create_cart(user: User, db: Session) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _build_summary(cart: Cart, db: Session, coupon_code: str | None = None) -> CartSummary:
    items_out = []
    subtotal = 0.0
    for item in cart.items:
        product = item.product
        if not product:
            continue
        image = None
        if product.images:
            primary = next((i for i in product.images if i.is_primary), product.images[0])
            image = primary.url
        line_subtotal = round(product.price * item.quantity, 2)
        subtotal += line_subtotal
        items_out.append(
            CartItemOut(
                id=item.id,
                product_id=product.id,
                name=product.name,
                slug=product.slug,
                image=image,
                price=product.price,
                original_price=product.original_price,
                quantity=item.quantity,
                stock=product.stock,
                subtotal=line_subtotal,
            )
        )

    discount = 0.0
    applied_code = None
    if coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == coupon_code.upper()).first()
        now = datetime.utcnow()
        if (
            coupon
            and coupon.is_active
            and coupon.start_date <= now <= coupon.expiry_date
            and subtotal >= coupon.min_order_amount
            and (coupon.usage_limit is None or coupon.used_count < coupon.usage_limit)
        ):
            if coupon.discount_type == DiscountType.PERCENTAGE:
                discount = subtotal * (coupon.discount_value / 100)
                if coupon.max_discount_amount:
                    discount = min(discount, coupon.max_discount_amount)
            else:
                discount = min(coupon.discount_value, subtotal)
            applied_code = coupon.code

    delivery_fee = 0.0 if subtotal == 0 or subtotal >= settings.FREE_DELIVERY_THRESHOLD else settings.DELIVERY_FEE
    total = max(0.0, round(subtotal - discount + delivery_fee, 2))

    return CartSummary(
        items=items_out,
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        delivery_fee=delivery_fee,
        total=total,
        coupon_code=applied_code,
        item_count=sum(i.quantity for i in cart.items),
    )


@router.get("", response_model=CartSummary)
def get_cart(
    coupon_code: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    cart = _get_or_create_cart(user, db)
    return _build_summary(cart, db, coupon_code)


@router.post("/items", response_model=CartSummary)
def add_item(
    payload: CartItemAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product or product.status != ProductStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Product not available")
    if product.stock < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cart = _get_or_create_cart(user, db)
    existing = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product.id).first()
    if existing:
        new_qty = existing.quantity + payload.quantity
        if new_qty > product.stock:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        existing.quantity = new_qty
    else:
        db.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=payload.quantity))
    db.commit()
    db.refresh(cart)
    return _build_summary(cart, db)


@router.put("/items/{item_id}", response_model=CartSummary)
def update_item(
    item_id: str, payload: CartItemUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    cart = _get_or_create_cart(user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if payload.quantity > item.product.stock:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    item.quantity = payload.quantity
    db.commit()
    db.refresh(cart)
    return _build_summary(cart, db)


@router.delete("/items/{item_id}", response_model=CartSummary)
def remove_item(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if item:
        db.delete(item)
        db.commit()
    db.refresh(cart)
    return _build_summary(cart, db)


@router.post("/validate-coupon", response_model=CartSummary)
def validate_coupon(payload: ApplyCoupon, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    summary = _build_summary(cart, db, payload.code)
    if summary.coupon_code is None:
        raise HTTPException(status_code=400, detail="Coupon is invalid, expired, or minimum order not met")
    return summary
