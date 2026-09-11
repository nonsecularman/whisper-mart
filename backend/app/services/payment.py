"""
Payment service abstraction.

WHY: Business logic (order creation, checkout) never talks to a payment
gateway's SDK directly. Everything goes through the PaymentProvider
interface below, so swapping providers is a one-line config change.

Two providers ship today:
  - MockPaymentProvider: safe, no external credentials, auto-succeeds.
    Used whenever PAYMENT_PROVIDER=mock (the default).
  - RazorpayProvider: a real, working integration against the Razorpay
    Orders API. Used when PAYMENT_PROVIDER=razorpay and
    PAYMENT_KEY_ID / PAYMENT_KEY_SECRET are set.

Two-phase online payment flow (required by every real gateway, since the
customer must interact with a hosted/embedded checkout widget before a
payment can be confirmed):

  1. POST /api/orders/checkout
     -> creates our Order (PENDING) + reserves stock
     -> calls provider.create_payment_intent(...)
     -> for Razorpay this creates a Razorpay Order and returns its id +
        our public key id + amount, which the frontend uses to open the
        Razorpay Checkout widget.
     -> for Mock this immediately reports "paid" so the whole flow can be
        tested with zero external accounts.

  2. POST /api/orders/{id}/confirm-payment  (only used for real gateways)
     -> frontend sends back {provider_payment_id, provider_order_id,
        provider_signature} that Razorpay's widget returned on success
     -> provider.verify_payment(...) cryptographically verifies the
        signature server-side before the order is marked CONFIRMED.

  3. POST /api/payments/webhook/razorpay  (production safety net)
     -> Razorpay calls this asynchronously even if the customer closes
        their browser right after paying. Verified via the webhook
        secret, so it's safe to trust without a logged-in session.
"""
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from app.core.config import settings


@dataclass
class PaymentIntentResult:
    provider: str
    reference: str          # provider-side order/intent id
    status: str              # "created" | "paid" | "failed"
    key_id: Optional[str] = None      # public key the frontend needs to open a checkout widget
    amount: Optional[float] = None    # rupees
    currency: str = "INR"


class PaymentProvider(ABC):
    @abstractmethod
    def create_payment_intent(self, order_id: str, amount: float) -> PaymentIntentResult:
        ...

    @abstractmethod
    def verify_payment(self, reference: str, payload: dict) -> bool:
        ...

    def verify_webhook(self, raw_body: bytes, signature: str) -> bool:
        """Override for providers that support async webhook confirmation."""
        return False

    def parse_webhook_order_reference(self, payload: dict) -> Optional[str]:
        """Extract the provider order reference from a webhook payload, if present."""
        return None


class MockPaymentProvider(PaymentProvider):
    """
    Safe development/test provider. No real money moves, no external
    credentials required. Auto-succeeds so the full checkout flow —
    including the ONLINE payment method — can be tested end-to-end.
    """

    def create_payment_intent(self, order_id: str, amount: float) -> PaymentIntentResult:
        reference = f"mock_{uuid.uuid4().hex[:16]}"
        return PaymentIntentResult(
            provider="mock", reference=reference, status="paid",
            key_id=None, amount=amount, currency="INR",
        )

    def verify_payment(self, reference: str, payload: dict) -> bool:
        return reference.startswith("mock_")


class RazorpayProvider(PaymentProvider):
    """
    Real Razorpay integration using the official `razorpay` Python SDK.
    Activated when PAYMENT_PROVIDER=razorpay and both PAYMENT_KEY_ID and
    PAYMENT_KEY_SECRET are set (get these from the Razorpay Dashboard →
    Settings → API Keys). For webhook verification, also set
    RAZORPAY_WEBHOOK_SECRET (Dashboard → Settings → Webhooks).
    """

    def __init__(self, key_id: str, key_secret: str, webhook_secret: str = ""):
        if not key_id or not key_secret:
            raise ValueError(
                "PAYMENT_KEY_ID / PAYMENT_KEY_SECRET must be set to use RazorpayProvider. "
                "Get these from the Razorpay Dashboard under Settings > API Keys."
            )
        import razorpay  # local import so the package is only required when actually used

        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret
        self.client = razorpay.Client(auth=(key_id, key_secret))

    def create_payment_intent(self, order_id: str, amount: float) -> PaymentIntentResult:
        amount_paise = int(round(amount * 100))
        rzp_order = self.client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": order_id,
            "payment_capture": 1,  # auto-capture on successful authorization
        })
        return PaymentIntentResult(
            provider="razorpay",
            reference=rzp_order["id"],
            status="created",
            key_id=self.key_id,
            amount=amount,
            currency="INR",
        )

    def verify_payment(self, reference: str, payload: dict) -> bool:
        """
        `reference` is the Razorpay order id we created at checkout time.
        `payload` must contain razorpay_payment_id, razorpay_order_id,
        razorpay_signature as returned by the Checkout widget's success handler.
        """
        import razorpay

        if payload.get("razorpay_order_id") != reference:
            return False
        try:
            self.client.utility.verify_payment_signature({
                "razorpay_order_id": payload.get("razorpay_order_id"),
                "razorpay_payment_id": payload.get("razorpay_payment_id"),
                "razorpay_signature": payload.get("razorpay_signature"),
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    def verify_webhook(self, raw_body: bytes, signature: str) -> bool:
        if not self.webhook_secret:
            return False
        import razorpay
        try:
            self.client.utility.verify_webhook_signature(
                raw_body.decode("utf-8"), signature, self.webhook_secret
            )
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    def parse_webhook_order_reference(self, payload: dict) -> Optional[str]:
        try:
            return payload["payload"]["payment"]["entity"]["order_id"]
        except (KeyError, TypeError):
            return None


def get_payment_provider() -> PaymentProvider:
    provider = settings.PAYMENT_PROVIDER.lower()
    if provider == "razorpay":
        return RazorpayProvider(settings.PAYMENT_KEY_ID, settings.PAYMENT_KEY_SECRET, settings.RAZORPAY_WEBHOOK_SECRET)
    return MockPaymentProvider()
