from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.user import User
from app.models.cart import Wishlist, WishlistItem, Cart, CartItem
from app.models.product import Product
from app.schemas.cart import WishlistItemOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


def _get_or_create_wishlist(user: User, db: Session) -> Wishlist:
    wl = db.query(Wishlist).filter(Wishlist.user_id == user.id).first()
    if not wl:
        wl = Wishlist(user_id=user.id)
        db.add(wl)
        db.commit()
        db.refresh(wl)
    return wl


def _to_out(item: WishlistItem) -> WishlistItemOut:
    p = item.product
    image = None
    if p.images:
        primary = next((i for i in p.images if i.is_primary), p.images[0])
        image = primary.url
    return WishlistItemOut(
        id=item.id, product_id=p.id, name=p.name, slug=p.slug, image=image,
        price=p.price, original_price=p.original_price, discount_percent=p.discount_percent,
        stock=p.stock, rating_avg=round(p.rating_avg or 0, 1),
    )


@router.get("", response_model=List[WishlistItemOut])
def get_wishlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wl = _get_or_create_wishlist(user, db)
    return [_to_out(i) for i in wl.items if i.product]


@router.post("/{product_id}", response_model=List[WishlistItemOut])
def add_to_wishlist(product_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    wl = _get_or_create_wishlist(user, db)
    existing = db.query(WishlistItem).filter(WishlistItem.wishlist_id == wl.id, WishlistItem.product_id == product_id).first()
    if not existing:
        db.add(WishlistItem(wishlist_id=wl.id, product_id=product_id))
        db.commit()
    db.refresh(wl)
    return [_to_out(i) for i in wl.items if i.product]


@router.delete("/{product_id}", response_model=List[WishlistItemOut])
def remove_from_wishlist(product_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wl = _get_or_create_wishlist(user, db)
    item = db.query(WishlistItem).filter(WishlistItem.wishlist_id == wl.id, WishlistItem.product_id == product_id).first()
    if item:
        db.delete(item)
        db.commit()
    db.refresh(wl)
    return [_to_out(i) for i in wl.items if i.product]


@router.post("/{product_id}/move-to-cart", response_model=List[WishlistItemOut])
def move_to_cart(product_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product or product.stock < 1:
        raise HTTPException(status_code=400, detail="Product unavailable")

    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.flush()

    existing_cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
    if existing_cart_item:
        existing_cart_item.quantity += 1
    else:
        db.add(CartItem(cart_id=cart.id, product_id=product_id, quantity=1))

    wl = _get_or_create_wishlist(user, db)
    item = db.query(WishlistItem).filter(WishlistItem.wishlist_id == wl.id, WishlistItem.product_id == product_id).first()
    if item:
        db.delete(item)

    db.commit()
    db.refresh(wl)
    return [_to_out(i) for i in wl.items if i.product]
