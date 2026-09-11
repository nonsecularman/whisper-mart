"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { EmptyState, Spinner } from "@/components/UI";

export default function CartPage() {
  const { cart, loading, updateItem, removeItem, applyCoupon } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);

  if (!user) {
    return (
      <EmptyState
        title="Login to view your cart"
        subtitle="Your cart items are saved to your account."
        action={
          <Link href="/auth/login" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">
            Login
          </Link>
        }
      />
    );
  }

  if (loading && !cart) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex justify-center text-whisper-700">
        <Spinner size={32} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        subtitle="Looks like you haven't added anything yet."
        action={
          <Link href="/search" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">
            Start Shopping
          </Link>
        }
      />
    );
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(couponInput.trim());
      showToast("Coupon applied", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Invalid coupon", "error");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-ink-900 mb-2">My Cart ({cart.item_count} items)</h1>
        {cart.items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl2 shadow-card p-4 flex gap-4">
            <div className="relative w-20 h-20 shrink-0 bg-whisper-50 rounded-lg overflow-hidden">
              {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/product/${item.slug}`} className="font-medium text-sm text-ink-900 line-clamp-2 hover:underline">
                {item.name}
              </Link>
              <p className="text-sm font-bold text-ink-900 mt-1">₹{item.price.toLocaleString("en-IN")}</p>
              {item.stock < item.quantity && <p className="text-xs text-rose-600 mt-1">Only {item.stock} left in stock</p>}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border rounded-full overflow-hidden">
                  <button
                    onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 text-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateItem(item.id, Math.min(item.stock, item.quantity + 1))}
                    className="w-7 h-7 text-sm"
                  >
                    +
                  </button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-xs text-rose-600 font-medium">
                  Remove
                </button>
              </div>
            </div>
            <div className="text-sm font-semibold text-ink-900 shrink-0">₹{item.subtotal.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl2 shadow-card p-4 h-fit sticky top-20">
        <h2 className="font-semibold text-ink-900 mb-3">Order Summary</h2>

        <div className="flex gap-2 mb-4">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
          />
          <button onClick={handleApplyCoupon} disabled={applying} className="text-sm font-semibold text-whisper-700 px-3 border border-whisper-300 rounded-lg">
            {applying ? "..." : "Apply"}
          </button>
        </div>
        {cart.coupon_code && <p className="text-xs text-emerald-600 mb-3">Coupon "{cart.coupon_code}" applied</p>}

        <div className="space-y-2 text-sm border-t pt-3">
          <div className="flex justify-between"><span className="text-ink-600">Subtotal</span><span>₹{cart.subtotal.toLocaleString("en-IN")}</span></div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−₹{cart.discount.toLocaleString("en-IN")}</span></div>
          )}
          <div className="flex justify-between"><span className="text-ink-600">Delivery Fee</span><span>{cart.delivery_fee === 0 ? "FREE" : `₹${cart.delivery_fee}`}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>₹{cart.total.toLocaleString("en-IN")}</span></div>
        </div>

        <button
          onClick={() => router.push("/checkout")}
          className="w-full mt-4 bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-full transition-colors"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
