import { createFileRoute } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/s/$storeSlug")({
  head: () => ({
    meta: [
      { title: "Shop thoughtful Lagos style — Aura Threads" },
      { name: "description", content: "Discover the latest pieces and place your order directly with Aura Threads on WhatsApp." },
      { property: "og:title", content: "Shop thoughtful Lagos style — Aura Threads" },
      { property: "og:description", content: "Discover the latest pieces and place your order directly with Aura Threads on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreRoute,
});

function StoreRoute() {
  const { storeSlug } = Route.useParams();
  return <Storefront storeSlug={storeSlug} />;
}