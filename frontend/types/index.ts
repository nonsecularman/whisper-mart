export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type SellerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type ProductStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "OUT_OF_STOCK";
export type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED";
export type PaymentMethod = "COD" | "ONLINE";
export type DiscountType = "PERCENTAGE" | "FIXED";
export type AddressType = "HOME" | "WORK" | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: string;
  is_active: boolean;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number;
  discount_percent: number;
  rating_avg: number;
  rating_count: number;
  stock: number;
  status: ProductStatus;
  image?: string;
  brand?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  price: number;
  original_price: number;
  discount_percent: number;
  stock: number;
  sku: string;
  tags?: string;
  status: ProductStatus;
  rejection_reason?: string;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  created_at: string;
  category: Category;
  seller: { id: string; store_name: string };
  images: ProductImage[];
  specifications: { key: string; value: string }[];
}

export interface PaginatedProducts {
  items: ProductCard[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  original_price: number;
  quantity: number;
  stock: number;
  subtotal: number;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  coupon_code?: string;
  item_count: number;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  original_price: number;
  discount_percent: number;
  stock: number;
  rating_avg: number;
}

export interface Address {
  id: string;
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: AddressType;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name_snapshot: string;
  product_image_snapshot?: string;
  price: number;
  quantity: number;
  item_status: OrderStatus;
  seller_id: string;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  coupon_code?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  shipping_address_snapshot: any;
  created_at: string;
  items: OrderItem[];
  status_history: OrderStatusHistoryEntry[];
}

export interface CheckoutResponse {
  order: Order;
  payment_required: boolean;
  payment_provider?: string;
  provider_order_id?: string;
  provider_key_id?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentConfig {
  provider: "mock" | "razorpay";
  key_id: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment?: string;
  images?: string;
  created_at: string;
}

export interface Seller {
  id: string;
  user_id: string;
  store_name: string;
  owner_name: string;
  email: string;
  phone: string;
  description?: string;
  logo_url?: string;
  address?: string;
  status: SellerStatus;
  commission_rate: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  start_date: string;
  expiry_date: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
}
