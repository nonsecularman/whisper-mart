import { API_URL } from "@/lib/api";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://whisper-selling.xyz";
  const staticRoutes = ["", "/search", "/cart", "/wishlist", "/auth/login", "/auth/register", "/seller/register"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  let productRoutes: { url: string; lastModified: Date }[] = [];
  try {
    const res = await fetch(`${API_URL}/api/products?page_size=100`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      productRoutes = (data.items || []).map((p: any) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: new Date(),
      }));
    }
  } catch {
    // If the API is unreachable at build time, ship static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
