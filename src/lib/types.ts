

export interface Category {
  id: string;
  name: string;
  is_visible: boolean; // Added for category visibility
  parent_id?: string | null; // For subcategories
  subcategories?: Category[]; // For UI tree structure
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string; // Name of the user who wrote the review
  rating: number; // 1-5
  comment?: string;
  created_at: string; // ISO string
  updated_at: string;
}

export interface Vendor {
    id: string; // vendor profile id
    user_id: string; // the auth.users id
    store_name: string;
    contact_number?: string | null;
    description?: string | null;
    is_verified: boolean;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined data from user_profiles for convenience
    user?: {
      email: string;
      name: string;
    } | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Price in GH₵
  images: string[]; // URLs to images or data URIs with hints
  categoryId: string | null; // Corresponds to category_id in Supabase, can be null
  vendor_id?: string | null; // Foreign key for the vendor
  stock: number;
  average_rating?: number;
  review_count?: number;
  is_boosted?: boolean;
  boosted_until?: string | null;
  boost_status?: 'none' | 'requested' | 'active' | 'expired';
  categories?: Category | null; // For joined category data
  vendors?: Vendor | null; // For joined vendor data
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod =
  | 'MTN MoMo'
  | 'Vodafone Cash'
  | 'Telecel Cash'
  | 'Cash on Delivery'
  | 'Paystack';

// OrderStatus remains the same
export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Payment Failed';

// Represents an item within an order, including product details at the time of purchase
export interface OrderProductItem {
  id: string; // product_id
  name: string; // product_name (denormalized)
  description?: string; // from products table
  price: number; // price_at_purchase
  images: string[]; // from products table (or denormalized product_image)
  categoryId?: string; // from products table
  quantity: number;
}


export interface Order {
  id: string;
  userId: string; // Corresponds to user_id in Supabase
  items: OrderProductItem[];
  totalAmount: number;
  status: OrderStatus;
  orderDate: string; // ISO string
  shippingAddress: Address; // JSONB in DB, Address object here
  paymentMethod: PaymentMethod;
  transactionId?: string; // For mobile money or Paystack reference
  user_profiles?: {
    email?: string;
    name?: string;
    phone?: string;
  } | null;
  order_items?: Array<{
    product_id: string;
    quantity: number;
    price_at_purchase: number;
    product_name?: string;
    product_image?: string;
    products?: {
      id: string;
      name: string;
      description?: string;
      price: number;
      images: string[];
      category_id?: string;
      stock?: number;
    } | null;
  }>;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
}

export type UserRole = 'customer' | 'admin' | 'vendor';

export interface User {
  id: string; // Supabase auth user ID
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  address?: Address;
}

export interface AdminOrderSummary extends Omit<Order, 'items' | 'order_items' | 'userId' | 'shippingAddress'> {
  user_id: string;
  customer_email?: string;
  customer_name?: string;
  item_count: number;
}

export interface Advertisement {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video';
  link_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BlogPost {
  id: string;
  created_at?: string;
  updated_at?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  author?: string | null;
  image_url?: string | null;
  is_published: boolean;
}

export interface BoostRequest {
  id: number;
  product_id: string;
  vendor_id: string;
  user_id: string;
  plan_duration_days: number;
  plan_price: number;
  request_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  // For joined data to display in admin panel
  products?: { name: string, images: string[] } | null;
  vendors?: { store_name: string } | null;
}

export interface BoostPlan {
  id: number;
  name: string;
  description?: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}
