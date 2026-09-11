from pydantic import BaseModel, Field
from typing import List, Optional


class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemOut(BaseModel):
    id: str
    product_id: str
    name: str
    slug: str
    image: Optional[str] = None
    price: float
    original_price: float
    quantity: int
    stock: int
    subtotal: float


class CartSummary(BaseModel):
    items: List[CartItemOut]
    subtotal: float
    discount: float
    delivery_fee: float
    total: float
    coupon_code: Optional[str] = None
    item_count: int


class ApplyCoupon(BaseModel):
    code: str


class WishlistItemOut(BaseModel):
    id: str
    product_id: str
    name: str
    slug: str
    image: Optional[str] = None
    price: float
    original_price: float
    discount_percent: int
    stock: int
    rating_avg: float
