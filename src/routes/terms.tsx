import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SendCart" },
      { name: "description", content: "Terms of Service, subscription pricing, and policies for SendCart social commerce software." },
      { property: "og:title", content: "Terms of Service — SendCart" },
      { property: "og:description", content: "Terms of Service, subscription pricing, and policies for SendCart social commerce software." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="legal-page min-h-screen bg-background text-foreground">
      <header className="legal-header">
        <Link to="/" className="brand-wordmark">
          send<span>cart</span>
        </Link>
        <Link to="/" className="legal-back-link">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
      </header>

      <main className="legal-container">
        <div className="legal-intro">
          <p className="eyebrow">Legal & Compliance</p>
          <h1>Terms of Service</h1>
          <p className="legal-effective">Effective Date: November 2026 · Lagos, Nigeria</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Nature of the Service (Software as a Service)</h2>
            <p>
              SendCart (operated via <strong>sendcart.lovable.app</strong>) provides self-service software 
              for social commerce vendors, online retailers, and direct-to-consumer merchants in Nigeria. 
              Our software enables vendors to create digital product catalogs, organize inventory, manage 
              delivery zones, and generate formatted WhatsApp order slips for their buyers.
            </p>
            <div className="legal-highlight-box">
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              <div>
                <strong>Important Non-Financial & Non-Custodial Disclaimer:</strong>
                <p>
                  SendCart is strictly a software provider. SendCart is <strong>not a bank, payment service 
                  provider (PSSP), money operator, or financial intermediary</strong>. SendCart never holds, 
                  pools, escrows, or routes customer-to-vendor retail funds. All payments for catalog products 
                  are conducted directly between the customer and the vendor via direct bank transfer or 
                  payment upon delivery.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>2. Vendor Accounts & Eligibility</h2>
            <p>
              To use SendCart to manage a store, vendors must create an account with a valid email address. 
              Vendors agree to provide accurate business, banking, and contact details. Vendors are solely 
              responsible for the accuracy of their bank account numbers, pricing, product descriptions, 
              and stock availability displayed to customers.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Software Subscription Plans & Fees</h2>
            <p>
              SendCart charges vendors directly for access to our catalog and order-management software. 
              Our pricing structure is as follows:
            </p>
            <ul className="legal-list">
              <li><strong>Starter Free Plan:</strong> Up to 30 customer orders per calendar month at ₦0.</li>
              <li><strong>Order Credits Top-Up:</strong> ₦500 one-off payment for an additional 50 order credits. Credits never expire.</li>
              <li><strong>Unlimited Monthly Plan:</strong> ₦2,000 per month for unlimited order processing and priority software updates.</li>
            </ul>
            <p>
              Subscription fees cover software hosting, storage, and platform maintenance only. SendCart 
              does not take any percentage fee or commission on retail orders placed between buyers and vendors.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Cancellation & Refund Policy</h2>
            <p>
              Vendors on paid monthly plans may cancel their subscription at any time directly through the 
              vendor dashboard. Upon cancellation, the store remains active on the unlimited tier until the 
              end of the current billing cycle, after which it reverts to the standard free tier.
            </p>
            <p>
              Because order credits and software subscriptions are digital services provisioned immediately 
              upon payment, fees paid for activated monthly plans or consumed credit packages are generally 
              non-refundable. If you experience an unintended duplicate charge or billing error, contact our 
              support team within 7 business days for a full refund.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Prohibited Goods & Merchant Conduct</h2>
            <p>Vendors may not use SendCart to list or sell:</p>
            <ul className="legal-list">
              <li>Counterfeit, replicated, or pirated goods.</li>
              <li>Illegal drugs, narcotics, or unregulated prescription pharmaceuticals.</li>
              <li>Firearms, weapons, or explosives.</li>
              <li>Pyramid schemes, unlicensed financial investments, or fraudulent activities.</li>
            </ul>
            <p>
              SendCart reserves the right to suspend or terminate any store violating these guidelines 
              or Nigerian commercial law without prior notice.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Contact & Support</h2>
            <p>For questions regarding these Terms or subscription billing, reach out to us:</p>
            <div className="legal-contact-card">
              <Mail className="h-4 w-4" />
              <span>Support Email: <strong>support@sendcart.ng</strong></span>
            </div>
            <p className="legal-location">SendCart Technologies · Lagos, Nigeria</p>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} SendCart. All rights reserved.</span>
        <div className="legal-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/dashboard">Vendor Login</Link>
        </div>
      </footer>
    </div>
  );
}
