"use client";
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { api, getToken } from "@/lib/api";
import type { CartSummary } from "@/types";

interface CartContextValue {
  cart: CartSummary | null;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<CartSummary>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!getToken()) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const summary = await api.get<CartSummary>("/api/cart");
      setCart(summary);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = async (productId: string, quantity = 1) => {
    const summary = await api.post<CartSummary>("/api/cart/items", { product_id: productId, quantity });
    setCart(summary);
  };

  const updateItem = async (itemId: string, quantity: number) => {
    const summary = await api.put<CartSummary>(`/api/cart/items/${itemId}`, { quantity });
    setCart(summary);
  };

  const removeItem = async (itemId: string) => {
    const summary = await api.del<CartSummary>(`/api/cart/items/${itemId}`);
    setCart(summary);
  };

  const applyCoupon = async (code: string) => {
    const summary = await api.post<CartSummary>("/api/cart/validate-coupon", { code });
    setCart(summary);
    return summary;
  };

  return (
    <CartContext.Provider value={{ cart, loading, refreshCart, addToCart, updateItem, removeItem, applyCoupon }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
