export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://whisper-selling.xyz";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/account", "/seller", "/admin", "/checkout"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
