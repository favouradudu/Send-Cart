export type ShopCategory = "Best Sellers" | "New Arrivals" | "Sale";

export type ShopProduct = {
  id: string;
  vendor_id?: string;
  name: string;
  category: ShopCategory | string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  variants: string[];
  image_url: string;
  visible: boolean;
};

export type StoreTheme = "editorial" | "modern" | "bold";

export type ShopPlan = "free" | "pro" | "power" | "unlimited";

export type ShopProfile = {
  id: string;
  vendor_code?: string;
  store_slug: string;
  store_name: string;
  bio: string;
  avatar_url: string;
  whatsapp_phone: string;
  instagram_handle: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  delivery_zones: Record<string, { fee: number }>;
  plan: ShopPlan;
  order_credits: number;
  store_theme?: StoreTheme;
};

export const DEMO_SLUG = "aura-threads";
export const DEMO_VENDOR_PHONE = "2348161323856";

export function getDeliveryFeeLabel(zoneName: string, fee: number): string {
  if (fee > 0) return formatNaira(fee);
  const lower = zoneName.toLowerCase();
  if (lower.includes("park") || lower.includes("waybill")) {
    return "₦0 (Pay driver at park upon collection)";
  }
  if (lower.includes("rider") || lower.includes("arrival") || lower.includes("doorstep") || lower.includes("dispatch")) {
    return "₦0 (Pay rider on arrival)";
  }
  if (lower.includes("whatsapp") || lower.includes("confirm") || lower.includes("dynamic") || lower.includes("courier")) {
    return "Fee calculated on WhatsApp (based on landmark)";
  }
  return "₦0 (Pay rider on arrival)";
}

export const DEMO_PROFILE: ShopProfile = {
  id: "demo-send-cart",
  vendor_code: "SC-VND-00101",
  store_slug: DEMO_SLUG,
  store_name: "send cart",
  bio: "Gadgets, luxury fragrances, apparel & sneakers — ordered direct on WhatsApp with zero middlemen.",
  avatar_url: "",
  whatsapp_phone: DEMO_VENDOR_PHONE,
  instagram_handle: "sendcart.ng",
  bank_name: "Access Bank · demo",
  bank_account: "0000000000",
  bank_account_name: "send cart (demo)",
  delivery_zones: {
    "Dispatch Rider (Pay rider directly on delivery)": { fee: 0 },
    "Motor Park Waybill (Pay driver at park upon collection)": { fee: 0 },
    "Interstate / Doorstep Courier (Fee confirmed on WhatsApp)": { fee: 0 },
    "Mainland Central (Ikeja, Yaba, Surulere)": { fee: 2500 },
    "Island Central (Ikoyi, VI, Lekki Phase 1)": { fee: 3500 },
  },
  plan: "free",
  order_credits: 0,
  store_theme: "editorial",
};

export const DEMO_PRODUCTS: ShopProduct[] = [
  {
    id: "sc-gadget-iphone15",
    name: "iPhone 15 Pro",
    category: "Best Sellers",
    description: "Titanium chassis, A17 Pro chip, Action button, and 48MP Pro camera. Factory unlocked with full warranty.",
    price: 450000,
    compare_at_price: 480000,
    stock: 3,
    variants: ["128GB", "256GB", "512GB"],
    image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80",
    visible: true,
  },
  {
    id: "sc-fragrance-vanilla",
    name: "Vanilla Amber Extrait",
    category: "New Arrivals",
    description: "Pure concentrated fragrance oil. Madagascar bourbon vanilla, warm golden amber, and soft white musk that lasts 48+ hours.",
    price: 18500,
    compare_at_price: null,
    stock: 12,
    variants: ["6ml", "12ml", "50ml"],
    image_url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=80",
    visible: true,
  },
  {
    id: "sc-fashion-linen",
    name: "Relaxed Linen Set",
    category: "Best Sellers",
    description: "Tailored two-piece in 100% breathable linen. Relaxed camp collar shirt with matching drawstring trousers.",
    price: 48500,
    compare_at_price: null,
    stock: 5,
    variants: ["S", "M", "L", "XL"],
    image_url: "/images/aura-emerald-set.jpg",
    visible: true,
  },
  {
    id: "sc-footwear-sneakers",
    name: "Retro Leather Lows",
    category: "Sale",
    description: "Vintage court sneaker crafted with premium full-grain leather, padded collar, and cushioned rubber cupsole.",
    price: 38000,
    compare_at_price: 45000,
    stock: 4,
    variants: ["41", "42", "43", "44"],
    image_url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
    visible: true,
  },
];

export const DEMO_ORDERS: Array<{
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_zone: string;
  delivery_address?: string;
  delivery_fee?: number;
  total: number;
  status: "pending_confirmation" | "paid" | "dispatched" | "delivered";
  created_at: string;
}> = [
  {
    id: "demo-ord-1",
    order_number: "SC-ORD-7C31A9D2",
    customer_name: "Amaka Eze",
    customer_phone: "+234 802 334 1120",
    delivery_zone: "Island Central (Ikoyi, VI, Lekki Phase 1)",
    delivery_address: "14 Adeola Odeku, Victoria Island, Lagos",
    delivery_fee: 3500,
    total: 80500,
    status: "pending_confirmation",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "demo-ord-2",
    order_number: "SC-ORD-4B86D108",
    customer_name: "Tunde Bakare",
    customer_phone: "+234 816 889 0041",
    delivery_zone: "Mainland Central (Ikeja, Yaba, Surulere)",
    delivery_address: "5 Toyin Street, Ikeja, Lagos",
    delivery_fee: 2500,
    total: 34500,
    status: "paid",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

export const formatNaira = (amount: number) =>
  `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;

export const monthlyOrderLimit = 30;
export const freeProductLimit = 8;
export const proProductLimit = 50;

export const creditPackPrice = 1000;      // ₦1,000 for +50 order credits
export const creditPackCount = 50;
export const proMonthlyPrice = 4500;       // ₦4,500/month for up to 50 products & unlimited orders
export const powerMonthlyPrice = 10000;    // ₦10,000/month for unlimited products & custom domain
export const unlimitedMonthlyPrice = 4500; // alias for backwards compatibility

export function isFreeOrderBlocked(monthOrderCount: number, credits: number): boolean {
  return monthOrderCount >= monthlyOrderLimit && credits <= 0;
}

export function buildWhatsAppOrderMessage(input: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryAddress?: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; variant: string }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}): string {
  const lines = input.items.map(
    (item) => `• ${item.name}${item.variant ? ` (${item.variant})` : ""} × ${item.quantity} — ${formatNaira(item.quantity * item.unitPrice)}`,
  );

  const isZeroFee = input.deliveryFee === 0;
  const deliveryFeeDisplay = getDeliveryFeeLabel(input.deliveryZone, input.deliveryFee);

  const totalDisplay = isZeroFee
    ? `${formatNaira(input.subtotal)} (+ delivery settled separately)`
    : formatNaira(input.total);

  return [
    `Hello ${DEMO_PROFILE.store_name}! I'd like to place an order.`,
    `Order: ${input.orderNumber}`,
    "",
    `Name: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
    `Delivery Option: ${input.deliveryZone}`,
    input.deliveryAddress ? `Address & Landmark: ${input.deliveryAddress}` : null,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${formatNaira(input.subtotal)}`,
    `Delivery: ${deliveryFeeDisplay}`,
    isZeroFee ? `Total to transfer for items: ${formatNaira(input.subtotal)}` : `Total: ${totalDisplay}`,
    "",
    "Bank transfer details:",
    `${input.bankName} · ${input.bankAccount}`,
    input.bankAccountName,
    "",
    "📸 Please reply to this message with your payment screenshot/receipt to confirm dispatch.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
