import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Instagram,
  LogOut,
  Minus,
  Package,
  Palette,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  creditPackPrice,
  formatNaira,
  freeProductLimit,
  monthlyOrderLimit,
  powerMonthlyPrice,
  proMonthlyPrice,
  proProductLimit,
  type ShopProduct,
  type ShopProfile,
} from "@/lib/shop";

type OrderStatus = "pending_confirmation" | "paid" | "dispatched" | "delivered";
type OrderRecord = Omit<(typeof DEMO_ORDERS)[number], "status"> & { id: string; status: OrderStatus };
type VendorAuthMode = "signin" | "signup";
type DashboardTab = "overview" | "products" | "orders" | "settings";

const statusLabels: Record<OrderStatus, string> = {
  pending_confirmation: "Pending confirmation",
  paid: "Payment confirmed",
  dispatched: "On the way",
  delivered: "Delivered",
};

const SENDCART_BILLING = {
  bankName: "Ecobank Nigeria",
  accountNumber: "3830083606",
  accountName: "FAVOUR ISIOMA JOHN ADUDU",
  supportWhatsApp: "2347014020231",
};

export function VendorDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<VendorAuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [settings, setSettings] = useState<ShopProfile | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [dispatchOrderModal, setDispatchOrderModal] = useState<OrderRecord | null>(null);
  const [dispatchRiderPhone, setDispatchRiderPhone] = useState("");
  const [dispatchWaybillNote, setDispatchWaybillNote] = useState("");
  const [billingCopied, setBillingCopied] = useState(false);

  const copyBillingAccount = async () => {
    try {
      await navigator.clipboard.writeText(SENDCART_BILLING.accountNumber);
      setBillingCopied(true);
      setTimeout(() => setBillingCopied(false), 2000);
      toast.success("Ecobank account number copied!");
    } catch {
      toast.error("Couldn’t copy — please copy 3830083606 manually.");
    }
  };
  
  const [draftProduct, setDraftProduct] = useState({
    name: "",
    category: "New Arrivals",
    description: "",
    price: "",
    compare_at_price: "",
    stock: "",
    variants: "",
    image_url: "",
    visible: true,
  });
  const [productFilter, setProductFilter] = useState<"all" | "active" | "archived">("all");
  const [newZone, setNewZone] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<"credits" | "pro" | "power" | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderItems, setOrderItems] = useState<
    Array<{ id: string; product_name: string; quantity: number; unit_price: number; variant: string }>
  >([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const openOrderDetails = async (order: OrderRecord) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("order_items")
      .select("id, product_name, quantity, unit_price, variant")
      .eq("order_id", order.id);
    if (error) {
      toast.error("Couldn't load items for this order.");
      setOrderItems([]);
    } else {
      setOrderItems(data ?? []);
    }
    setLoadingItems(false);
  };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo is too large. Please select a photo under 5MB.");
      return;
    }

    if (!userId) {
      toast.error("Please sign in to upload photos.");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("store-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("store-media").getPublicUrl(filePath);
      setDraftProduct((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Photo uploaded successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(`Could not upload photo: ${message}`);
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleUpgradeConfirm = async () => {
    if (!userId || !profile || !upgradeTier) return;
    setUpgradeBusy(true);
    try {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const txnReference = `SC-TXN-${yearMonth}-${randomSuffix}`;
      const amount =
        upgradeTier === "credits"
          ? creditPackPrice
          : upgradeTier === "pro"
            ? proMonthlyPrice
            : powerMonthlyPrice;

      const planType =
        upgradeTier === "credits"
          ? "booster_50"
          : upgradeTier === "pro"
            ? "pro_monthly"
            : "power_monthly";

      const planName =
        upgradeTier === "credits"
          ? "Booster Pack (+50 Order Credits)"
          : upgradeTier === "pro"
            ? "Pro Merchant (Up to 50 Products · Unlimited Orders)"
            : "Power Store (Unlimited Products · Custom Domain)";
      
      // 1. Log a PENDING record in platform_transactions (no instant entitlement)
      const { error: txnError } = await supabase.from("platform_transactions" as any).insert({
        vendor_id: userId,
        reference: txnReference,
        amount,
        currency: "NGN",
        plan_type: planType,
        payment_channel: "direct_bank_transfer",
        status: "pending",
        notes: `Pending bank verification for ${planName}`,
      });

      if (txnError) throw txnError;

      // 2. Pre-fill WhatsApp message to SendCart Support with reference & store details
      const whatsappMsg = [
        `Hello SendCart Admin! I just initiated a shop upgrade payment:`,
        ``,
        `🏪 Store: ${profile.store_name} (${profile.store_slug || "vendor"})`,
        `📦 Plan: ${planName}`,
        `💰 Amount: ${formatNaira(amount)}`,
        `🔖 Reference: ${txnReference}`,
        ``,
        `💳 Transferred to: ${SENDCART_BILLING.bankName}`,
        `Account: ${SENDCART_BILLING.accountNumber} (${SENDCART_BILLING.accountName})`,
        ``,
        `📸 Attached is my payment transfer receipt/screenshot. Kindly verify and activate my plan. Thank you!`,
      ].join("\n");

      // 3. Open WhatsApp to SendCart Admin
      window.open(
        `https://wa.me/${SENDCART_BILLING.supportWhatsApp}?text=${encodeURIComponent(whatsappMsg)}`,
        "_blank"
      );

      toast.success(`Upgrade request logged (${txnReference}). Send your receipt on WhatsApp to activate!`);
      setUpgradeTier(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upgrade request failed";
      toast.error(`Could not log upgrade: ${message}`);
    } finally {
      setUpgradeBusy(false);
    }
  };
  
    useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED")) return;
      setUserId(session?.user.id ?? null);
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userId) {
        setProfile(null);
        setProducts([]);
        setOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [profileResult, catalogResult, orderResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("products").select("*").eq("vendor_id", userId).order("created_at", { ascending: false }),
        supabase.from("orders").select("id, order_number, customer_name, customer_phone, delivery_zone, delivery_address, total, status, created_at").eq("vendor_id", userId).order("created_at", { ascending: false }).limit(200),
      ]);
      if (!active) return;
      if (catalogResult.error) toast.error("We couldn’t load your products.");
      if (orderResult.error) toast.error("We couldn’t load your orders.");

      let currentProfile: ShopProfile | null = (profileResult.data as unknown as ShopProfile) ?? null;

      // Auto-provision profile if authenticated user has no profile row yet
      if (!currentProfile) {
        const { data: authUserData } = await supabase.auth.getUser();
        const userEmail = authUserData.user?.email ?? "";
        const emailSlug = (userEmail.split("@")[0] ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "shop";
        const autoSlug = `${emailSlug}-${userId.slice(0, 6)}`;
        const storeName = emailSlug ? emailSlug.charAt(0).toUpperCase() + emailSlug.slice(1) + " Store" : "My Boutique";

        const newProfile = {
          id: userId,
          store_slug: autoSlug,
          store_name: storeName,
          bio: "Welcome! Browse our collection and order directly on WhatsApp.",
          avatar_url: "",
          whatsapp_phone: "",
          instagram_handle: "",
          bank_name: "Access Bank",
          bank_account: "",
          bank_account_name: "",
          delivery_zones: {
            "Lagos Mainland": { fee: 2500 },
            "Lagos Island": { fee: 3500 },
            "Outside Lagos": { fee: 6000 },
          },
          store_active: true,
          plan: "free" as const,
          order_credits: 0,
          store_theme: "editorial",
        };

        const { data: created, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile as any)
          .select()
          .maybeSingle();
        
        if (!createError && created) {
          currentProfile = created as unknown as ShopProfile;
          toast.success("Welcome! We set up your starter shop.");
        } else {
          // If insert failed due to network or duplicate, try one final fetch
          const { data: refetched } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
          if (refetched) {
            currentProfile = refetched as unknown as ShopProfile;
          } else {
            toast.error("Could not set up your profile automatically. Please refresh.");
          }
        }
      }

      if (currentProfile) {
        setProfile(currentProfile);
        setSettings(currentProfile);
      }

      setProducts((catalogResult.data ?? []) as unknown as ShopProduct[]);
      const orderRows = (orderResult.data ?? []) as unknown as OrderRecord[];
      setOrders(orderRows);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      setMonthCount(orderRows.filter((row) => new Date(row.created_at) >= startOfMonth).length);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);
      
  const visibleProducts = useMemo(() => products.filter((product) => product.visible), [products]);
  const activeProductsCount = useMemo(() => products.filter((p) => p.visible).length, [products]);
  const archivedProductsCount = useMemo(() => products.filter((p) => !p.visible).length, [products]);
  const productLimit = profile?.plan === "power" ? Infinity : profile?.plan === "pro" ? proProductLimit : freeProductLimit;

  const displayedProducts = useMemo(() => {
    if (productFilter === "active") return products.filter((p) => p.visible);
    if (productFilter === "archived") return products.filter((p) => !p.visible);
    return products;
  }, [products, productFilter]);
  const pendingOrders = orders.filter((order) => order.status === "pending_confirmation").length;
  const storeLink = typeof window === "undefined" || !profile ? "" : `${window.location.origin}/s/${profile.store_slug}`;

  const signIn = async () => {
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account before signing in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
        toast.success("Welcome back to your shop.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t sign you in.");
    } finally {
      setAuthBusy(false);
    }
  };

  const socialSignIn = async (provider: "google") => {
    setAuthBusy(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t sign you in.");
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
    setProducts([]);
    setOrders([]);
    toast.success("You’re signed out.");
  };

  const resetProductForm = () => {
    setDraftProduct({
      name: "",
      category: "New Arrivals",
      description: "",
      price: "",
      compare_at_price: "",
      stock: "",
      variants: "",
      image_url: "",
      visible: true,
    });
    setEditingProductId(null);
  };

  const editProduct = (product: ShopProduct) => {
    setDraftProduct({
      name: product.name,
      category: product.category,
      description: product.description,
      price: String(product.price),
      compare_at_price: product.compare_at_price ? String(product.compare_at_price) : "",
      stock: String(product.stock),
      variants: (product.variants ?? []).filter(Boolean).join(", "),
      image_url: product.image_url,
      visible: product.visible,
    });
    setEditingProductId(product.id);
    document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  
  const saveProduct = async () => {
    if (!userId || !draftProduct.name.trim() || !draftProduct.price || !draftProduct.stock || !draftProduct.image_url.trim()) {
      toast.error("Add a name, photo link, price and stock quantity first.");
      return;
    }

    // Auto-save to Backroom/Archive if active slots are full
    let finalVisibility = draftProduct.visible;
    const currentIsVisible = editingProductId ? products.find((p) => p.id === editingProductId)?.visible : false;
    const isClaimingSlot = finalVisibility && (!editingProductId || !currentIsVisible);

    if (isClaimingSlot && activeProductsCount >= productLimit) {
      finalVisibility = false;
      toast.info(`Active slots full (${productLimit}/${productLimit}). Saved to Backroom / Archive!`);
    }

    const price = Number(draftProduct.price);
    const stock = Number(draftProduct.stock);
    const compareAt = Number(draftProduct.compare_at_price);
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 || (draftProduct.compare_at_price && (!Number.isSafeInteger(compareAt) || compareAt < price))) {
      toast.error("Check the price and stock values. Sale price must be lower than the original.");
      return;
    }
    const values = {
      vendor_id: userId,
      name: draftProduct.name.trim(),
      category: draftProduct.category,
      description: draftProduct.description.trim(),
      price,
      compare_at_price: draftProduct.compare_at_price ? compareAt : null,
      stock,
      variants: draftProduct.variants.split(",").map((value) => value.trim()).filter(Boolean),
      image_url: draftProduct.image_url.trim(),
      visible: finalVisibility,
    };
    setBusy(true);
    const result = editingProductId
      ? await supabase.from("products").update(values).eq("id", editingProductId).eq("vendor_id", userId).select().single()
      : await supabase.from("products").insert(values).select().single();
    setBusy(false);
    if (result.error) {
      toast.error("We couldn’t save this product. Please check the details and try again.");
      return;
    }
    const saved = result.data as unknown as ShopProduct;
    setProducts((current) => editingProductId ? current.map((product) => product.id === saved.id ? saved : product) : [saved, ...current]);
    toast.success(editingProductId ? "Product updated." : finalVisibility ? "Product live on storefront." : "Saved to Backroom / Archive.");
    resetProductForm();
  };

  const toggleProduct = async (product: ShopProduct) => {
    if (!userId) return;

    // Guard: Prevent unhiding when all slots are in use
    if (!product.visible && activeProductsCount >= productLimit) {
      toast.error(`All ${productLimit} active display slots are in use. Archive an active piece or upgrade to Pro!`);
      setUpgradeTier("pro");
      return;
    }

    const { error } = await supabase.from("products").update({ visible: !product.visible }).eq("id", product.id).eq("vendor_id", userId);
    if (error) {
      toast.error("We couldn’t update this product.");
      return;
    }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, visible: !item.visible } : item));
    toast.success(product.visible ? "Moved to Backroom / Archived." : "Product is now live on your shop floor!");
  };
  
  const deleteProduct = async (product: ShopProduct) => {
    if (!userId || !window.confirm(`Remove ${product.name} from your catalog?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id).eq("vendor_id", userId);
    if (error) {
      toast.error("We couldn’t remove this product.");
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    toast.success("Product removed.");
  };

  const updateProductStock = async (product: ShopProduct, deltaOrSet: number | { set: number }) => {
    if (!userId) return;
    const currentStock = Number(product.stock) || 0;
    const newStock =
      typeof deltaOrSet === "number"
        ? Math.max(0, currentStock + deltaOrSet)
        : Math.max(0, deltaOrSet.set);

    if (newStock === currentStock && typeof deltaOrSet === "number") return;

    // 1. Optimistic UI update for instant feedback
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, stock: newStock } : item))
    );

    // 2. Persist to database
    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", product.id)
      .eq("vendor_id", userId);

    if (error) {
      // Revert on error
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, stock: currentStock } : item))
      );
      toast.error("Couldn't update stock. Please try again.");
      return;
    }

    if (newStock === 0) {
      toast.info(`${product.name} marked as Sold Out`);
    } else {
      toast.success(`${product.name} stock set to ${newStock}`);
    }
  };

  const saveSettings = async () => {
    if (!settings || !userId) return;
    if (!settings.store_name.trim() || !settings.whatsapp_phone.trim() || !/^\d{10}$/.test(settings.bank_account.replace(/\D/g, ""))) {
      toast.error("Add your shop name, WhatsApp number and a 10-digit account number.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        store_name: settings.store_name.trim(),
        bio: settings.bio.trim(),
        avatar_url: settings.avatar_url.trim(),
        whatsapp_phone: settings.whatsapp_phone.trim(),
        instagram_handle: settings.instagram_handle.replace(/^@/, "").trim(),
        bank_name: settings.bank_name.trim(),
        bank_account: settings.bank_account.replace(/\D/g, ""),
        bank_account_name: settings.bank_account_name.trim(),
        delivery_zones: settings.delivery_zones,
        store_theme: settings.store_theme || "editorial",
      } as any)
      .eq("id", userId);
    if (error) {
      toast.error("We couldn’t save your shop settings.");
      return;
    }
    setProfile(settings);
    toast.success("Your shop details are saved.");
  };

  const copyStoreLink = async () => {
    if (!storeLink) return;
    try {
      await navigator.clipboard.writeText(storeLink);
      toast.success("Your shop link is copied and ready to share.");
    } catch {
      toast.error("Couldn’t copy your link just now.");
    }
  };

  const handleStatusChangeRequest = (order: OrderRecord, status: OrderStatus) => {
    if (status === "dispatched") {
      setDispatchOrderModal(order);
      setDispatchRiderPhone("");
      setDispatchWaybillNote("");
      return;
    }
    void saveOrderStatus(order, status);
  };

    const saveOrderStatus = async (
    order: OrderRecord,
    status: OrderStatus,
    dispatchInfo?: { riderPhone?: string; waybillNote?: string }
  ) => {
    if (!userId) return;

    // Compile the dispatch note if vendor provided phone or waybill info
    let noteText: string | undefined = undefined;
    if (dispatchInfo) {
      const parts: string[] = [];
      if (dispatchInfo.riderPhone) parts.push(`Rider: ${dispatchInfo.riderPhone}`);
      if (dispatchInfo.waybillNote) parts.push(`Waybill / Note: ${dispatchInfo.waybillNote}`);
      if (parts.length > 0) noteText = parts.join(" · ");
    }

    const updatePayload: Record<string, any> = { status };
    if (noteText) {
      updatePayload.dispatch_note = noteText;
    }

    const { error } = await supabase
      .from("orders")
      .update(updatePayload as any)
      .eq("id", order.id)
      .eq("vendor_id", userId);

    if (error) {
      toast.error("We couldn’t update this order.");
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status, ...(noteText ? { dispatch_note: noteText } : {}) } : item))
    );
    toast.success(`Order ${order.order_number} marked ${statusLabels[status]?.toLowerCase() ?? status}.`);
      
    const phone = order.customer_phone.replace(/\D/g, "");
    if (phone.length >= 8) {
      let message = "";

      if (status === "dispatched") {
        const dest = order.delivery_address || order.delivery_zone;
        message =
          `Hello ${order.customer_name}, great news from ${profile?.store_name}!\n\n` +
          `Your order ${order.order_number} has been dispatched! 🛵📦\n\n` +
          `📍 Destination: ${dest}\n` +
          (dispatchInfo?.riderPhone ? `📞 Rider / Driver Phone: ${dispatchInfo.riderPhone}\n` : "") +
          (dispatchInfo?.waybillNote ? `📋 Waybill / Park Note: ${dispatchInfo.waybillNote}\n` : "") +
          `\nPlease keep your phone reachable. Thank you for shopping with us!`;
      } else if (status === "paid") {
        message =
          `Hello ${order.customer_name}, your payment for order ${order.order_number} has been confirmed by ${profile?.store_name}! 🎉\n\n` +
          `We are currently preparing and packing your package for dispatch.`;
      } else if (status === "delivered") {
        message =
          `Hello ${order.customer_name}, your order ${order.order_number} from ${profile?.store_name} has been marked as delivered! 📦✨\n\n` +
          `Thank you for trusting us! Please let us know if everything arrived safely.`;
      } else {
        message = `Hello ${order.customer_name}, update from ${profile?.store_name}: your order ${order.order_number} is now ${statusLabels[status]?.toLowerCase() ?? status}.`;
      }

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  };

  const addDeliveryZone = () => {
    if (!settings || !newZone.trim() || Object.hasOwn(settings.delivery_zones, newZone.trim()) || !Number.isSafeInteger(Number(newZoneFee)) || Number(newZoneFee) < 0) {
      toast.error("Give your new zone a unique name and a flat delivery rate.");
      return;
    }
    setSettings({ ...settings, delivery_zones: { ...settings.delivery_zones, [newZone.trim()]: { fee: Number(newZoneFee) } } });
    setNewZone("");
    setNewZoneFee("");
  };

  if (loading) return <main className="dashboard-loading"><span className="brand-wordmark">send<span>cart</span></span><p>Opening your little corner of the internet…</p></main>;

  if (!userId || !profile) {
    return (
      <main className="auth-page">
        <a href="/" className="auth-back-link"><ArrowRight className="back-arrow" /> Back to the shop</a>
        <div className="auth-card">
          <span className="auth-monogram">S</span>
          <p className="eyebrow">A little room of your own</p>
          <h1>{authMode === "signin" ? "Welcome back." : "Let’s open your shop."}</h1>
          <p className="auth-description">{authMode === "signin" ? "Sign in to manage your orders and products." : "Create your account. Your shop profile is made as soon as you join."}</p>
          <Button variant="outline" className="social-login-button" disabled={authBusy} onClick={() => void socialSignIn("google")}><GoogleMark /> Continue with Google</Button>
          <div className="form-divider"><span>or with your email</span></div>
          <label htmlFor="vendor-email">Email address</label><Input id="vendor-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="vendor-password">Password</label><Input id="vendor-password" type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void signIn(); }} />
          <Button className="auth-submit" disabled={authBusy || !email.trim() || password.length < 6} onClick={() => void signIn()}>{authBusy ? "One moment…" : authMode === "signin" ? "Sign in" : "Create my shop"} <ArrowRight /></Button>
          <p className="auth-switch">{authMode === "signin" ? "New around here?" : "Already have an account?"} <button onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>{authMode === "signin" ? "Open your shop" : "Sign in"}</button></p>
          <p className="auth-footnote">Your customers browse without an account. You keep every payment directly.</p>
        </div>
      </main>
    );
  }

  const matchesOrderSearch = (order: OrderRecord) => `${order.customer_name} ${order.order_number} ${order.customer_phone}`.toLowerCase().includes(orderSearch.toLowerCase());
  const filteredOrders = orders.filter((order) => (orderFilter === "all" || order.status === orderFilter) && matchesOrderSearch(order));
  const exportOrdersToCSV = () => {
    const listToExport = filteredOrders.length ? filteredOrders : orders;
    if (!listToExport.length) {
      toast.error("No orders to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Delivery Zone",
      "Delivery Address / Landmark",
      "Status",
      "Delivery Fee (NGN)",
      "Total (NGN)",
      "Dispatch / Waybill Note",
    ];

    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = listToExport.map((ord) => [
      escapeCSV(ord.order_number),
      escapeCSV(new Date(ord.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })),
      escapeCSV(ord.customer_name),
      // \t tab prefix ensures Excel preserves leading zeros in Nigerian numbers (e.g. 080...)
      escapeCSV(ord.customer_phone ? `\t${ord.customer_phone}` : ""),
      escapeCSV(ord.delivery_zone),
      escapeCSV(ord.delivery_address || ""),
      escapeCSV(statusLabels[ord.status] || ord.status),
      escapeCSV(ord.delivery_fee ?? 0),
      escapeCSV(ord.total),
      escapeCSV((ord as any).dispatch_note || ""),
    ]);

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens Nigerian special characters and formats cleanly
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `SendCart_Orders_${profile.store_slug || "export"}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${listToExport.length} ${listToExport.length === 1 ? "order" : "orders"} to CSV.`);
  };
  
  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <a className="brand-wordmark" href="/">send<span>cart</span></a>
        <span className="dashboard-store-label"><Store /> {profile.store_name}<span className="dashboard-status"><BadgeCheck /> Shop is open</span></span>
        <div className="dashboard-top-actions"><Button asChild variant="outline"><a href={storeLink} target="_blank" rel="noreferrer"><ExternalLink /> View my shop</a></Button><Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}><LogOut /></Button></div>
      </header>
      <section className="dashboard-welcome">
        <div>
          <div className="dashboard-merchant-tag">
            <span className="eyebrow"><span /> YOUR LITTLE CORNER OF THE INTERNET</span>
            {profile.vendor_code && (
              <span className="merchant-id-pill" title="Permanent SendCart Merchant ID">
                Merchant ID: <strong>{profile.vendor_code}</strong>
              </span>
            )}
          </div>
          <h1>Good morning, <em>{profile.store_name}.</em></h1>
          <p className="dashboard-welcome-note">Here’s what’s happening with your shop.</p>
        </div>
        <Button className="share-shop-button" onClick={() => void copyStoreLink()}><Copy /> Copy shop link <ArrowUpRight /></Button>
      </section>
      <div className="dashboard-tabs-wrap">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)}>
          <TabsList className="dashboard-tabs"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="orders">Orders {pendingOrders > 0 && <span className="tab-notification">{pendingOrders}</span>}</TabsTrigger><TabsTrigger value="settings">Shop settings</TabsTrigger></TabsList>
          <TabsContent value="overview" className="dashboard-tab-content">
            <div className="stats-grid"><article className="stat-block"><span>Orders this month</span><strong>{monthCount}<small> / {profile.plan === "unlimited" ? "∞" : monthlyOrderLimit}</small></strong><p>{profile.plan === "unlimited" ? "Unlimited orders" : `${Math.max(0, monthlyOrderLimit - monthCount)} orders left on your free plan`}</p></article><article className="stat-block"><span>On the rails</span><strong>{pendingOrders}</strong><p>Waiting for your confirmation</p></article><article className="stat-block"><span>On your shop floor</span><strong>{visibleProducts.length}</strong><p>Products customers can order</p></article></div>
            <div className="dashboard-overview-columns"><section className="dashboard-section orders-preview"><div className="dashboard-section-heading"><div><p className="eyebrow">The latest from your customers</p><h2>Recent orders</h2></div><Button variant="ghost" onClick={() => setActiveTab("orders")}>All orders <ArrowRight /></Button></div>{orders.slice(0, 3).length ? orders.slice(0, 3).map((order) => <OrderRow key={order.id} order={order} onOpen={() => setActiveTab("orders")} />) : <p className="empty-dashboard-note">Your first order will find its way here.</p>}</section><section className="dashboard-section share-preview"><p className="eyebrow">A shop of your own</p><h2>Share a little of<br />what you love.</h2><p>One lovely link for WhatsApp, your bio and everywhere you say hello.</p><div className="share-link-box"><span>{storeLink.replace(/^https?:\/\//, "") || "your-shop-link"}</span><Button size="icon" variant="ghost" aria-label="Copy shop link" onClick={() => void copyStoreLink()}><Copy /></Button></div><div className="share-qr"><QRCodeSVG value={storeLink || "https://example.com"} size={104} includeMargin bgColor="transparent" fgColor="currentColor" aria-label="Shop link QR code" /><span>Point your camera<br />to find our shop</span></div></section></div>
            <section className="plan-strip">
              <div className="plan-icon"><Sparkles /></div>
              <div>
                <p className="eyebrow">A little breathing room</p>
                <h2>Made for the way you sell.</h2>
                <p>Free for up to 8 products and 30 monthly orders. Choose the shelf space that matches your shop.</p>
              </div>
              <div className="plan-prices">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="plan-upgrade-btn"
                  onClick={() => setUpgradeTier("credits")}
                >
                  <strong>₦1,000</strong> · Booster (+50 credits)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="plan-upgrade-btn"
                  onClick={() => setUpgradeTier("pro")}
                >
                  <Sparkles /> <strong>₦4,500</strong> · Pro / mo (50 items)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="plan-upgrade-btn"
                  onClick={() => setUpgradeTier("power")}
                >
                  <strong>₦10,000</strong> · Power / mo (Unlimited)
                </Button>
              </div>
            </section>
          </TabsContent>
          <TabsContent value="products" className="dashboard-tab-content">
            <div className="dashboard-section-heading products-page-heading">
              <div>
                <p className="eyebrow">Your inventory & items</p>
                <h2>Your catalog <span>· {products.length}</span></h2>
              </div>
              <Button onClick={resetProductForm}><Plus /> Add product</Button>
            </div>

            {/* PASTE HERE: Shelf Slot Usage Banner */}
            <div className="shelf-status-banner">
              <div className="shelf-status-info">
                <span className="shelf-badge">
                  {profile?.plan === "power" ? "Power Store" : profile?.plan === "pro" ? "Pro Merchant" : "Free Starter"}
                </span>
                <strong>
                  {activeProductsCount} / {profile?.plan === "power" ? "∞" : productLimit} Active Slots in Use
                </strong>
                <span className="shelf-subtext">
                  · {archivedProductsCount} piece{archivedProductsCount === 1 ? "" : "s"} archived in backroom
                </span>
              </div>
              {(!profile?.plan || profile?.plan === "free") && (
                <Button size="sm" variant="outline" onClick={() => setUpgradeTier("pro")}>
                  <Sparkles /> Upgrade to 50 Slots (₦4,500)
                </Button>
              )}
            </div>
            <div className="product-editor" id="product-editor"><div className="product-editor-heading"><div><p className="eyebrow">{editingProductId ? "Update listing" : "New listing"}</p><h3>{editingProductId ? "Edit product" : "Add to your shop"}</h3></div>{editingProductId && <Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={resetProductForm}><X /></Button>}</div><div className="product-form-grid"><div className="form-span-two"><label htmlFor="product-name">Product name</label><Input id="product-name" placeholder="e.g. iPhone 13 Pro, Amber Vanilla Oil, or Linen Set" value={draftProduct.name} onChange={(event) => setDraftProduct({ ...draftProduct, name: event.target.value })} /></div><div><label htmlFor="product-category">Category / Tag</label><select className="dashboard-select" id="product-category" value={draftProduct.category} onChange={(event) => setDraftProduct({ ...draftProduct, category: event.target.value })}><option>Best Sellers</option><option>New Arrivals</option><option>Sale</option></select></div><div><label htmlFor="product-price">Price · ₦</label><Input id="product-price" type="number" min="0" inputMode="numeric" placeholder="48500" value={draftProduct.price} onChange={(event) => setDraftProduct({ ...draftProduct, price: event.target.value })} /></div><div><label htmlFor="product-sale-price">Original price, if on sale</label><Input id="product-sale-price" type="number" min="0" inputMode="numeric" placeholder="Optional" value={draftProduct.compare_at_price} onChange={(event) => setDraftProduct({ ...draftProduct, compare_at_price: event.target.value })} /></div><div><label htmlFor="product-stock">Available stock / quantity</label><Input id="product-stock" type="number" min="0" inputMode="numeric" placeholder="5" value={draftProduct.stock} onChange={(event) => setDraftProduct({ ...draftProduct, stock: event.target.value })} /></div>
              <div className="form-span-two">
                <label htmlFor="product-image">Product photo</label>
               <div className="photo-upload-row">
                 <input
                   type="file"
                   id="product-file-input"
                   accept="image/*"
                   className="hidden"
                   disabled={uploadingImage}
                   onChange={(event) => void handlePhotoUpload(event)}
                 />
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   className="photo-upload-btn"
                  disabled={uploadingImage}
                  onClick={() => document.getElementById("product-file-input")?.click()}
                >
                  <Upload /> {uploadingImage ? "Uploading from phone/device…" : "Upload photo"}
                </Button>
                <span className="photo upoad-or">or paste an image link:</span>
              </div>
                 <Input
                   id="product-image"
                   type="url"
                   placeholder="https://… (or upload directly above)"
                   value={draftProduct.image_url}
                   onChange={(event) => setDraftProduct({ ...draftProduct, image_url: event.target.value })}
                 />
                 {draftProduct.image_url && (
                   <div className="product-preview-wrap">
                     <img className="product-image-preview" src={draftProduct.image_url} alt="Product preview" />
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => setDraftProduct({ ...draftProduct, image_url: "" })}
                     >
                       <X /> Remove photo
                     </Button>
                   </div>
                 )}
               </div>
              <div className="form-span-two">
                <div className="variant-field-header">
                  <label htmlFor="product-variants">
                    Options or variants <span>· Separate with commas</span>
                  </label>
                  <div className="variant-quick-chips">
                    <span className="chips-label">Quick fill:</span>
                    <button
                      type="button"
                      className="quick-chip"
                      title="Add fashion size options"
                      onClick={() => setDraftProduct({ ...draftProduct, variants: "S, M, L, XL" })}
                    >
                      + S, M, L, XL <span className="chip-category">(Fashion)</span>
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      title="Add storage options"
                      onClick={() => setDraftProduct({ ...draftProduct, variants: "64GB, 128GB, 256GB" })}
                    >
                      + 64GB, 128GB, 256GB <span className="chip-category">(Gadgets)</span>
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      title="Add fragrance bottle sizes"
                      onClick={() => setDraftProduct({ ...draftProduct, variants: "3ml, 6ml, 12ml" })}
                    >
                      + 3ml, 6ml, 12ml <span className="chip-category">(Perfumes)</span>
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      title="Add condition options"
                      onClick={() => setDraftProduct({ ...draftProduct, variants: "UK Used, Brand New" })}
                    >
                      + UK Used, Brand New <span className="chip-category">(Electronics)</span>
                    </button>
                  </div>
                </div>
                <Input
                  id="product-variants"
                  placeholder="e.g. S, M, L  ·  128GB, 256GB  ·  30ml, 50ml, 100ml  ·  UK Used, Brand New"
                  value={draftProduct.variants}
                  onChange={(event) => setDraftProduct({ ...draftProduct, variants: event.target.value })}
                />
              </div>
                <Input
                  id="product-variants"
                  placeholder="e.g. S, M, L  ·  128GB, 256GB  ·  30ml, 50ml, 100ml  ·  UK Used, Brand New"
                  value={draftProduct.variants}
                  onChange={(event) => setDraftProduct({ ...draftProduct, variants: event.target.value })}
                />
              </div>

              {/* --- INSERTION 2: Visibility Checkbox --- */}
              <div className="form-span-two">
                <label className="shelf-checkbox-label">
                  <input
                    type="checkbox"
                    checked={draftProduct.visible}
                    onChange={(e) => setDraftProduct({ ...draftProduct, visible: e.target.checked })}
                  />
                  <span>Display live on shop floor immediately (Uses 1 active slot)</span>
                </label>
              </div>
              <div className="form-span-two"><label htmlFor="product-description">Product description</label><Textarea id="product-description" placeholder="Specifications, scent notes, condition, or size details" value={draftProduct.description} onChange={(event) => setDraftProduct({ ...draftProduct, description: event.target.value })} /></div>
            </div>
                        <div className="product-form-actions">
              <span><Upload /> Product photo uploads directly or via link.</span>
              <Button disabled={busy} onClick={() => void saveProduct()}>
                {busy ? "Saving…" : editingProductId ? "Save changes" : "Add this product"} <Check />
              </Button>
            </div>
          </div>

          {/* --- INSERTION 3: Filter Tabs --- */}
          <div className="product-filter-tabs">
            <button
              type="button"
              className={`product-filter-btn ${productFilter === "all" ? "is-active" : ""}`}
              onClick={() => setProductFilter("all")}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              className={`product-filter-btn ${productFilter === "active" ? "is-active" : ""}`}
              onClick={() => setProductFilter("active")}
            >
              Active on Shop ({activeProductsCount})
            </button>
            <button
              type="button"
              className={`product-filter-btn ${productFilter === "archived" ? "is-active" : ""}`}
              onClick={() => setProductFilter("archived")}
            >
              Archived / Backroom ({archivedProductsCount})
            </button>
          </div>

          <div className="vendor-product-list">
            {displayedProducts.length ? (
              displayedProducts.map((product) => (
                <article className={`vendor-product-row ${product.visible ? "" : "is-hidden"}`} key={product.id}>
                  <img src={product.image_url} alt="" width={68} height={82} />
                  <div className="vendor-product-name">
                    <span>{product.category} · {product.visible ? "Active on shop" : "Archived in backroom"}</span>
                    <h3>{product.name}</h3>
                    
                    {/* Quick 2-Tap Stock Sync */}
                    <div className="product-stock-control">
                      <div className="stock-stepper">
                        <button
                          type="button"
                          className="stock-step-btn"
                          aria-label={`Reduce stock for ${product.name}`}
                          disabled={product.stock <= 0}
                          onClick={() => void updateProductStock(product, -1)}
                        >
                          <Minus />
                        </button>
                        <span className={`stock-count ${product.stock === 0 ? "is-zero" : ""}`}>
                          {product.stock === 0 ? "Sold Out" : `${product.stock} in stock`}
                        </span>
                        <button
                          type="button"
                          className="stock-step-btn"
                          aria-label={`Increase stock for ${product.name}`}
                          onClick={() => void updateProductStock(product, 1)}
                        >
                          <Plus />
                        </button>
                      </div>

                      <button
                        type="button"
                        className={`stock-soldout-btn ${product.stock === 0 ? "is-soldout" : ""}`}
                        onClick={() =>
                          void updateProductStock(
                            product,
                            product.stock === 0 ? { set: 5 } : { set: 0 }
                          )
                        }
                      >
                        {product.stock === 0 ? "Restock (+5)" : "Mark Sold Out"}
                      </button>

                      <small className="product-variants-note">
                        · {product.variants.join(", ") || "Standard"}
                      </small>
                    </div>
                  </div>
                  <strong>{formatNaira(product.price)}</strong>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${product.name}`} onClick={() => editProduct(product)}><Settings2 /></Button>
                  <Button variant="ghost" size="icon" aria-label={product.visible ? `Hide ${product.name}` : `Show ${product.name}`} onClick={() => void toggleProduct(product)}>{product.visible ? <EyeOff /> : <Eye />}</Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product)}><Trash2 /></Button>
                </article>
              ))
            ) : (
              <div className="empty-dashboard-note">
                {productFilter === "active"
                  ? "No active products on the shop floor."
                  : productFilter === "archived"
                  ? "No archived products in the backroom."
                  : "No products yet — add your first one above."}
              </div>
            )}
          </div>
              <div className="vendor-product-name">
               <span>{product.category}{product.visible ? "" : " · Hidden"}</span>
               <h3>{product.name}</h3>
  
               {/* Quick 2-Tap Stock Sync */}
               <div className="product-stock-control">
                <div className="stock-stepper">
                 <button
                   type="button"
                   className="stock-step-btn"
                   aria-label={`Reduce stock for ${product.name}`}
                   disabled={product.stock <= 0}
                   onClick={() => void updateProductStock(product, -1)}
                >
                   <Minus />
                </button>
                <span className={`stock-count ${product.stock === 0 ? "is-zero" : ""}`}>
                  {product.stock === 0 ? "Sold Out" : `${product.stock} in stock`}
                </span>
                <button
                  type="button"
                  className="stock-step-btn"
                  aria-label={`Increase stock for ${product.name}`}
                  onClick={() => void updateProductStock(product, 1)}
                >
                  <Plus />
                </button>
              </div>

              <button
                type="button"
                className={`stock-soldout-btn ${product.stock === 0 ? "is-soldout" : ""}`}
                onClick={() =>
                  void updateProductStock(
                    product,
                    product.stock === 0 ? { set: 5 } : { set: 0 }
                  )
                }
              >
                {product.stock === 0 ? "Restock (+5)" : "Mark Sold Out"}
              </button>

              <small className="product-variants-note">
                · {product.variants.join(", ") || "Standard"}
              </small>
            </div>
          </div>
              <strong>{formatNaira(product.price)}</strong><Button variant="ghost" size="icon" aria-label={`Edit ${product.name}`} onClick={() => editProduct(product)}><Settings2 /></Button><Button variant="ghost" size="icon" aria-label={product.visible ? `Hide ${product.name}` : `Show ${product.name}`} onClick={() => void toggleProduct(product)}>{product.visible ? <EyeOff /> : <Eye />}</Button><Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product)}><Trash2 /></Button></article>) : <div className="empty-dashboard-note">No products yet — add your first one above.</div>}</div>
          </TabsContent>
          <TabsContent value="orders" className="dashboard-tab-content">
            <div className="dashboard-section-heading orders-page-heading"><div><p className="eyebrow">Every order, in one place</p><h2>On the way to something good.</h2></div><span className="orders-total">{orders.length} {orders.length === 1 ? "order" : "orders"}</span></div>
            <div className="order-tools">
              <div className="order-search">
                <Search />
                <Input
                  aria-label="Find an order"
                  placeholder="Find a customer or order number"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                />
              </div>
              <select
                className="dashboard-select"
                aria-label="Filter orders by status"
                value={orderFilter}
                onChange={(event) => setOrderFilter(event.target.value)}
              >
                <option value="all">Every order</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option value={key} key={key}>{label}</option>
                ))}
              </select>

              {/* One-Tap CSV / Excel Export */}
              <Button
                variant="outline"
                className="order-export-btn"
                onClick={exportOrdersToCSV}
                title="Download orders as Excel / CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
              </Button>
            </div>
            <div className="orders-table">
              <div className="orders-table-head">
                <span>ORDER</span>
                <span>YOUR CUSTOMER</span>
                <span>DELIVERY</span>
                <span>TOTAL</span>
                <span>STATUS</span>
                <span>UPDATE</span>
               </div>
               {filteredOrders.length ? (
                 filteredOrders.map((order) => (
                   <OrderRow
                     key={order.id}
                     order={order}
                     onOpen={() => void openOrderDetails(order)}
                     onStatusChange={(status) => handleStatusChangeRequest(order, status)}
                   />
                 ))
               ) : (
                 <div className="empty-dashboard-note">No orders found. When someone orders, you’ll see it here.</div>
               )}
             </div>
          </TabsContent>
          <TabsContent value="settings" className="dashboard-tab-content">
            {settings && (
              <>
                <div className="dashboard-section-heading settings-heading">
                  <div>
                    <p className="eyebrow">The details customers see</p>
                    <h2>Your shop, your way.</h2>
                  </div>
                  <Button onClick={() => void saveSettings()}>
                    Save shop details <Check />
                  </Button>
                </div>

                <div className="settings-columns">
                  {/* === Official Merchant Identity Card === */}
                  <div className="settings-merchant-card">
                    <div>
                      <p className="eyebrow">Legal Merchant Anchor</p>
                      <h3>Official Merchant ID</h3>
                      <p className="settings-section-desc">
                        Your permanent SendCart registration ID. Anchors your dispute protection, transaction receipts, and WhatsApp vendor support.
                      </p>
                    </div>
                    <div className="merchant-id-display">
                      <code
                        title="Tap to copy Merchant ID"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const code = profile.vendor_code || "SC-VND-00101";
                          void navigator.clipboard.writeText(code);
                          toast.success(`Copied Merchant ID: ${code}`);
                        }}
                      >
                        {profile.vendor_code || "SC-VND-00101"}
                      </code>
                      <span className="merchant-status-badge">Registered Vendor</span>
                    </div>
                  </div>

                  {/* === Store Vibe & Aesthetics Preset Selector === */}
                  <section className="settings-group theme-setting-group">
                    <div className="settings-group-title">
                      <Palette />
                      <div>
                        <h3>Store Vibe & Aesthetics</h3>
                        <p>Pick a curated design preset tailored to your niche.</p>
                      </div>
                    </div>
                    <div className="theme-presets-grid">
                      <button
                        type="button"
                        className={`theme-card ${(!settings.store_theme || settings.store_theme === "editorial") ? "is-active" : ""}`}
                        onClick={() => setSettings({ ...settings, store_theme: "editorial" })}
                      >
                        <div className="theme-swatch editorial-swatch">
                          <span className="swatch-font">Aa</span>
                          <span className="swatch-pill">Warm Paper</span>
                        </div>
                        <div className="theme-info">
                          <div className="theme-header">
                            <h4>Editorial Boutique</h4>
                            {(!settings.store_theme || settings.store_theme === "editorial") && (
                              <span className="theme-active-tag">Active</span>
                            )}
                          </div>
                          <p className="theme-font-tag">Instrument Serif + Work Sans</p>
                          <p className="theme-desc">Warm cream & charcoal. For fashion, jewelry, perfumes & luxury.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`theme-card ${settings.store_theme === "modern" ? "is-active" : ""}`}
                        onClick={() => setSettings({ ...settings, store_theme: "modern" })}
                      >
                        <div className="theme-swatch modern-swatch">
                          <span className="swatch-font">Aa</span>
                          <span className="swatch-pill">Studio Slate</span>
                        </div>
                        <div className="theme-info">
                          <div className="theme-header">
                            <h4>Modern / Tech</h4>
                            {settings.store_theme === "modern" && (
                              <span className="theme-active-tag">Active</span>
                            )}
                          </div>
                          <p className="theme-font-tag">Space Grotesk + Cobalt Blue</p>
                          <p className="theme-desc">Crisp white, slate & electric blue. For phones, gadgets & sneakers.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`theme-card ${settings.store_theme === "bold" ? "is-active" : ""}`}
                        onClick={() => setSettings({ ...settings, store_theme: "bold" })}
                      >
                        <div className="theme-swatch bold-swatch">
                          <span className="swatch-font">AA</span>
                          <span className="swatch-pill">High Contrast</span>
                        </div>
                        <div className="theme-info">
                          <div className="theme-header">
                            <h4>Bold / Street</h4>
                            {settings.store_theme === "bold" && (
                              <span className="theme-active-tag">Active</span>
                            )}
                          </div>
                          <p className="theme-font-tag">Heavy Display + Monochrome</p>
                          <p className="theme-desc">Black & white, boxy borders & punchy badges. For streetwear & drops.</p>
                        </div>
                      </button>
                    </div>
                  </section>

                  {/* Column 1: Store info & Bank details */}
                  <div className="settings-column">
                    <section className="settings-group">
                      <div className="settings-group-title">
                        <Store />
                        <div>
                          <h3>A warm hello</h3>
                          <p>Your name and the note that goes with it.</p>
                        </div>
                      </div>
                      <label htmlFor="settings-shop-name">Shop name</label>
                      <Input
                        id="settings-shop-name"
                        value={settings.store_name}
                        onChange={(event) => setSettings({ ...settings, store_name: event.target.value })}
                      />
                      <label htmlFor="settings-bio">A little note about your shop</label>
                      <Textarea
                        id="settings-bio"
                        rows={3}
                        value={settings.bio}
                        onChange={(event) => setSettings({ ...settings, bio: event.target.value })}
                      />
                      <label htmlFor="settings-photo">Shop photo link</label>
                      <Input
                        id="settings-photo"
                        placeholder="https://…"
                        value={settings.avatar_url}
                        onChange={(event) => setSettings({ ...settings, avatar_url: event.target.value })}
                      />
                      <label htmlFor="settings-instagram">Instagram name</label>
                      <Input
                        id="settings-instagram"
                        placeholder="yourshop.ng"
                        value={settings.instagram_handle}
                        onChange={(event) => setSettings({ ...settings, instagram_handle: event.target.value })}
                      />
                    </section>

                    <section className="settings-group">
                      <div className="settings-group-title">
                        <Banknote />
                        <div>
                          <h3>Paid straight to you</h3>
                          <p>Your customers transfer directly to this account.</p>
                        </div>
                      </div>
                      <label htmlFor="settings-bank">Bank name</label>
                      <Input
                        id="settings-bank"
                        placeholder="e.g. Access Bank"
                        value={settings.bank_name}
                        onChange={(event) => setSettings({ ...settings, bank_name: event.target.value })}
                      />
                      <label htmlFor="settings-account-number">Account number</label>
                      <Input
                        id="settings-account-number"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10 digits"
                        value={settings.bank_account}
                        onChange={(event) =>
                          setSettings({ ...settings, bank_account: event.target.value.replace(/\D/g, "").slice(0, 10) })
                        }
                      />
                      <label htmlFor="settings-account-name">Account name</label>
                      <Input
                        id="settings-account-name"
                        value={settings.bank_account_name}
                        onChange={(event) => setSettings({ ...settings, bank_account_name: event.target.value })}
                      />
                    </section>
                  </div>

                  {/* Column 2: Delivery, WhatsApp & Link */}
                  <div className="settings-column">
                    <section className="settings-group">
                      <div className="settings-group-title">
                        <Truck />
                        <div>
                          <h3>Getting there</h3>
                          <p>Set the flat delivery rate for each area you serve.</p>
                        </div>
                      </div>
                      {Object.entries(settings.delivery_zones).map(([zone, detail]) => (
                        <div className="zone-row" key={zone}>
                          <Input
                            aria-label={`${zone} delivery area`}
                            value={zone}
                            onChange={(event) => {
                              const nextZones = { ...settings.delivery_zones };
                              const updated = nextZones[zone];
                              delete nextZones[zone];
                              if (updated) nextZones[event.target.value] = updated;
                              setSettings({ ...settings, delivery_zones: nextZones });
                            }}
                          />
                          <div className="zone-fee-input">
                            <span>₦</span>
                            <Input
                              aria-label={`${zone} delivery fee`}
                              inputMode="numeric"
                              value={detail.fee}
                              onChange={(event) =>
                                setSettings({
                                  ...settings,
                                  delivery_zones: {
                                    ...settings.delivery_zones,
                                    [zone]: { fee: Number(event.target.value) || 0 },
                                  },
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${zone}`}
                              onClick={() => {
                                const zones = { ...settings.delivery_zones };
                                delete zones[zone];
                                setSettings({ ...settings, delivery_zones: zones });
                              }}
                            >
                              <X />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* One-tap Nigerian Delivery Presets */}
                      <div className="variant-quick-chips" style={{ marginBottom: "12px" }}>
                        <span className="chips-label">Quick add options:</span>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => {
                            setNewZone("Dispatch Rider (Pay rider directly on delivery)");
                            setNewZoneFee("0");
                          }}
                        >
                          + Pay Rider on Arrival (₦0)
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => {
                            setNewZone("Motor Park Waybill (Pay driver at park upon collection)");
                            setNewZoneFee("0");
                          }}
                        >
                          + Park Waybill · Pay at Park (₦0)
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => {
                            setNewZone("Interstate / Doorstep Courier (Fee confirmed on WhatsApp)");
                            setNewZoneFee("0");
                          }}
                        >
                          + Confirm on WhatsApp (₦0)
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => {
                            setNewZone("Mainland Central (Ikeja, Yaba, Surulere)");
                            setNewZoneFee("2500");
                          }}
                        >
                          + Mainland Central · ₦2,500
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => {
                            setNewZone("Island Central (Ikoyi, VI, Lekki Phase 1)");
                            setNewZoneFee("3500");
                          }}
                        >
                          + Island Central · ₦3,500
                        </button>
                      </div>
                        
                      <div className="add-zone-fields">
                        <Input
                          aria-label="New delivery area"
                          placeholder="Area name"
                          value={newZone}
                          onChange={(event) => setNewZone(event.target.value)}
                        />
                        <Input
                          aria-label="New delivery fee"
                          type="number"
                          min="0"
                          placeholder="Delivery fee in ₦"
                          value={newZoneFee}
                          onChange={(event) => setNewZoneFee(event.target.value)}
                        />
                        <Button
                          variant="outline"
                          aria-label="Add delivery area"
                          onClick={addDeliveryZone}
                        >
                          <Plus /> Add area
                        </Button>
                      </div>
                    </section>

                    <section className="settings-group">
                      <div className="settings-group-title">
                        <ShoppingBag />
                        <div>
                          <h3>Say hello on WhatsApp</h3>
                          <p>Order updates and questions go straight to you.</p>
                        </div>
                      </div>
                      <label htmlFor="settings-whatsapp">WhatsApp number</label>
                      <Input
                        id="settings-whatsapp"
                        type="tel"
                        placeholder="080 1234 5678"
                        value={settings.whatsapp_phone}
                        onChange={(event) => setSettings({ ...settings, whatsapp_phone: event.target.value })}
                      />
                    </section>

                    <section className="settings-group">
                      <div className="settings-group-title">
                        <Sparkles />
                        <div>
                          <h3>Your little shop link</h3>
                          <p>Made for WhatsApp status, Instagram bio and messages.</p>
                        </div>
                      </div>
                      <div className="share-link-box">
                        <span>{storeLink.replace(/^https?:\/\//, "")}</span>
                        <Button size="icon" variant="ghost" aria-label="Copy shop link" onClick={() => void copyStoreLink()}>
                          <Copy />
                        </Button>
                      </div>
                      <a className="text-link" href={storeLink} target="_blank" rel="noreferrer">
                        Open your shop <ExternalLink />
                      </a>
                    </section>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <footer className="dashboard-footer">
        <span>SendCart · Direct orders. Direct payments. Always yours.</span>
        <div className="dashboard-footer-links">
          <a href="/terms#pricing">Platform Pricing</a>
          <a href="mailto:favouradudu33@gmail.com">Contact Support</a>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/">Storefront <ArrowUpRight /></a>
        </div>
      </footer>

      <Sheet open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="right" className="order-details-sheet">
          {selectedOrder && (
            <>
              <SheetHeader>
                <p className="eyebrow">Order details</p>
                <SheetTitle>{selectedOrder.order_number}</SheetTitle>
                <SheetDescription>
                  Placed on {new Date(selectedOrder.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </SheetDescription>
              </SheetHeader>
              <div className="order-details-body" style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* 1. Customer Card */}
                <div style={{ background: "var(--card, #fff)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border, #e5e5e5)" }}>
                  <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Customer</span>
                  <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{selectedOrder.customer_name}</div>
                  <div style={{ color: "var(--muted-foreground)" }}>{selectedOrder.customer_phone}</div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "0.9rem", color: "var(--primary)", textDecoration: "underline" }}
                    >
                      Message on WhatsApp →
                    </a>
                  </div>
                </div>

                {/* 2. Delivery Destination & Address Card */}
                <div style={{ background: "var(--card, #fff)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border, #e5e5e5)" }}>
                  <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Delivery destination</span>
                  <div style={{ fontWeight: 600 }}>{selectedOrder.delivery_zone}</div>
                  {selectedOrder.delivery_address && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border, #e5e5e5)" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted-foreground)", display: "block" }}>Street address & landmark</span>
                      <div style={{ fontSize: "0.95rem", color: "var(--foreground)", marginTop: "2px" }}>
                        {selectedOrder.delivery_address}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ background: "var(--card, #fff)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border, #e5e5e5)" }}>
                  <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Purchased items</span>
                  {loadingItems ? (
                    <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>Loading items…</p>
                  ) : orderItems.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                      {orderItems.map((item) => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border, #f0f0f0)", paddingBottom: "0.5rem" }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                            <small style={{ color: "var(--muted-foreground)" }}>{item.variant} × {item.quantity}</small>
                          </div>
                          <strong>{formatNaira(item.unit_price * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>Item details recorded on order confirmation.</p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "2px solid var(--border, #e5e5e5)" }}>
                    <span>Total order value</span>
                    <strong style={{ fontSize: "1.1rem" }}>{formatNaira(selectedOrder.total)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {/* Dispatch Details Sheet */}
      <Sheet open={Boolean(dispatchOrderModal)} onOpenChange={(open) => !open && setDispatchOrderModal(null)}>
        <SheetContent side="right" className="order-details-sheet">
          <SheetHeader className="order-details-header">
            <p className="eyebrow">Dispatch Notification</p>
            <SheetTitle>Send Dispatch Details</SheetTitle>
            <SheetDescription>
              Add the rider or waybill info for order {dispatchOrderModal?.order_number}.
            </SheetDescription>
          </SheetHeader>

          {dispatchOrderModal && (
            <div className="order-details-body" style={{ marginTop: "1rem" }}>
              <div className="order-details-card">
                <h4>Customer & Destination</h4>
                <p style={{ margin: "0.25rem 0", fontSize: "14px" }}>
                  Customer: <strong>{dispatchOrderModal.customer_name}</strong> ({dispatchOrderModal.customer_phone})
                </p>
                <p style={{ margin: "0.25rem 0", fontSize: "13px", color: "var(--muted-foreground)" }}>
                  Delivery: <strong>{dispatchOrderModal.delivery_address || dispatchOrderModal.delivery_zone}</strong>
                </p>
              </div>

              <div className="order-details-card" style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                <h4>Dispatch & Courier Details</h4>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    Rider / Driver Phone Number
                  </label>
                  <Input
                    placeholder="e.g. 0803 123 4567"
                    value={dispatchRiderPhone}
                    onChange={(e) => setDispatchRiderPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    Waybill / Park / Courier Note
                  </label>
                  <Input
                    placeholder="e.g. Peace Mass Transit / Driver Musa or Speedaf Waybill #8492"
                    value={dispatchWaybillNote}
                    onChange={(e) => setDispatchWaybillNote(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: "8px", marginTop: "1.5rem" }}>
                <Button
                  onClick={() => {
                    const ord = dispatchOrderModal;
                    setDispatchOrderModal(null);
                    void saveOrderStatus(ord, "dispatched", {
                      riderPhone: dispatchRiderPhone.trim(),
                      waybillNote: dispatchWaybillNote.trim(),
                    });
                  }}
                >
                  Send Dispatch WhatsApp & Update <ArrowUpRight style={{ width: 16, height: 16, marginLeft: 6 }} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const ord = dispatchOrderModal;
                    setDispatchOrderModal(null);
                    void saveOrderStatus(ord, "dispatched");
                  }}
                >
                  Update Status Without Message
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(upgradeTier)} onOpenChange={(open) => !open && setUpgradeTier(null)}>
        <SheetContent side="right" className="order-details-sheet">
          <SheetHeader className="order-details-header">
            <p className="eyebrow">Shop upgrade · Direct transfer</p>
            <SheetTitle>
              {upgradeTier === "credits"
                ? "Booster Pack (+50 Credits)"
                : upgradeTier === "pro"
                  ? "Pro Merchant Plan"
                  : "Power Store Plan"}
            </SheetTitle>
            <SheetDescription>
              Transfer directly to SendCart and send your payment screenshot to activate.
            </SheetDescription>
          </SheetHeader>

          {upgradeTier && (
            <div className="order-details-body" style={{ marginTop: "1rem" }}>
              <div className="order-details-card">
                <h4>Plan summary</h4>
                <p style={{ margin: "0.25rem 0", fontSize: "14px" }}>
                  Plan:{" "}
                  <strong>
                    {upgradeTier === "credits"
                      ? "Booster Pack (+50 Order Credits · Never Expires)"
                      : upgradeTier === "pro"
                        ? "Pro Merchant (Up to 50 Products · Unlimited Orders)"
                        : "Power Store (Unlimited Products · Custom Domain)"}
                  </strong>
                </p>
                <p style={{ margin: "0.25rem 0", fontSize: "14px" }}>
                  Amount to transfer:{" "}
                  <strong style={{ fontSize: "18px", color: "var(--foreground)" }}>
                    {formatNaira(
                      upgradeTier === "credits"
                        ? creditPackPrice
                        : upgradeTier === "pro"
                          ? proMonthlyPrice
                          : powerMonthlyPrice
                    )}
                  </strong>
                </p>
              </div>

              {/* SendCart Official Bank Account Details */}
              <div className="order-details-card" style={{ marginTop: "12px" }}>
                <h4>SendCart Official Bank Details</h4>
                <div style={{ display: "grid", gap: "8px", fontSize: "13px", marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Bank:</span>
                    <strong>{SENDCART_BILLING.bankName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Account Number:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontFamily: "monospace", fontSize: "15px" }}>
                        {SENDCART_BILLING.accountNumber}
                      </strong>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        style={{ height: "26px", padding: "0 8px", fontSize: "11px" }}
                        onClick={() => void copyBillingAccount()}
                      >
                        {billingCopied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                        <span style={{ marginLeft: "4px" }}>{billingCopied ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Account Name:</span>
                    <strong>{SENDCART_BILLING.accountName}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Proof Prompt */}
              <div className="payment-screenshot-notice" style={{ marginTop: "12px" }}>
                <Camera aria-hidden="true" />
                <div>
                  <strong>Payment confirmation required:</strong>
                  <span>Transfer the exact amount above and reply on WhatsApp with your payment receipt or screenshot to activate your store.</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: "8px", marginTop: "1.5rem" }}>
                <Button
                  disabled={upgradeBusy}
                  onClick={() => void handleUpgradeConfirm()}
                >
                  {upgradeBusy
                    ? "Logging request…"
                    : `I Have Transferred ${formatNaira(upgradeTier === "credits" ? creditPackPrice : unlimitedMonthlyPrice)} — Send Receipt`}
                  <ArrowUpRight style={{ width: 16, height: 16, marginLeft: 6 }} />
                </Button>
                <Button
                  variant="outline"
                  disabled={upgradeBusy}
                  onClick={() => setUpgradeTier(null)}
                >
                  Cancel
                </Button>
              </div>

              <small style={{ display: "block", textAlign: "center", color: "var(--muted-foreground)", fontSize: "11px", marginTop: "10px" }}>
                Upgrades are verified by SendCart Admin and activated promptly upon receiving proof.
              </small>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;
}

function OrderRow({ order, onOpen, onStatusChange }: { order: OrderRecord; onOpen?: () => void; onStatusChange?: (status: OrderStatus) => void }) {
  return (
    <article className="order-row">
      <span className="order-reference" onClick={onOpen} style={{ cursor: onOpen ? "pointer" : "default" }}>
        {order.order_number}
        <small>{new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</small>
      </span>
      <span className="order-customer">
        {order.customer_name}
        <small>{order.customer_phone}</small>
      </span>
      <span className="order-zone">{order.delivery_zone}</span>
      <strong className="order-total">{formatNaira(order.total)}</strong>
      <span className={`order-status status-${order.status}`}>{statusLabels[order.status]}</span>
      {onStatusChange ? (
        <select
          className="order-status-select"
          aria-label={`Update ${order.order_number} status`}
          value={order.status}
          onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
        >
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      ) : (
        <Button variant="ghost" size="icon" aria-label={`Open order ${order.order_number}`} onClick={onOpen}>
          <ArrowRight />
        </Button>
      )}
    </article>
  );
}
