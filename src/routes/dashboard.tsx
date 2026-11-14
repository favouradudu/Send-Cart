import { createFileRoute } from "@tanstack/react-router";
import { VendorDashboard } from "@/components/VendorDashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your shop dashboard — Aura Threads" },
      { name: "description", content: "Manage your products, orders, delivery areas and shop details in one place." },
      { property: "og:title", content: "Your shop dashboard — Aura Threads" },
      { property: "og:description", content: "Manage your products, orders, delivery areas and shop details in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendorDashboard,
});