import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.db import get_db
from app.models.user import User, Seller
from app.models.cart import Cart, CartItem
from app.models.address import Address
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatusHistory, Payment
from app.models.coupon import Coupon, CouponUsage
from app.models.enums import (
    ProductStatus, OrderStatus, PaymentStatus, PaymentMethod, DiscountType, UserRole,
)
from app.schemas.order import CheckoutRequest, CheckoutResponse, ConfirmPaymentRequest, OrderOut, OrderStatusUpdate
from app.core.deps import get_current_user, get_current_seller, require_admin
from app.core.config import settings
from app.core.limiter import limiter
from app.services.payment import get_payment_provider

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _gen_order_number() -> str:
    return "WM" + "".join(random.choices(string.digits, k=10))


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit(settings.RATE_LIMIT_CHECKOUT)
def checkout(request: Request, payload: CheckoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    address = db.query(Address).filter(Address.id == payload.address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=400, detail="Invalid shipping address")

    # ---- Server-side price & stock recomputation. Client totals are NEVER trusted. ----
    subtotal = 0.0
    line_items = []
    for item in cart.items:
        product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
        if not product or product.status != ProductStatus.ACTIVE:
            raise HTTPException(status_code=400, detail=f"'{item.product.name if item.product else 'A product'}' is no longer available")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"'{product.name}' has insufficient stock (only {product.stock} left)")
        line_subtotal = round(product.price * item.quantity, 2)
        subtotal += line_subtotal
        line_items.append((product, item.quantity))

    discount = 0.0
    coupon = None
    if payload.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == payload.coupon_code.upper()).first()
        now = datetime.utcnow()
        valid = (
            coupon
            and coupon.is_active
            and coupon.start_date <= now <= coupon.expiry_date
            and subtotal >= coupon.min_order_amount
            and (coupon.usage_limit is None or coupon.used_count < coupon.usage_limit)
        )
        if not valid:
            raise HTTPException(status_code=400, detail="Coupon is invalid, expired, or minimum order not met")
        if coupon.discount_type == DiscountType.PERCENTAGE:
            discount = subtotal * (coupon.discount_value / 100)
            if coupon.max_discount_amount:
                discount = min(discount, coupon.max_discount_amount)
        else:
            discount = min(coupon.discount_value, subtotal)

    delivery_fee = 0.0 if subtotal >= settings.FREE_DELIVERY_THRESHOLD else settings.DELIVERY_FEE
    total = max(0.0, round(subtotal - discount + delivery_fee, 2))

    order = Order(
        order_number=_gen_order_number(),
        user_id=user.id,
        subtotal=round(subtotal, 2),
        discount_amount=round(discount, 2),
        delivery_fee=delivery_fee,
        total=total,
        coupon_code=coupon.code if coupon else None,
        shipping_address_snapshot={
            "full_name": address.full_name, "phone": address.phone, "street": address.street,
            "city": address.city, "state": address.state, "postal_code": address.postal_code,
            "country": address.country, "address_type": address.address_type.value,
        },
        payment_method=payload.payment_method,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    db.flush()

    created_items = []
    for product, qty in line_items:
        image = None
        if product.images:
            primary = next((i for i in product.images if i.is_primary), product.images[0])
            image = primary.url
        order_item = OrderItem(
            order_id=order.id, product_id=product.id, seller_id=product.seller_id,
            product_name_snapshot=product.name, product_image_snapshot=image,
            price=product.price, quantity=qty, item_status=OrderStatus.PENDING,
        )
        db.add(order_item)
        created_items.append(order_item)
        product.stock -= qty
        product.sold_count = (product.sold_count or 0) + qty
        if product.stock <= 0:
            product.status = ProductStatus.OUT_OF_STOCK

    db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.PENDING, note="Order placed"))

    # ---- Payment ----
    # For COD, or when the mock provider auto-succeeds, we can confirm the
    # order immediately. For a real gateway (e.g. Razorpay), payment is only
    # "created" here — the frontend must open the provider's checkout widget
    # and then call /orders/{id}/confirm-payment once the customer pays.
    provider = get_payment_provider()
    intent = None
    payment_status = PaymentStatus.PENDING
    if payload.payment_method == PaymentMethod.ONLINE:
        try:
            intent = provider.create_payment_intent(order.id, total)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Could not initialize payment: {exc}")
        payment_status = PaymentStatus.PAID if intent.status == "paid" else PaymentStatus.PENDING
        db.add(Payment(
            order_id=order.id, provider=intent.provider, provider_reference=intent.reference,
            amount=total, status=payment_status, method=payload.payment_method,
        ))
        if payment_status == PaymentStatus.PAID:
            order.status = OrderStatus.CONFIRMED
            # NOTE: `order.items` would be stale here — it was initialized as
            # an empty in-memory collection when `order` was constructed, and
            # since the OrderItem rows above were created via db.add(...)
            # directly (not order.items.append(...)), that cached collection
            # never picked them up. Iterate the local list we just built instead.
            for item in created_items:
                item.item_status = OrderStatus.CONFIRMED
            db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.CONFIRMED, note="Payment confirmed"))
    else:
        # Cash on Delivery — payment collected on delivery; order starts in
        # the normal PENDING state and moves through the seller fulfillment
        # pipeline like any other order.
        db.add(Payment(
            order_id=order.id, provider="cod", provider_reference=None,
            amount=total, status=PaymentStatus.PENDING, method=PaymentMethod.COD,
        ))

    if coupon:
        coupon.used_count += 1
        db.add(CouponUsage(coupon_id=coupon.id, user_id=user.id, order_id=order.id))

    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

    db.commit()
    db.refresh(order)

    return CheckoutResponse(
        order=order,
        payment_required=payload.payment_method == PaymentMethod.ONLINE and payment_status != PaymentStatus.PAID,
        payment_provider=intent.provider if intent else None,
        provider_order_id=intent.reference if intent else None,
        provider_key_id=intent.key_id if intent else None,
        amount=intent.amount if intent else None,
        currency=intent.currency if intent else None,
    )


@router.post("/{order_id}/confirm-payment", response_model=OrderOut)
@limiter.limit(settings.RATE_LIMIT_CHECKOUT)
def confirm_payment(
    request: Request,
    order_id: str,
    payload: ConfirmPaymentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by the frontend after the customer completes payment in the
    provider's checkout widget (e.g. Razorpay Checkout). The signature is
    re-verified server-side — the client's word alone is never trusted to
    mark an order paid.
    """
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        raise HTTPException(status_code=400, detail="No payment record for this order")
    if payment.status == PaymentStatus.PAID:
        return order  # idempotent — already confirmed (e.g. via webhook)

    provider = get_payment_provider()
    verified = provider.verify_payment(payment.provider_reference, payload.model_dump())
    if not verified:
        payment.status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed. Please try again or contact support.")

    payment.status = PaymentStatus.PAID
    payment.provider_payment_id = payload.provider_payment_id
    order.status = OrderStatus.CONFIRMED
    for item in order.items:
        item.item_status = OrderStatus.CONFIRMED
    db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.CONFIRMED, note="Payment verified and confirmed"))
    db.commit()
    db.refresh(order)
    return order


@router.get("/my", response_model=List[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.status_history))
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.status_history))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    return order


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in (OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED):
        raise HTTPException(status_code=400, detail=f"Order cannot be cancelled once it is {order.status.value}")

    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
            if product.status == ProductStatus.OUT_OF_STOCK and product.stock > 0:
                product.status = ProductStatus.ACTIVE

    order.status = OrderStatus.CANCELLED
    db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.CANCELLED, note="Cancelled by customer"))
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/return", response_model=OrderOut)
def request_return(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")
    order.status = OrderStatus.RETURN_REQUESTED
    db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.RETURN_REQUESTED, note="Return requested by customer"))
    db.commit()
    db.refresh(order)
    return order


# ---------- Seller order management ----------

@router.get("/seller/mine", response_model=List[dict])
def seller_orders(seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)):
    items = (
        db.query(OrderItem)
        .options(joinedload(OrderItem.order))
        .filter(OrderItem.seller_id == seller.id)
        .order_by(OrderItem.id.desc())
        .all()
    )
    result = []
    for item in items:
        order = item.order
        result.append({
            "order_item_id": item.id,
            "order_id": order.id,
            "order_number": order.order_number,
            "product_name": item.product_name_snapshot,
            "product_image": item.product_image_snapshot,
            "quantity": item.quantity,
            "price": item.price,
            "item_status": item.item_status.value,
            "order_status": order.status.value,
            "shipping_address": order.shipping_address_snapshot,
            "created_at": order.created_at.isoformat(),
        })
    return result


@router.put("/seller/item/{order_item_id}/status")
def update_item_status(
    order_item_id: str, payload: OrderStatusUpdate, seller: Seller = Depends(get_current_seller), db: Session = Depends(get_db)
):
    item = db.query(OrderItem).filter(OrderItem.id == order_item_id, OrderItem.seller_id == seller.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found or does not belong to your store")

    allowed_transitions = {
        OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
        OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.OUT_FOR_DELIVERY},
        OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED},
    }
    if payload.status not in allowed_transitions.get(item.item_status, set()):
        raise HTTPException(status_code=400, detail=f"Cannot move item from {item.item_status.value} to {payload.status.value}")

    item.item_status = payload.status
    order = db.query(Order).filter(Order.id == item.order_id).first()

    # Order-level status reflects the most advanced/least advanced item state.
    sibling_statuses = [i.item_status for i in order.items]
    if all(s == OrderStatus.DELIVERED for s in sibling_statuses):
        order.status = OrderStatus.DELIVERED
    elif all(s == OrderStatus.CANCELLED for s in sibling_statuses):
        order.status = OrderStatus.CANCELLED
    else:
        # order status = earliest stage among non-cancelled items
        order_stage = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED]
        active = [s for s in sibling_statuses if s != OrderStatus.CANCELLED]
        if active:
            order.status = min(active, key=lambda s: order_stage.index(s))

    db.add(OrderStatusHistory(order_id=order.id, status=payload.status, note=payload.note or f"Updated by seller"))
    db.commit()
    return {"message": "Order item status updated"}


# ---------- Admin order management ----------

@router.get("/admin/all", response_model=List[OrderOut], dependencies=[Depends(require_admin)])
def admin_all_orders(db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.status_history))
        .order_by(Order.created_at.desc())
        .limit(500)
        .all()
    )
