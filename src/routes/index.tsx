import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Smartphone, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SendCart — Turn WhatsApp into your online store" },
      { name: "description", content: "The simple order-taking catalog for Nigerian social sellers. Direct bank transfers, automated WhatsApp order receipts, and zero commission fees." },
      { property: "og:title", content: "SendCart — Turn WhatsApp into your online store" },
      { property: "og:description", content: "The simple order-taking catalog for Nigerian social sellers. Direct bank transfers, automated WhatsApp order receipts, and zero commission fees." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-logo">SendCart</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/s/sendcart" className="landing-nav-link">
            See Example Store
          </Link>
          <Link to="/dashboard" className="landing-nav-btn">
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="landing-pill">
          <Sparkles size={14} />
          <span>Made for Nigerian Instagram & WhatsApp Sellers</span>
        </div>

        <h1 className="landing-title">
          Stop losing sales in the DMs.<br />
          <em>Turn WhatsApp into your storefront.</em>
        </h1>

        <p className="landing-subtitle">
          Give your buyers a fast, mobile catalog with one-tap WhatsApp checkout, custom delivery zones, and verified direct bank transfers. Zero commission fees.
        </p>

        <div className="landing-cta-group">
          <Link to="/dashboard" className="landing-primary-btn">
            Create Your Store — Free
            <ArrowRight size={18} />
          </Link>
          <Link to="/s/sendcart" className="landing-secondary-btn">
            <Store size={18} />
            Explore Example Store
          </Link>
        </div>

        <p className="landing-footnote">
          Free Starter plan includes up to 8 active products and 30 orders every month. No credit card required.
        </p>

        {/* Feature Highlights Grid */}
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <Smartphone size={22} />
            </div>
            <h3>1-Link Mobile Catalog</h3>
            <p>
              Paste your custom SendCart link in your Instagram bio, TikTok, or WhatsApp status. Fast, light, and optimized for Nigerian mobile data.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <ShieldCheck size={22} />
            </div>
            <h3>Direct Bank Transfers</h3>
            <p>
              Buyers pay 100% directly into your verified bank account (Access, GTB, Moniepoint, OPay). We never touch or hold your money.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <CheckCircle2 size={22} />
            </div>
            <h3>Itemised WhatsApp Orders</h3>
            <p>
              Receive ready-to-dispatch order tickets on WhatsApp with exact customer address, phone number, delivery fee, and transfer proof.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <strong>SendCart</strong> · The independent social commerce tool
        </div>
        <div className="landing-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/dashboard">Merchant Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
