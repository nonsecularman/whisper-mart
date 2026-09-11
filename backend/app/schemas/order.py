from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.enums import AddressType, OrderStatus, PaymentStatus, PaymentMethod, DiscountType


class AddressCreate(BaseModel):
    full_name: str
    phone: str
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "India"
    address_type: AddressType = AddressType.HOME
    is_default: bool = False


class AddressUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    address_type: Optional[AddressType] = None
    is_default: Optional[bool] = None


class AddressOut(BaseModel):
    id: str
    full_name: str
    phone: str
    street: str
    city: str
    state: str
    postal_code: str
    country: str
    address_type: AddressType
    is_default: bool

    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    address_id: str
    payment_method: PaymentMethod = PaymentMethod.COD
    coupon_code: Optional[str] = None


class CheckoutResponse(BaseModel):
    order: "OrderOut"
    payment_required: bool
    payment_provider: Optional[str] = None
    provider_order_id: Optional[str] = None
    provider_key_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None


class ConfirmPaymentRequest(BaseModel):
    # Field names are Razorpay's exact callback field names since that's the
    # provider implemented today; a future provider can map its own fields
    # onto this same shape in its checkout UI integration.
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

    @property
    def provider_payment_id(self) -> str:
        return self.razorpay_payment_id


class OrderItemOut(BaseModel):
    id: str
    product_id: str
    product_name_snapshot: str
    product_image_snapshot: Optional[str] = None
    price: float
    quantity: int
    item_status: OrderStatus
    seller_id: str

    class Config:
        from_attributes = True


class OrderStatusHistoryOut(BaseModel):
    status: OrderStatus
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: str
    order_number: str
    subtotal: float
    discount_amount: float
    delivery_fee: float
    total: float
    coupon_code: Optional[str] = None
    status: OrderStatus
    payment_method: PaymentMethod
    shipping_address_snapshot: dict
    created_at: datetime
    items: List[OrderItemOut] = []
    status_history: List[OrderStatusHistoryOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None


CheckoutResponse.model_rebuild()


class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    images: Optional[str] = None


class ReviewOut(BaseModel):
    id: str
    product_id: str
    user_id: str
    user_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    images: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CouponCreate(BaseModel):
    code: str
    discount_type: DiscountType
    discount_value: float = Field(gt=0)
    min_order_amount: float = 0.0
    max_discount_amount: Optional[float] = None
    start_date: datetime
    expiry_date: datetime
    usage_limit: Optional[int] = None
    is_active: bool = True


class CouponUpdate(BaseModel):
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None


class CouponOut(BaseModel):
    id: str
    code: str
    discount_type: DiscountType
    discount_value: float
    min_order_amount: float
    max_discount_amount: Optional[float] = None
    start_date: datetime
    expiry_date: datetime
    usage_limit: Optional[int] = None
    used_count: int
    is_active: bool

    class Config:
        from_attributes = True
