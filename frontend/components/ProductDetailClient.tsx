"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { StarRating, Price, ProductGridSkeleton } from "@/components/UI";
import ProductCard from "@/components/ProductCard";
import type { ProductDetail, ProductCard as ProductCardType, Review } from "@/types";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState<ProductCardType[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [ratingSummary, setRatingSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // Reviews form
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    api
      .get<ProductDetail>(`/api/products/${slug}`)
      .then((p) => {
        setProduct(p);
        api.get<ProductCardType[]>(`/api/products/${p.id}/related`).then(setRelated).catch(() => setRelated([]));

        // Recently viewed (localStorage)
        try {
          const raw = localStorage.getItem("recently_viewed");
          const list: string[] = raw ? JSON.parse(raw) : [];
          const updated = [p.slug, ...list.filter((s) => s !== p.slug)].slice(0, 10);
          localStorage.setItem("recently_viewed", JSON.stringify(updated));
        } catch {}
      })
      .catch(() => setNotFound(true));

    api.get<Review[]>(`/api/reviews/product/${slug}`).catch(() => []); // placeholder, replaced below once product id known
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    api.get<Review[]>(`/api/reviews/product/${product.id}`).then(setReviews).catch(() => setReviews([]));
    api.get(`/api/reviews/product/${product.id}/summary`).then(setRatingSummary).catch(() => {});
  }, [product]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink-900 mb-2">Product unavailable</h1>
        <p className="text-ink-600 mb-6">This product may have been removed or is no longer available.</p>
        <button onClick={() => router.push("/search")} className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">
          Continue shopping
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        <div className="skeleton aspect-square rounded-xl2" />
        <div className="space-y-4">
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-10 w-1/3 rounded" />
          <div className="skeleton h-24 w-full rounded" />
        </div>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  async function handleAddToCart() {
    if (!user) {
      showToast("Please login to add items to your cart", "error");
      router.push("/auth/login");
      return;
    }
    setBusy(true);
    try {
      await addToCart(product!.id, qty);
      showToast("Added to cart", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not add to cart", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleBuyNow() {
    if (!user) {
      showToast("Please login to continue", "error");
      router.push("/auth/login");
      return;
    }
    setBusy(true);
    try {
      await addToCart(product!.id, qty);
      router.push("/checkout");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not proceed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist() {
    if (!user) {
      showToast("Please login to use wishlist", "error");
      return;
    }
    try {
      await api.post(`/api/wishlist/${product!.id}`);
      showToast("Added to wishlist", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update wishlist", "error");
    }
  }

  async function submitReview() {
    setReviewSubmitting(true);
    try {
      await api.post("/api/reviews", { product_id: product!.id, rating: myRating, comment: myComment });
      showToast("Review submitted", "success");
      setMyComment("");
      const rs = await api.get<Review[]>(`/api/reviews/product/${product!.id}`);
      setReviews(rs);
      const summary = await api.get(`/api/reviews/product/${product!.id}/summary`);
      setRatingSummary(summary);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not submit review", "error");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <nav className="text-xs text-ink-600 mb-4 flex gap-1 flex-wrap">
        <span>{product.category.name}</span> <span>/</span> <span className="text-ink-900">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square bg-white rounded-xl2 shadow-card overflow-hidden">
            {product.images.length > 0 ? (
              <Image src={product.images[activeImage]?.url || product.images[0].url} alt={product.name} fill className="object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-500">No image available</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 ${activeImage === i ? "border-whisper-700" : "border-transparent"}`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <p className="text-sm text-whisper-700 font-semibold mb-1">{product.brand}</p>}
          <h1 className="text-2xl font-display font-bold text-ink-900 mb-2">{product.name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <StarRating value={product.rating_avg} />
            <span className="text-sm text-ink-600">
              {product.rating_avg.toFixed(1)} ({product.rating_count} reviews) · {product.sold_count} sold
            </span>
          </div>

          <Price price={product.price} originalPrice={product.original_price} />

          <p className="text-sm mt-3">
            {outOfStock ? (
              <span className="text-rose-600 font-semibold">Out of stock</span>
            ) : product.stock <= 5 ? (
              <span className="text-amber-600 font-semibold">Only {product.stock} left in stock — order soon</span>
            ) : (
              <span className="text-emerald-600 font-semibold">In stock</span>
            )}
          </p>

          {product.description && <p className="text-sm text-ink-700 mt-4 leading-relaxed">{product.description}</p>}

          {!outOfStock && (
            <div className="flex items-center gap-3 mt-5">
              <div className="flex items-center border rounded-full overflow-hidden">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 text-lg">−</button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="w-9 h-9 text-lg">+</button>
              </div>
              <span className="text-xs text-ink-600">Max {product.stock} per order</span>
            </div>
          )}

          <div className="flex gap-3 mt-5 flex-wrap">
            <button
              onClick={handleAddToCart}
              disabled={busy || outOfStock}
              className="flex-1 min-w-[140px] bg-whisper-700 hover:bg-whisper-800 text-white font-semibold py-3 rounded-full transition-colors disabled:opacity-50"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={busy || outOfStock}
              className="flex-1 min-w-[140px] bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-full transition-colors disabled:opacity-50"
            >
              Buy Now
            </button>
            <button onClick={handleWishlist} className="border border-whisper-300 text-whisper-700 font-semibold px-5 rounded-full">
              ♡ Wishlist
            </button>
          </div>

          <div className="mt-6 bg-white rounded-xl2 shadow-card p-4 text-sm space-y-2">
            <p className="font-semibold text-ink-900">Seller: {product.seller.store_name}</p>
            <p className="text-ink-600">Delivery in 3–7 business days. Free delivery on orders above ₹499.</p>
            <p className="text-ink-600">7-day return policy on eligible items.</p>
          </div>

          {product.specifications.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-ink-900 mb-2">Specifications</h3>
              <table className="w-full text-sm">
                <tbody>
                  {product.specifications.map((s: any, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-ink-600 w-1/3">{s.key}</td>
                      <td className="py-2 text-ink-900">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="text-xl font-display font-bold text-ink-900 mb-4">Customer Reviews</h2>

        {ratingSummary && ratingSummary.count > 0 && (
          <div className="flex items-center gap-6 bg-white rounded-xl2 shadow-card p-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-ink-900">{ratingSummary.average}</p>
              <StarRating value={ratingSummary.average} />
              <p className="text-xs text-ink-600 mt-1">{ratingSummary.count} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingSummary.distribution[String(star)] || 0;
                const pct = ratingSummary.count ? (count / ratingSummary.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-8">{star}★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-ink-600">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {user && user.role === "CUSTOMER" && (
          <div className="bg-white rounded-xl2 shadow-card p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2">Write a review</h3>
            <p className="text-xs text-ink-500 mb-2">Only customers who purchased and received this product can review it.</p>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setMyRating(n)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={n <= myRating ? "#f5a623" : "#e5e0ee"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Share your experience with this product..."
              className="w-full border rounded-lg p-2 text-sm mb-2"
              rows={3}
            />
            <button
              onClick={submitReview}
              disabled={reviewSubmitting}
              className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
            >
              {reviewSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        )}

        {reviews === null && <p className="text-sm text-ink-500">Loading reviews...</p>}
        {reviews && reviews.length === 0 && <p className="text-sm text-ink-500">No reviews yet. Be the first to review this product.</p>}
        <div className="space-y-4">
          {reviews?.map((r) => (
            <div key={r.id} className="bg-white rounded-xl2 shadow-card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-ink-900">{r.user_name}</p>
                <StarRating value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-ink-700">{r.comment}</p>}
              <p className="text-xs text-ink-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mt-12">
        <h2 className="text-xl font-display font-bold text-ink-900 mb-4">Related Products</h2>
        {related === null ? <ProductGridSkeleton count={5} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
