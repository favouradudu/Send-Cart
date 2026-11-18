import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderMessage, creditPackCount, creditPackPrice, formatNaira, isFreeOrderBlocked, monthlyOrderLimit, unlimitedMonthlyPrice } from "@/lib/shop";

describe("Nigerian shop order rules", () => {
  it("formats naira totals with Nigerian thousands separators", () => {
    expect(formatNaira(48500)).toBe("₦48,500");
  });

  it("allows the first 30 free monthly orders and blocks the 31st without credits", () => {
    expect(isFreeOrderBlocked(monthlyOrderLimit - 1, 0)).toBe(false);
    expect(isFreeOrderBlocked(30, 0)).toBe(true);
    expect(isFreeOrderBlocked(30, 1)).toBe(false);
  });

  it("keeps the selected order upgrade amounts", () => {
    expect([creditPackPrice, creditPackCount, unlimitedMonthlyPrice]).toEqual([500, 50, 2000]);
  });

  it("puts the customer, delivery, itemised total, and bank details into the WhatsApp message", () => {
    const message = buildWhatsAppOrderMessage({
      orderNumber: "SC-ORD-1234ABCD",
      customerName: "Ada",
      customerPhone: "08012345678",
      deliveryZone: "Lagos Mainland",
      items: [{ name: "Linen Set", quantity: 1, unitPrice: 48500, variant: "M" }],
      subtotal: 48500,
      deliveryFee: 2500,
      total: 51000,
      bankName: "Access Bank",
      bankAccount: "0123456789",
      bankAccountName: "Aura Threads",
    });

    expect(message).toContain("SC-ORD-1234ABCD");
    expect(message).toContain("Ada");
    expect(message).toContain("Lagos Mainland");
    expect(message).toContain("Linen Set (M) × 1 — ₦48,500");
    expect(message).toContain("Total: ₦51,000");
    expect(message).toContain("Access Bank · 0123456789");
  });
});
