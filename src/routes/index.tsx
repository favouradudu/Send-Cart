import { createFileRoute } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";
import { DEMO_SLUG } from "@/lib/shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SendCart — Good things, meant to be ordered" },
      { name: "description", content: "Shop direct from your favorite social vendors. Choose your pieces and order direct on WhatsApp with SendCart." },
      { property: "og:title", content: "SendCart — Good things, meant to be ordered" },
      { property: "og:description", content: "Shop direct from your favorite social vendors. Choose your pieces and order direct on WhatsApp with SendCart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Storefront storeSlug={DEMO_SLUG} />,
});
