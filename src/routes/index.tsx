import { createFileRoute } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";
import { DEMO_SLUG } from "@/lib/shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura Threads — Good things, meant to be worn" },
      { name: "description", content: "Shop thoughtful Lagos style from Aura Threads. Choose your pieces and order direct on WhatsApp." },
      { property: "og:title", content: "Aura Threads — Good things, meant to be worn" },
      { property: "og:description", content: "Shop thoughtful Lagos style from Aura Threads. Choose your pieces and order direct on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Storefront storeSlug={DEMO_SLUG} />,
});