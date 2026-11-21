import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Camera, 
  Check, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Package, 
  Phone, 
  Truck 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, getDeliveryFeeLabel } from "@/lib/shop";
import { Button } from "@/components/ui/button";

interface TrackingData {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    delivery_zone: string;
    delivery_address?: string;
    delivery_fee: number;
    subtotal: number;
    total: number;
    status: string;
  };
  vendor: {
    store_name: string;
    store_slug?: string;
    bank_name: string;
    bank_account: string;
    bank_account_name: string;
    whatsapp_phone?: string;
    store_theme?: string;
  };
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    variant?: string;
  }>;
}

export const Route = createFileRoute("/order/$orderNumber")({
  head: () => ({
    meta: [
      { title: "Track Your Order — SendCart" },
      { name: "description", content: "Check your order receipt, live status, and vendor transfer details on SendCart." },
      { property: "og:title", content: "Track Your Order — SendCart" },
      { property: "og:description", content: "Check your order receipt, live status, and vendor transfer details on SendCart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { orderNumber } = Route.useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      try {
        setLoading(true);
        const { data: res, error } = await supabase.rpc("get_public_order_tracking", {
          p_order_number: orderNumber,
        });

        if (error) throw error;
        if (isMounted) {
          setData(res as unknown as TrackingData);
        }
      } catch (err) {
        console.error("Order lookup error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderNumber]);

  const copyAccount = async () => {
    if (!data?.vendor.bank_account) return;
    try {
      await navigator.clipboard.writeText(data.vendor.bank_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Account number copied");
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };

  if (loading) {
    return (
      <main className="order-tracking-shell">
        <div className="order-tracking-card loading-card">
          <p className="eyebrow">SendCart</p>
          <h2>Looking up order {orderNumber}…</h2>
          <p className="tracking-subtext">Fetching latest status from the seller.</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="order-tracking-shell">
        <div className="order-tracking-card not-found-card">
          <p className="eyebrow">Order not found</p>
          <h2>We couldn’t find order #{orderNumber}</h2>
          <p className="tracking-subtext">Please double-check the order reference or contact the vendor on WhatsApp.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Back to SendCart</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { order, vendor, items } = data;
  const isZeroFee = order.delivery_fee === 0;
  const feeLabel = getDeliveryFeeLabel(order.delivery_zone, order.delivery_fee);
  const whatsappNumber = (vendor.whatsapp_phone || "").replace(/\D/g, "");

  // Status mapping
  const normalizedStatus = (order.status || "").toLowerCase();
  const stepIndex = normalizedStatus.includes("deliver")
    ? 3
    : normalizedStatus.includes("dispatch")
    ? 2
    : normalizedStatus.includes("paid") || normalizedStatus.includes("confirm")
    ? 1
    : 0;

  const steps = [
    { label: "Order Placed", icon: Clock },
    { label: "Payment Confirmed", icon: CheckCircle2 },
    { label: "Dispatched", icon: Truck },
    { label: "Delivered", icon: Package },
  ];

  return (
    <main className="order-tracking-shell" data-theme={vendor.store_theme || "editorial"}>
      <div className="order-tracking-container">
        <nav className="tracking-top-nav">
          {vendor.store_slug ? (
            <Link to="/s/$storeSlug" params={{ storeSlug: vendor.store_slug }} className="tracking-back-link">
              <ArrowLeft aria-hidden="true" className="w-4 h-4" /> Back to {vendor.store_name}
            </Link>
          ) : (
            <Link to="/" className="tracking-back-link">
              <ArrowLeft aria-hidden="true" className="w-4 h-4" /> SendCart Home
            </Link>
          )}
          <span className="order-status-badge badge-active">{order.status || "Pending Confirmation"}</span>
        </nav>

        <header className="order-tracking-header">
          <p className="eyebrow">Order Receipt & Tracking</p>
          <h1>Order #{order.order_number}</h1>
          <p className="order-date-line">Placed with {vendor.store_name} on {new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
        </header>

        {/* Status Stepper */}
        <section className="order-stepper-card">
          <h2 className="card-section-title">Order Status</h2>
          <div className="tracking-stepper">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isPassed = idx <= stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div key={step.label} className={`stepper-node ${isPassed ? "node-passed" : ""} ${isCurrent ? "node-current" : ""}`}>
                  <div className="node-icon-circle">
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <span className="node-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bank Transfer Details */}
        {vendor.bank_account && (
          <section className="tracking-bank-card">
            <h2 className="card-section-title">Direct Bank Transfer Details</h2>
            <div className="bank-details-box">
              <div className="bank-info-row">
                <span>Bank:</span>
                <strong>{vendor.bank_name}</strong>
              </div>
              <div className="bank-info-row">
                <span>Account Number:</span>
                <div className="bank-copy-group">
                  <strong className="tracking-acct-num">{vendor.bank_account}</strong>
                  <Button variant="outline" size="sm" onClick={() => void copyAccount()} aria-label="Copy account number">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>
              <div className="bank-info-row">
                <span>Account Name:</span>
                <strong>{vendor.bank_account_name}</strong>
              </div>
            </div>

            <div className="payment-screenshot-notice">
              <Camera aria-hidden="true" />
              <div>
                <strong>Payment proof required:</strong>
                <span>Transfer the exact total and send your receipt screenshot to the vendor on WhatsApp for confirmation.</span>
              </div>
            </div>
          </section>
        )}

        {/* Itemized Invoice */}
        <section className="order-summary-card">
          <h2 className="card-section-title">Purchased Items</h2>
          <div className="tracking-lines">
            {items.map((item) => (
              <div key={item.id} className="tracking-line">
                <div>
                  <strong>{item.product_name}</strong>
                  {item.variant && <span className="item-variant-tag">· {item.variant}</span>}
                  <small>Qty: {item.quantity}</small>
                </div>
                <span>{formatNaira(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="tracking-cost-breakdown">
            <div className="cost-row">
              <span>Subtotal</span>
              <strong>{formatNaira(order.subtotal)}</strong>
            </div>
            <div className="cost-row">
              <span>Delivery ({order.delivery_zone})</span>
              <strong>{feeLabel}</strong>
            </div>
            <div className="cost-row total-row">
              <span>{isZeroFee ? "Total to transfer for items" : "Total to transfer"}</span>
              <strong>{formatNaira(isZeroFee ? order.subtotal : order.total)}</strong>
            </div>
          </div>
        </section>

        {/* Delivery Destination */}
        <section className="order-destination-card">
          <h2 className="card-section-title">Delivery Details</h2>
          <p><strong>Customer:</strong> {order.customer_name} ({order.customer_phone})</p>
          <p><strong>Zone:</strong> {order.delivery_zone}</p>
          {order.delivery_address && (
            <p><strong>Address & Landmark:</strong> {order.delivery_address}</p>
          )}
        </section>

        {/* WhatsApp Action */}
        {whatsappNumber && (
          <div className="tracking-actions">
            <Button asChild size="lg" className="w-full">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${vendor.store_name}, I'm tracking order #${order.order_number}.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Phone className="w-4 h-4 mr-2" /> Message Seller on WhatsApp <ArrowUpRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
