import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Whisper Mart — Shop Everything, Trust Everyone",
    template: "%s | Whisper Mart",
  },
  description:
    "Whisper Mart is a premium multi-vendor marketplace for electronics, fashion, home, beauty, and more.",
  openGraph: {
    title: "Whisper Mart",
    description: "A premium multi-vendor marketplace.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen flex flex-col bg-[#f7f5fb]">
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
