import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink-950 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="text-white font-display font-bold mb-3">WhisperMart</h4>
          <p className="text-gray-400">A premium marketplace built for sellers and shoppers who value trust, speed, and simplicity.</p>
        </div>
        <div>
          <h5 className="text-white font-semibold mb-3">Shop</h5>
          <ul className="space-y-2">
            <li><Link href="/search" className="hover:text-white">All Categories</Link></li>
            <li><Link href="/search?sort=newest" className="hover:text-white">New Arrivals</Link></li>
            <li><Link href="/search?min_discount=30" className="hover:text-white">Today's Deals</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-white font-semibold mb-3">Sell</h5>
          <ul className="space-y-2">
            <li><Link href="/seller/register" className="hover:text-white">Become a Seller</Link></li>
            <li><Link href="/seller" className="hover:text-white">Seller Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-white font-semibold mb-3">Support</h5>
          <ul className="space-y-2">
            <li><Link href="/account/orders" className="hover:text-white">Track Order</Link></li>
            <li><Link href="/account" className="hover:text-white">My Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Whisper Mart. All rights reserved. This is a demo marketplace platform.
      </div>
    </footer>
  );
}
