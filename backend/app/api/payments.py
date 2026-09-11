import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.core.config import settings
from app.models.order import Order, Payment, OrderStatusHistory
from app.models.enums import PaymentStatus, OrderStatus
from app.services.payment import get_payment_provider

router = APIRouter(prefix="/api/payments", tags=["payments"])
logger = logging.getLogger("whisper_mart.payments")


@router.get("/config")
def payment_config():
    """
    Public, non-secret info the frontend needs to decide how to collect
    payment: which provider is active and (if applicable) the *public*
    key id used to open that provider's checkout widget. Never returns
    the secret key.
    """
    provider = settings.PAYMENT_PROVIDER.lower()
    return {
        "provider": provider,
        "key_id": settings.PAYMENT_KEY_ID if provider == "razorpay" else None,
    }


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Production safety net: Razorpay calls this server-to-server once a
    payment is captured, independent of whether the customer's browser
    is still open. This is the authoritative source of truth for payment
    state — the /orders/{id}/confirm-payment endpoint is a same-request
    convenience path for a snappier UI, but a real deployment should treat
    this webhook as the final word.

    Configure the webhook URL in the Razorpay Dashboard as:
        https://api.<your-domain>/api/payments/webhook/razorpay
    and set RAZORPAY_WEBHOOK_SECRET to the secret shown there.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    provider = get_payment_provider()
    if not provider.verify_webhook(raw_body, signature):
        logger.warning("Rejected Razorpay webhook with invalid signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event")

    if event == "payment.captured":
        provider_order_id = provider.parse_webhook_order_reference(payload)
        if not provider_order_id:
            return {"status": "ignored", "reason": "no order reference in payload"}

        payment = db.query(Payment).filter(Payment.provider_reference == provider_order_id).first()
        if not payment:
            logger.warning("Webhook for unknown provider order id: %s", provider_order_id)
            return {"status": "ignored", "reason": "unknown order"}

        if payment.status != PaymentStatus.PAID:
            payment.status = PaymentStatus.PAID
            try:
                payment.provider_payment_id = payload["payload"]["payment"]["entity"]["id"]
            except (KeyError, TypeError):
                pass

            order = db.query(Order).filter(Order.id == payment.order_id).first()
            if order and order.status not in (OrderStatus.CANCELLED,):
                order.status = OrderStatus.CONFIRMED
                for item in order.items:
                    item.item_status = OrderStatus.CONFIRMED
                db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.CONFIRMED, note="Payment confirmed via webhook"))
            db.commit()
            logger.info("Confirmed payment for order %s via webhook", payment.order_id)

    return {"status": "ok"}
