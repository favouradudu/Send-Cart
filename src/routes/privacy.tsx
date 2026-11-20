import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SendCart" },
      { name: "description", content: "Privacy policy and data protection guidelines for SendCart users and shoppers." },
      { property: "og:title", content: "Privacy Policy — SendCart" },
      { property: "og:description", content: "Privacy policy and data protection guidelines for SendCart users and shoppers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
          <p className="eyebrow">Privacy & Security</p>
          <h1>Privacy Policy</h1>
          <p className="legal-effective">Effective Date: November 2026 · Lagos, Nigeria</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>
              SendCart is committed to protecting your privacy in full compliance with the 
              <strong> Nigeria Data Protection Act (NDPA)</strong>. We collect only the minimum 
              information necessary to operate the platform:
            </p>
            <ul className="legal-list">
              <li><strong>Vendor Account Data:</strong> Email address, store name, phone number, and vendor bank account details (for display on invoice receipts).</li>
              <li><strong>Catalog Data:</strong> Product names, prices, descriptions, and uploaded store images.</li>
              <li><strong>Order Data:</strong> Customer name, delivery phone number, delivery address/landmark, and selected items required to create the WhatsApp order record.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use collected data solely to:</p>
            <ul className="legal-list">
              <li>Host and display the vendor’s public storefront and catalog.</li>
              <li>Generate accurate order summaries and WhatsApp pre-filled messages for buyers.</li>
              <li>Maintain order logs so vendors can track, pack, and dispatch customer shipments.</li>
              <li>Process vendor subscription renewals and prevent fraudulent abuse.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Non-Sale of Personal Data</h2>
            <p>
              SendCart <strong>does not sell, rent, or monetize</strong> vendor or customer personal 
              information to third-party data brokers or advertisers. Customer order details are accessible 
              only by the specific merchant from whom the customer made a purchase.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Security & Data Retention</h2>
            <p>
              All transmission of user data is encrypted using standard Transport Layer Security (TLS/HTTPS). 
              Order records are retained securely to allow merchants to audit their business records. Vendors 
              may request deletion of their account and associated catalog items at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Contact Our Privacy Team</h2>
            <p>If you have any questions or requests regarding your personal data:</p>
            <div className="legal-contact-card">
              <Mail className="h-4 w-4" />
              <span>
                Email:{" "}
                <a
                  href="mailto:favouradudu33@gmail.com"
                  style={{ textDecoration: "underline", color: "inherit" }}
                >
                  <strong>favouradudu33@gmail.com</strong>
                </a>
              </span>
            </div>
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
