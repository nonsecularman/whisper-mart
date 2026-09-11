"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { Spinner, EmptyState } from "@/components/UI";
import type { Address, Order, CheckoutResponse, PaymentConfig } from "@/types";

type Step = "address" | "summary" | "payment" | "confirmation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, refreshCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [placing, setPlacing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // New address form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", street: "", city: "", state: "", postal_code: "", is_default: false });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Address[]>("/api/users/me/addresses").then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.is_default) || list[0];
      if (def) setSelectedAddress(def.id);
      if (list.length === 0) setShowAddForm(true);
    });
    api.get<PaymentConfig>("/api/payments/config").then(setPaymentConfig).catch(() => {});
  }, [user]);

  if (authLoading) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  if (!user) {
    return (
      <EmptyState
        title="Login to checkout"
        action={<Link href="/auth/login" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">Login</Link>}
      />
    );
  }

  if (step !== "confirmation" && (!cart || cart.items.length === 0)) {
    return (
      <EmptyState
        title="Your cart is empty"
        action={<Link href="/search" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">Continue Shopping</Link>}
      />
    );
  }

  async function saveAddress() {
    setSavingAddress(true);
    try {
      const addr = await api.post<Address>("/api/users/me/addresses", form);
      const list = await api.get<Address[]>("/api/users/me/addresses");
      setAddresses(list);
      setSelectedAddress(addr.id);
      setShowAddForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save address", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  async function placeOrder() {
    if (!selectedAddress) {
      showToast("Please select a shipping address", "error");
      return;
    }
    setPlacing(true);
    setPaymentError(null);
    try {
      const result = await api.post<CheckoutResponse>("/api/orders/checkout", {
        address_id: selectedAddress,
        payment_method: paymentMethod,
      });

      if (!result.payment_required) {
        // COD, or an online payment that the (mock) provider already
        // confirmed synchronously — nothing further to do.
        setConfirmedOrder(result.order);
        setStep("confirmation");
        await refreshCart();
        return;
      }

      // Real gateway (e.g. Razorpay): open the hosted checkout widget and
      // let the customer complete payment there. We only mark the order
      // confirmed after the widget calls back with a signed success and
      // our backend verifies that signature.
      if (result.payment_provider === "razorpay" && result.provider_key_id) {
        openRazorpayCheckout(result);
      } else {
        showToast("Online payment is not configured. Please choose Cash on Delivery.", "error");
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not place order", "error");
    } finally {
      setPlacing(false);
    }
  }

  function openRazorpayCheckout(result: CheckoutResponse) {
    if (!razorpayReady || !window.Razorpay) {
      showToast("Payment gateway is still loading — please try again in a moment.", "error");
      return;
    }
    const rzp = new window.Razorpay({
      key: result.provider_key_id,
      amount: Math.round((result.amount || 0) * 100),
      currency: result.currency || "INR",
      order_id: result.provider_order_id,
      name: "Whisper Mart",
      description: `Order ${result.order.order_number}`,
      handler: async (response: any) => {
        try {
          const confirmed = await api.post<Order>(`/api/orders/${result.order.id}/confirm-payment`, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          setConfirmedOrder(confirmed);
          setStep("confirmation");
          await refreshCart();
        } catch (err) {
          setPaymentError(
            err instanceof ApiError
              ? err.message
              : "We couldn't verify your payment. If money was deducted, it will be refunded automatically — contact support with your order number if it isn't within 3-5 business days."
          );
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentError("Payment was cancelled. Your order is saved — you can retry payment from your order history.");
        },
      },
      prefill: { name: user?.name, email: user?.email },
      theme: { color: "#7f2fdb" },
    });
    rzp.on("payment.failed", (resp: any) => {
      setPaymentError(resp?.error?.description || "Payment failed. Please try again.");
    });
    rzp.open();
  }

  const steps: Step[] = ["address", "summary", "payment", "confirmation"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {paymentConfig?.provider === "razorpay" && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setRazorpayReady(true)}
          strategy="lazyOnload"
        />
      )}

      <div className="flex items-center justify-center gap-2 mb-8 text-xs font-semibold">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step === s || steps.indexOf(step) > i ? "bg-whisper-700 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i + 1}
            </div>
            <span className={step === s ? "text-whisper-700" : "text-gray-400"}>{s[0].toUpperCase() + s.slice(1)}</span>
            {i < steps.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {step === "address" && (
        <div className="bg-white rounded-xl2 shadow-card p-6">
          <h2 className="font-semibold text-lg text-ink-900 mb-4">Select Shipping Address</h2>
          {addresses === null && <Spinner />}
          <div className="space-y-3">
            {addresses?.map((a) => (
              <label key={a.id} className={`block border rounded-xl p-4 cursor-pointer ${selectedAddress === a.id ? "border-whisper-600 bg-whisper-50" : "border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} className="mt-1" />
                  <div className="text-sm">
                    <p className="font-semibold">{a.full_name} <span className="text-ink-500 font-normal">· {a.phone}</span></p>
                    <p className="text-ink-600">{a.street}, {a.city}, {a.state} {a.postal_code}, {a.country}</p>
                    {a.is_default && <span className="text-xs text-whisper-700 font-semibold">Default</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} className="mt-4 text-sm font-semibold text-whisper-700">+ Add new address</button>
          ) : (
            <div className="mt-4 border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Add New Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="House/Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Postal Code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Set as default
              </label>
              <button onClick={saveAddress} disabled={savingAddress} className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
                {savingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          )}

          <button
            onClick={() => setStep("summary")}
            disabled={!selectedAddress}
            className="w-full mt-6 bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-full disabled:opacity-50"
          >
            Continue to Order Summary
          </button>
        </div>
      )}

      {step === "summary" && cart && (
        <div className="bg-white rounded-xl2 shadow-card p-6">
          <h2 className="font-semibold text-lg text-ink-900 mb-4">Order Summary</h2>
          <div className="space-y-2 divide-y">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className="text-ink-800">{item.name} × {item.quantity}</span>
                <span className="font-medium">₹{item.subtotal.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.subtotal.toLocaleString("en-IN")}</span></div>
            {cart.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−₹{cart.discount}</span></div>}
            <div className="flex justify-between"><span>Delivery</span><span>{cart.delivery_fee === 0 ? "FREE" : `₹${cart.delivery_fee}`}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>₹{cart.total.toLocaleString("en-IN")}</span></div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("address")} className="border border-gray-300 px-5 py-3 rounded-full font-semibold text-sm">Back</button>
            <button onClick={() => setStep("payment")} className="flex-1 bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-full">Continue to Payment</button>
          </div>
        </div>
      )}

      {step === "payment" && cart && (
        <div className="bg-white rounded-xl2 shadow-card p-6">
          <h2 className="font-semibold text-lg text-ink-900 mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label className={`block border rounded-xl p-4 cursor-pointer ${paymentMethod === "COD" ? "border-whisper-600 bg-whisper-50" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                <div>
                  <p className="font-semibold text-sm">Cash on Delivery</p>
                  <p className="text-xs text-ink-500">Pay when your order arrives</p>
                </div>
              </div>
            </label>
            <label className={`block border rounded-xl p-4 cursor-pointer ${paymentMethod === "ONLINE" ? "border-whisper-600 bg-whisper-50" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} />
                <div>
                  <p className="font-semibold text-sm">Pay Online</p>
                  <p className="text-xs text-ink-500">
                    {paymentConfig?.provider === "razorpay"
                      ? "Secure payment via Razorpay — cards, UPI, netbanking and wallets."
                      : "Test/mock payment gateway — no real transaction occurs until a real provider is configured."}
                  </p>
                </div>
              </div>
            </label>
          </div>

          {paymentError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3">
              {paymentError}
            </div>
          )}

          <div className="flex justify-between font-bold text-lg mt-6 border-t pt-4">
            <span>Total Payable</span><span>₹{cart.total.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("summary")} className="border border-gray-300 px-5 py-3 rounded-full font-semibold text-sm">Back</button>
            <button onClick={placeOrder} disabled={placing} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full disabled:opacity-50">
              {placing ? "Placing order..." : paymentMethod === "ONLINE" ? "Proceed to Pay" : "Place Order"}
            </button>
          </div>
        </div>
      )}

      {step === "confirmation" && confirmedOrder && (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h2 className="text-xl font-display font-bold text-ink-900 mb-1">Order Confirmed!</h2>
          <p className="text-sm text-ink-600 mb-4">Order #{confirmedOrder.order_number} has been placed successfully.</p>
          <p className="text-lg font-bold mb-6">Total: ₹{confirmedOrder.total.toLocaleString("en-IN")}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/account/orders" className="bg-whisper-700 text-white px-5 py-2.5 rounded-full font-semibold text-sm">View Orders</Link>
            <Link href="/search" className="border border-gray-300 px-5 py-2.5 rounded-full font-semibold text-sm">Continue Shopping</Link>
          </div>
        </div>
      )}
    </div>
  );
}
