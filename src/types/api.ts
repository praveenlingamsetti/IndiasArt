export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string | null;
  errorCode?: null;
};

export type ApiError = {
  success: false;
  data?: null;
  message: string;
  errorCode?: string | null;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  profileImage: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type ProductListItem = {
  id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  hasVariants: boolean;
};

export type ProductListingData = {
  products: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  variants?: Array<{
    id: string;
    name: string;
    price: number | string;
    stock: number;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    imageUrls?: string[];
    createdAt: string;
    customer?: {
      name: string;
      profileImage?: string | null;
    };
  }>;
  images: Array<{
    id: string;
    imageUrl: string;
  }>;
  avgRating: number;
  vendor?: {
    id: string;
    storeName: string;
    storeSlug: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type CartItem = {
  id: string;
  productId?: string;
  variantId?: string | null;
  variantKey?: string;
  quantity: number;
  availableStock?: number;
  linePrice?: number;
  lineTotal?: number;
  variant?: {
    id: string;
    name: string;
    stock: number;
    price: number | string;
    sku?: string | null;
  } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    stock?: number;
    status?: string;
    imageUrl: string | null;
    vendorStoreName?: string;
  };
};

export type CartData = {
  cartId?: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

export type Address = {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  addressType: "HOME" | "WORK" | "OTHER";
  addressLabel: string | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    title: string;
    slug: string;
    images: Array<{ imageUrl: string }>;
  };
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: "ONLINE" | "COD";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type CheckoutEstimate = {
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  couponError?: string | null;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  codEnabled: boolean;
  codMaxOrderAmount: number;
  freeShippingApplied?: boolean;
  freeShippingThreshold?: number;
  gstPercent?: number;
};

export type CreateOrderPayload = {
  addressId: string;
  paymentMethod: "ONLINE" | "COD";
  cartItemId?: string;
  couponCode?: string;
};

export type PaymentCreateOrderResponse = {
  order_id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  orderNumber: string;
};

export type PaymentVerifyPayload = {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type OrderTracking = {
  orderNumber: string;
  status: string;
  courierName: string | null;
  trackingNumber: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  shipments: Array<{
    storeName: string;
    status: string;
    courierName: string | null;
    trackingNumber: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    liveTracking?: unknown;
  }>;
};
