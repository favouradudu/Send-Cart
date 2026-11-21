import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  Copy,
  Heart,
  Instagram,
  Loarder2,
  Menu,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DEMO_PROFILE,
  DEMO_PRODUCTS,
  DEMO_SLUG,
  DEMO_VENDOR_PHONE,
  buildWhatsAppOrderMessage,
  formatNaira,
  getDeliveryFeeLabel,
  type ShopProduct,
  type ShopProfile,
} from "@/lib/shop";

type CartLine = { product: ShopProduct; quantity: number; variant: string };
type PlacedOrder = {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_zone: string;
  delivery_address?: string;
  delivery_fee: number;
  subtotal: number;
  total: number;
  items: CartLine[];
};

export function Storefront({ storeSlug }: { storeSlug: string }) {
  const [profile, setProfile] = useState<ShopProfile>(DEMO_PROFILE);
  const [products, setProducts] = useState<ShopProduct[]>(DEMO_PRODUCTS);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState("All items");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [pickerProduct, setPickerProduct] = useState<ShopProduct | null>(null);
  const [pickerVariant, setPickerVariant] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState(() => Object.keys(DEMO_PROFILE.delivery_zones)[0] ?? "Lagos Mainland");
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(() => storeSlug !== DEMO_SLUG);
  const [accountCopied, setAccountCopied] = useState(false);

  const isDemo = storeSlug === DEMO_SLUG;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (isDemo) {
        setProfile(DEMO_PROFILE);
        setProducts(DEMO_PRODUCTS);
        setIsLoading(false);
        return;
      }
      try {
        const { data: shop } = await supabase
          .from("profiles")
          .select("*")
          .eq("store_slug", storeSlug)
          .maybeSingle();
        if (!active) return;
        if (!shop) {
          setProducts([]);
          setIsLoading(false);
          return;
        }
        const { data: catalog } = await supabase
          .from("products")
          .select("*")
          .eq("vendor_id", shop.id)
          .eq("visible", true)
          .order("created_at", { ascending: false });
        if (!active) return;
        setProfile(shop as unknown as ShopProfile);
        setProducts((catalog ?? []) as unknown as ShopProduct[]);
      } catch {
        if (active) toast.error("This shop could not be opened just now.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isDemo, storeSlug]);

  const categories = useMemo(
    () => ["All items", ...new Set(products.filter((item) => item.visible).map((item) => item.category))],
    [products],
  );
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (!product.visible) return false;
      const matchesCat = category === "All items" || product.category === category;
      if (!matchesCat) return false;
      if (!q) return true;

      const matchesName = product.name.toLowerCase().includes(q);
      const matchesCategoryName = product.category.toLowerCase().includes(q);
      const matchesVariants = (product.variants || []).some((v) =>
        v.toLowerCase().includes(q)
      );
      return matchesName || matchesCategoryName || matchesVariants;
    });
  }, [products, category, searchQuery]
  );
  
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = profile.delivery_zones[deliveryZone]?.fee ?? 0;

  const addToCart = (product: ShopProduct, chosenVariant?: string) => {
    if (product.stock < 1) return;
    const variant = chosenVariant ?? selectedVariants[product.id] ?? product.variants[0] ?? "One size";
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id && line.variant === variant);
      if (existing && existing.quantity >= product.stock) {
        toast.error("That’s all we have in stock.");
        return current;
      }
      return existing
        ? current.map((line) =>
            line.product.id === product.id && line.variant === variant
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { product, quantity: 1, variant }];
    });
    toast.success(`Added ${product.name} (${variant}) to your cart`);
  };

  const handleCardAdd = (product: ShopProduct) => {
    if (product.stock < 1) return;
    if (product.variants.length > 1) {
      setPickerProduct(product);
      setPickerVariant(selectedVariants[product.id] ?? product.variants[0] ?? "");
    } else {
      addToCart(product, product.variants[0] ?? "One size");
    }
  };

  const changeQuantity = (line: CartLine, delta: number) => {
    setCart((current) =>
      current
        .map((row) =>
          row.product.id === line.product.id && row.variant === line.variant
            ? { ...row, quantity: Math.min(row.product.stock, row.quantity + delta) }
            : row,
        )
        .filter((row) => row.quantity > 0),
    );
  };

  const placeOrder = async () => {
    if (submittingOrder) return;
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 8 || !deliveryAddress.trim() || cart.length === 0) {
      toast.error("Add your name, WhatsApp number, and street address with a landmark.");
      return;
    }

    setSubmittingOrder(true);

    try {
      let createdOrder: PlacedOrder;
      if (isDemo) {
        createdOrder = {
          order_number: `SC-ORD-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          delivery_zone: deliveryZone,
          delivery_address: deliveryAddress.trim(),
          delivery_fee: deliveryFee,
          subtotal,
          total: subtotal + deliveryFee,
          items: [...cart],
        };
        setProducts((current) =>
          current.map((product) => {
            const purchased = cart.find((line) => line.product.id === product.id);
            return purchased ? { ...product, stock: Math.max(0, product.stock - purchased.quantity) } : product;
          }),
        );
      } else {
        const { data, error } = await supabase.rpc("place_store_order" as any, {
          p_vendor_id: profile.id,
          p_customer_name: customerName.trim(),
          p_customer_phone: customerPhone.trim(),
          p_delivery_zone: deliveryZone,
          p_delivery_address: deliveryAddress.trim(),
          p_items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            variant: item.variant,
          })),
        });
        if (error) {
          toast.error(error.message.includes("monthly order limit") ? "This store has reached its monthly order limit." : error.message);
          return;
        }
        const saved = data as unknown as Omit<PlacedOrder, "items">;
        createdOrder = { ...saved, delivery_address: deliveryAddress.trim(), items: [...cart] };
      }

      setOrder(createdOrder);
      setCheckoutOpen(false);
      setCartOpen(true);
      const text = buildWhatsAppOrderMessage({
        orderNumber: createdOrder.order_number,
        customerName: createdOrder.customer_name,
        customerPhone: createdOrder.customer_phone,
        deliveryZone: createdOrder.delivery_zone,
        deliveryAddress: deliveryAddress.trim(),
        deliveryFee: createdOrder.delivery_fee,
        subtotal: createdOrder.subtotal,
        total: createdOrder.total,
        items: createdOrder.items,
        vendorBank: profile.bank_name,
        vendorAccount: profile.bank_account,
        vendorAccountName: profile.bank_account_name,
      });
      const vendorPhone = (profile.whatsapp_number || DEMO_VENDOR_PHONE).replace(/\D/g, "");
      window.open(`https://wa.me/${vendorPhone}?text=${encodeURIComponent(text)}`, "_blank");
      toast.success("Order recorded. Opened WhatsApp to send it to the seller.");
      setCart([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to place order";
      toast.error(message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(profile.bank_account);
      setAccountCopied(true);
      window.setTimeout(() => setAccountCopied(false), 2000);
      toast.success("Account number copied");
    } catch {
      toast.error("Couldn’t copy — please copy the number manually.");
    }
  };

  const goToOrder = () => {
    setOrder(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCartOpen(false);
  };

  return (
    <div
      className="storefront min-h-screen bg-background text-foreground"
      data-theme={profile.store_theme || "editorial"}
    >
      <div className="announcement-bar">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Thoughtful Lagos style, delivered to your door</span>
      </div>
      <header className="store-header">
        <a className="brand-wordmark" href={isDemo ? "/" : `/${storeSlug}`} aria-label={`${profile.store_name} home`}>
          send<span>cart</span>
        </a>
        <nav className="store-header-nav" aria-label="Store">
          <a href="#collection">Shop the collection</a>
          <a href="#our-note">Our note</a>
        </nav>
        <div className="store-header-actions">
          <a className="dashboard-link" href="/dashboard">For sellers <ArrowUpRight aria-hidden="true" /></a>
          <Button variant="ghost" size="icon" className="header-cart" aria-label={`Open shopping cart, ${itemCount} items`} onClick={() => { setOrder(null); setCartOpen(true); }}>
            <ShoppingBag aria-hidden="true" />
            {itemCount > 0 && <span className="bag-count">{itemCount}</span>}
          </Button>
        </div>
      </header>

      <main>
        <section className="editorial-hero" id="our-note">
          <div className="editorial-copy">
            <div className="store-signature">
              <span className="signature-avatar">A</span>
              <span>{profile.store_name}<span className="verified-marker" title="Seller verified"><ShieldCheck /></span></span>
              <span className="signature-location">Lagos, Nigeria</span>
            </div>
            <p className="eyebrow"><span /> Verified social commerce · Direct WhatsApp orders</p>
            <h1>Good things,<br /><em>meant to be ordered.</em></h1>
            <p className="hero-description">{profile.bio}</p>
            <a className="text-arrow-link" href="#collection">Browse the catalog <ArrowDownRight aria-hidden="true" /></a>
            <div className="hero-press-line">
              <span>Gadgets & Tech</span>
              <i />
              <span>Fragrance & Beauty</span>
              <i />
              <span>Fashion & Sneakers</span>
            </div>
          </div>
          <div className="hero-collage-wrap">
            <div className="hero-collage-grid">
              <a href="#collection" className="hero-collage-tile">
                <img
                  src="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80"
                  alt="Gadgets & Phones"
                  loading="eager"
                />
                <span className="hero-collage-tag">Gadgets · ₦450k</span>
              </a>
              <a href="#collection" className="hero-collage-tile">
                <img
                  src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80"
                  alt="Luxury Fragrance"
                  loading="eager"
                />
                <span className="hero-collage-tag">Fragrance · ₦18.5k</span>
              </a>
              <a href="#collection" className="hero-collage-tile">
                <img
                  src="/images/aura-emerald-set.jpg"
                  alt="Relaxed Linen Set"
                  loading="eager"
                />
                <span className="hero-collage-tag">Apparel · ₦48.5k</span>
              </a>
              <a href="#collection" className="hero-collage-tile">
                <img
                  src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80"
                  alt="Retro Sneakers"
                  loading="eager"
                />
                <span className="hero-collage-tag">Footwear · ₦38k</span>
              </a>
            </div>
            <div className="image-caption">
              <span>01 — 04 Top Categories</span>
              <span>Direct seller orders on WhatsApp</span>
            </div>
            <div className="image-note">SEND<br />CART<br />DIRECT</div>
          </div>
          <a className="floating-social" href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noreferrer" aria-label={`Visit ${profile.store_name} on Instagram`}><Instagram /></a>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-intro">
            <div><p className="eyebrow"><span /> The good things</p><h2>A little of what<br />you <em>love.</em></h2></div>
            <p>Carefully selected items.<br />Direct from the vendor to you.</p>
          </div>

          {/* Quick Search Bar */}
          <div className="storefront-search-wrap">
            <Search aria-hidden="true" className="storefront-search-icon" />
            <input
              type="search"
              className="storefront-search-input"
              placeholder="Search items, sizes, scents, or storage…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search catalog"
            />
            {searchQuery && (
              <button
                type="button"
                className="storefront-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="collection-toolbar" aria-label="Filter collection">
            <div className="category-tabs" role="group" aria-label="Product categories">
              {categories.map((item) => (
                <button
                  key={item}
                  className={`category-tab ${category === item ? "is-current" : ""}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  <span>
                    {item === "All items"
                      ? products.filter((p) => p.visible).length
                      : products.filter((p) => p.visible && p.category === item).length}
                  </span>
                </button>
              ))}
            </div>
            <span className="stock-note">In stock & ready to dispatch <Sparkles aria-hidden="true" /></span>
          </div>  
          {isLoading ? (
            <div className="empty-store">Just opening our doors…</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-store">
              <Store aria-hidden="true" />
              {searchQuery ? (
                <div>
                  <p>No products matching “{searchQuery}” in {category}.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSearchQuery("");
                      setCategory("All items");
                    }}
                  >
                    Clear search & filters
                  </Button>
                </div>
              ) : (
                <p>This little shop is getting ready. Visit again soon.</p>
              )}
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product, index) => {
                const currentVariant = selectedVariants[product.id] ?? product.variants[0] ?? "";
                return (
                  <article className="product-card" key={product.id}>
                    <button
                      className="product-photo-button"
                      onClick={() => handleCardAdd(product)}
                      disabled={product.stock < 1}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        width={1024}
                        height={1280}
                        loading={index > 1 ? "lazy" : undefined}
                      />
                      {product.compare_at_price && <span className="photo-tag">On sale</span>}
                      <span className="quick-add">
                        <Plus aria-hidden="true" /> Add to cart {currentVariant ? `· ${currentVariant}` : ""}
                      </span>
                      <span className="stock-counter">
                        {product.stock < 1 ? "Just sold out" : `${product.stock} left`}
                      </span>
                    </button>
                    <div className="product-details">
                      <div>
                        <span className="product-category">{product.category}</span>
                        <h3>{product.name}</h3>
                      </div>
                      <div className="product-price">
                        <span>{formatNaira(product.price)}</span>
                        {product.compare_at_price && <del>{formatNaira(product.compare_at_price)}</del>}
                      </div>
                    </div>
                    <div className="product-variants" role="group" aria-label={`Options for ${product.name}`}>
                      {product.variants.map((variant) => {
                        const isSelected = currentVariant === variant;
                        return (
                          <button
                            key={variant}
                            type="button"
                            className={`variant-pill ${isSelected ? "is-selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVariants((curr) => ({ ...curr, [product.id]: variant }));
                              toast.success(`Selected ${variant}`);
                            }}
                            aria-pressed={isSelected}
                            aria-label={`Select ${variant} for ${product.name}`}
                          >
                            {variant}
                          </button>
                        );
                      })}
                      <button
                        aria-label={`Add ${product.name} to favourites`}
                        className="save-product"
                        onClick={() => toast.success("We’ll keep this one in mind.")}
                      >
                        <Heart />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="small-business-note">
          <div className="note-number">A little<br />note, first.</div>
          <div><p className="eyebrow">Direct from our hands</p><h2>Good style.<br /><em>Good people.</em></h2></div>
          <p className="note-copy">Your order goes straight to us — no middlemen, no fuss. Choose your items, leave the delivery to us, and we’ll confirm your order with you on WhatsApp.</p>
          <a className="text-arrow-link" href={`https://wa.me/${(profile.whatsapp_phone || DEMO_VENDOR_PHONE).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Say hello <ArrowRight aria-hidden="true" /></a>
        </section>

        <footer className="store-footer">
          <a className="brand-wordmark" href="#top">
            send<span>cart</span>
          </a>
          <span>Thoughtfully found. Personally sent from Lagos.</span>
          <div className="store-footer-links">
            <a href="/terms#pricing">Platform Pricing</a>
            <a href="mailto:favouradudu33@gmail.com">Contact Support</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/dashboard">
              Seller Dashboard <ArrowUpRight />
            </a>
          </div>
        </footer>
      </main>
      
      {/* Variant Selection Bottom Sheet */}
      <Sheet open={Boolean(pickerProduct)} onOpenChange={(open) => { if (!open) setPickerProduct(null); }}>
        <SheetContent side="bottom" className="variant-picker-sheet">
          {pickerProduct && (
            <>
              <SheetHeader className="cart-sheet-heading">
                <p className="eyebrow">Select an option</p>
                <SheetTitle>Choose option</SheetTitle>
                <SheetDescription>Pick your preferred option before adding to cart.</SheetDescription>
              </SheetHeader>
              <div className="variant-picker-product">
                <img src={pickerProduct.image_url} alt="" width={64} height={80} />
                <div className="variant-picker-details">
                  <span className="product-category">{pickerProduct.category}</span>
                  <h3>{pickerProduct.name}</h3>
                  <span className="price">{formatNaira(pickerProduct.price)}</span>
                </div>
              </div>
              <div className="variant-options-group">
                <span className="variant-options-label">Available options</span>
                <div className="variant-options-grid" role="radiogroup">
                  {pickerProduct.variants.map((v) => {
                    const active = pickerVariant === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`variant-option-btn ${active ? "is-active" : ""}`}
                        onClick={() => setPickerVariant(v)}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
              <SheetFooter className="cart-sheet-footer">
               <Button
                  className="variant-picker-submit"
                  disabled={!pickerVariant}
                  onClick={() => {
                    if (pickerProduct && pickerVariant) {
                      addToCart(pickerProduct, pickerVariant);
                      setSelectedVariants((curr) => ({ ...curr, [pickerProduct.id]: pickerVariant }));
                      setPickerProduct(null);
                    }
                  }}
                >
                  Add {pickerVariant ? `(${pickerVariant}) ` : ""}to cart · {formatNaira(pickerProduct.price)}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>                                
      <Sheet open={cartOpen} onOpenChange={(open) => { setCartOpen(open); if (open) setOrder(null); }}>
        <SheetContent side="bottom" className="store-cart-sheet">
          {order ? (
            <>
              <SheetHeader className="cart-sheet-heading">
                <div className="order-success-icon"><CircleCheck aria-hidden="true" /></div>
                <p className="eyebrow">Order placed</p>
                <SheetTitle>Your order is with us.</SheetTitle>
                <SheetDescription>We’ve opened WhatsApp with your order details. Send the message to finish placing your order.</SheetDescription>
              </SheetHeader>
              <div className="order-invoice">
                <div className="invoice-order-ref"><span>Order reference</span><strong>{order.order_number}</strong></div>
                <div className="invoice-lines">
                  {order.items.map((line) => <div key={`${line.product.id}-${line.variant}`}><span>{line.product.name} <small>· {line.variant} × {line.quantity}</small></span><strong>{formatNaira(line.product.price * line.quantity)}</strong></div>)}
                  <div>
                    <span>Delivery · {order.delivery_zone}</span>
                    <strong>{getDeliveryFeeLabel(order.delivery_zone, order.delivery_fee)}</strong>
                  </div>
                </div>
                <div className="invoice-total">
                  <span>{order.delivery_fee === 0 ? "Total to transfer for items" : "Total to transfer"}</span>
                  <strong>{formatNaira(order.delivery_fee === 0 ? order.subtotal : order.total)}</strong>
                </div>
                <div className="bank-details"><div><span>Direct bank transfer</span><strong>{order.customer_name ? profile.bank_name : ""}</strong></div><div><div><strong className="bank-number">{profile.bank_account}</strong><span>{profile.bank_account_name}</span></div>
                <div className="payment-screenshot-notice">
                  <Camera aria-hidden="true" />
                  <div>
                    <strong>Payment proof required:</strong>
                    <span>Transfer to the account above and reply with your receipt/screenshot on WhatsApp to dispatch your order.</span>
                  </div>
                </div>
                  <Button variant="outline" size="icon" aria-label="Copy account number" onClick={() => void copyAccount()}>
                    {accountCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  </Button></div><small>Please confirm these details with the seller on WhatsApp before transferring.</small></div>
              </div>
              {isDemo && <p className="demo-transfer-note">Demo shop · sample transfer details only. Please don’t send money.</p>}
              <SheetFooter className="cart-sheet-footer">
                <Button variant="outline" asChild>
                  <a href={`/order/${order.order_number}`} target="_blank" rel="noreferrer">
                    Track receipt
                  </a>
                </Button>
                <Button variant="outline" onClick={goToOrder}>Back to the collection</Button>
                <Button asChild>
                  <a href={`https://wa.me/${(profile.whatsapp_phone || DEMO_VENDOR_PHONE).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    Open WhatsApp <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
              </SheetFooter>
            </>
          ) : (
            <>
              <SheetHeader className="cart-sheet-heading"><p className="eyebrow">Your order</p><SheetTitle>Your cart<span className="bag-heading-count"> · {itemCount || 0}</span></SheetTitle><SheetDescription>Review your items before checkout.</SheetDescription></SheetHeader>
              {cart.length ? (
                <div className="cart-lines">
                  {cart.map((line) => (
                    <div className="cart-line" key={`${line.product.id}-${line.variant}`}>
                      <img src={line.product.image_url} alt="" width={80} height={100} />
                      <div className="cart-line-info">
                        <h3>{line.product.name}</h3>
                        <span>{line.variant}</span>
                        <strong>{formatNaira(line.product.price)}</strong>
                        <div className="quantity-control">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Remove one ${line.product.name}`}
                            onClick={() => changeQuantity(line, -1)}
                          >
                            <Minus />
                          </Button>
                          <span>{line.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Add one ${line.product.name}`}
                            disabled={line.quantity >= line.product.stock}
                            onClick={() => changeQuantity(line, 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="remove-line"
                        aria-label={`Remove ${line.product.name} (${line.variant})`}
                        onClick={() =>
                          setCart((current) =>
                            current.filter(
                              (row) =>
                                !(
                                  row.product.id === line.product.id &&
                                  row.variant === line.variant
                                ),
                            ),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cart-empty">
                  <ShoppingBag />
                  <p>Your cart is empty.</p>
                  <Button variant="outline" onClick={() => setCartOpen(false)}>
                    Browse items
                  </Button>
                </div>
              )}
              {cart.length > 0 && <><div className="cart-subtotal"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div><p className="cart-delivery-note">Delivery is added when you choose your location.</p><SheetFooter className="cart-sheet-footer"><Button className="continue-checkout" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to delivery <ArrowRight aria-hidden="true" /></Button></SheetFooter></>}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="bottom" className="store-checkout-sheet">
          <SheetHeader className="cart-sheet-heading"><Button variant="ghost" size="icon" className="back-to-bag" aria-label="Back to cart" onClick={() => { setCheckoutOpen(false); setCartOpen(true); }}><ArrowLeft /></Button><p className="eyebrow">Nearly there</p><SheetTitle>Let’s get it to you.</SheetTitle><SheetDescription>We’ll confirm everything together on WhatsApp.</SheetDescription></SheetHeader>
           <div className="checkout-form">
            <label htmlFor="customer-name">Your name</label>
            <Input
              id="customer-name"
              placeholder="How should we address you?"
              autoComplete="name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />

            <label htmlFor="customer-phone">WhatsApp number</label>
            <Input
              id="customer-phone"
              placeholder="081 6132 3856"
              type="tel"
              autoComplete="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />

            <label htmlFor="delivery-zone">Delivery option / destination</label>
            <select
              id="delivery-zone"
              className="delivery-select"
              value={deliveryZone}
              onChange={(event) => setDeliveryZone(event.target.value)}
            >
              {Object.keys(profile.delivery_zones).map((zone) => {
                const fee = profile.delivery_zones[zone]?.fee ?? 0;
                return (
                  <option key={zone} value={zone}>
                    {zone} · {getDeliveryFeeLabel(zone, fee)}
                  </option>
                );
              })}
            </select>

            <label htmlFor="delivery-address">Street address & nearest landmark</label>
            <Textarea
              id="delivery-address"
              placeholder="e.g. 14 Adeola Odeku St, beside Zenith Bank, Victoria Island"
              autoComplete="street-address"
              rows={2}
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
            />
          </div>

          <div className="delivery-summary">
            <div>
              <span>Items subtotal</span>
              <strong>{formatNaira(subtotal)}</strong>
            </div>
            <div>
              <span>Delivery · {deliveryZone}</span>
              <strong>{getDeliveryFeeLabel(deliveryZone, deliveryFee)}</strong>
            </div>
            <div>
              <span>Total to transfer</span>
              <strong>{deliveryFee === 0 ? formatNaira(subtotal) : formatNaira(subtotal + deliveryFee)}</strong>
            </div>
            {deliveryFee === 0 && (
              <p className="delivery-policy-hint">
                {deliveryZone.toLowerCase().includes("park")
                  ? "📦 Pay the driver or loader directly when picking up your package at the motor park."
                  : deliveryZone.toLowerCase().includes("whatsapp") || deliveryZone.toLowerCase().includes("courier")
                  ? "💬 Dispatch fee will be calculated on WhatsApp based on your exact landmark."
                  : "🛵 Transfer the product cost now, and pay the dispatch rider directly at your doorstep."}
              </p>
            )}
          </div>
          <p className="transfer-disclaimer">You’ll transfer directly to the seller. We never hold your money.</p>
          <SheetFooter className="cart-sheet-footer">
            <Button
              className="continue-checkout"
              disabled={submittingOrder}
              onClick={() => void placeOrder()}
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" style={{ width: 15, height: 15, marginRight: 6 }} />
                  Preparing order…
                </>
              ) : (
                <>
                  Place order on WhatsApp <ArrowUpRight aria-hidden="true" />
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="mobile-bottom-bar">
        <Button variant="ghost" onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })}>
          <Menu />Collection
        </Button>
        <Button variant="ghost" onClick={() => document.getElementById("our-note")?.scrollIntoView({ behavior: "smooth" })}>
          <Sparkles />Our note
        </Button>
        <Button variant="ghost" onClick={() => { setOrder(null); setCartOpen(true); }}>
          <ShoppingBag />Cart{itemCount ? ` · ${itemCount}` : ""}
        </Button>
      </div>
    </div>
  );
}
