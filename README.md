# Market on WhatsApp

Build a mobile-first WhatsApp catalog and order-taking web app for social commerce vendors (Instagram, TikTok, and WhatsApp sellers) that operates without holding funds or needing regulatory licenses.

Ensure the design feels human, polished, authentic, and deliberate—never robotic or vibe-coded. Use sharp mobile-first layouts, realistic Naira (₦) currency formatting, smooth micro-interactions, and practical local touches (Lagos Mainland/Island delivery zones, direct bank transfer info).

Core features:
1. Customer Storefront (Public link):
- Vendor profile with profile photo, bio, verified badge, and quick social links (WhatsApp, Instagram).
- Product catalog categorized cleanly (e.g. Best Sellers, New Arrivals, Sale) with high-quality item photos, variants (size, color), pricing in Naira, and real-time stock counters.
- Smooth mobile bottom sheet / drawer cart.
- One-tap checkout: Customer enters name, phone number, and picks their delivery location (e.g., Lagos Mainland, Lagos Island, Outside Lagos) with automatically added delivery fee.
- Direct WhatsApp Order button: formats a clean, itemized WhatsApp message with order ID, customer details, delivery location, items, total, and vendor's bank transfer details, then opens WhatsApp directly to the vendor with pre-filled message text.
- Clean order confirmation screen showing the invoice and copyable bank account number.

2. Vendor Dashboard:
- Quick catalog management: easily add, edit, or hide products with photos, prices, and stock quantities.
- Delivery settings: define custom delivery zones and flat delivery rates.
- Payment settings: input bank name, account number, and account name displayed to customers for direct transfer.
- Order manager: view incoming orders, search by customer or order ID, filter by status (Pending Confirmation, Paid, Dispatched, Delivered), and send status updates.
- Usage & Monetization: show monthly orders count with a free tier (up to 30 orders/month) and upgrade options (₦500 for 50 order credits or ₦2,000/month unlimited).
- Share store link feature with copyable URL and QR code.

Seed the app with realistic sample data for a trending Nigerian fashion and accessories store (e.g. 'Aura Threads') so it is immediately interactive and ready to explore.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27c8045e-fa98-440c-b15d-3a1a17eaba0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
