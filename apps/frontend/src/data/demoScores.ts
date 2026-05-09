import type { LensId, Scores } from "@/lib/review/types";

// Pre-computed scores for the cached demo PR under each preset lens.
// Designed so the three lenses pick a different file as #1:
//   money        → src/billing/payment.ts (charge logic)
//   architecture → src/cart/pricing.ts    (public API rewrite)
//   tests        → tests/cart.test.ts     (assertions weakened, edge cases dropped)

const HUNK_FILES: Record<string, string> = {
  "billing-payment-1": "src/billing/payment.ts",
  "cart-pricing-1": "src/cart/pricing.ts",
  "cart-pricing-2": "src/cart/pricing.ts",
  "cart-coupon-1": "src/cart/coupon.ts",
  "cart-test-1": "tests/cart.test.ts",
  "readme-1": "README.md",
};

function aggregate(perHunk: Scores["perHunk"]): Scores["perFile"] {
  const buckets = new Map<string, number[]>();
  for (const h of perHunk) {
    const arr = buckets.get(h.file) ?? [];
    arr.push(h.score);
    buckets.set(h.file, arr);
  }
  const result: Scores["perFile"] = [];
  for (const [path, arr] of buckets.entries()) {
    result.push({
      path,
      max_score: Math.max(...arr),
      avg_score: arr.reduce((s, x) => s + x, 0) / arr.length,
      hunk_count: arr.length,
    });
  }
  return result;
}

function makeScores(
  summary: string,
  perHunkRaw: Array<{
    hunk_id: string;
    score: number;
    reasons: string;
    tags: string[];
    line_start?: number;
    line_end?: number;
  }>,
  crossCutting?: Scores["crossCutting"],
): Scores {
  const perHunk: Scores["perHunk"] = perHunkRaw.map((h) => ({
    hunk_id: h.hunk_id,
    file: HUNK_FILES[h.hunk_id] ?? "",
    line_start: h.line_start ?? 0,
    line_end: h.line_end ?? 0,
    score: h.score,
    reasons: h.reasons,
    tags: h.tags,
  }));
  return {
    summary,
    perHunk,
    perFile: aggregate(perHunk),
    crossCutting,
    status: "idle",
  };
}

export const demoScores: Record<LensId, Scores> = {
  money: makeScores(
    "Charge path now branches on coupon presence and a rounding change in the fee calc — both money-touching. Cart pricing rewrite affects what gets charged but inherits the new fee logic.",
    [
      {
        hunk_id: "billing-payment-1",
        score: 9.5,
        reasons:
          "Touches the live charge path. Rounding switched from Math.round to Math.floor, which systematically biases fees down and may breach merchant agreements. Also adds a new branch (chargeWithCoupon) that bypasses the standard charge call entirely.",
        tags: ["money", "rounding", "charge-path", "stripe"],
      },
      {
        hunk_id: "cart-pricing-1",
        score: 6.5,
        reasons:
          "Public pricing function now returns {subtotal, discount, total}. Downstream charge logic depends on this — any mismatch means wrong amounts billed.",
        tags: ["money", "public-api"],
      },
      {
        hunk_id: "cart-pricing-2",
        score: 5.0,
        reasons:
          "applyCoupon clamps flat-coupon value at subtotal, but no test confirms it doesn't go negative when used with stacked discounts.",
        tags: ["money", "discount-math"],
      },
      {
        hunk_id: "cart-coupon-1",
        score: 4.0,
        reasons:
          "New coupon table read; lookup returns null past expiry. Doesn't itself touch money but unlocks discount paths.",
        tags: ["coupon"],
      },
      {
        hunk_id: "cart-test-1",
        score: 3.0,
        reasons:
          "Removed assertions on charge-relevant edge cases (negative prices, 100%-off coupons) — adjacent to money concerns but secondary.",
        tags: ["tests"],
      },
      {
        hunk_id: "readme-1",
        score: 0.5,
        reasons: "Documentation only.",
        tags: ["docs"],
      },
    ],
    [
      {
        title: "Coupon flow bypasses standard charge path",
        files: ["src/billing/payment.ts", "src/cart/pricing.ts"],
        why: "chargeCart now early-returns into chargeWithCoupon when cart.coupon is set; receipts and audit logs may take a different path than non-coupon charges.",
      },
    ],
  ),
  architecture: makeScores(
    "Public pricing API changed shape — return type went from number to a struct. Downstream callers that destructure or compare against numeric subtotal will break.",
    [
      {
        hunk_id: "cart-pricing-1",
        score: 9.0,
        reasons:
          "Public exported function changed return type from `number` to `PriceResult`. Every caller in the codebase needs to adapt. Adds a new exported `PriceResult` interface, expanding the public surface.",
        tags: ["public-api", "breaking-change", "exported-type"],
      },
      {
        hunk_id: "cart-coupon-1",
        score: 7.5,
        reasons:
          "Brand new public module exposing `Coupon`, `CouponType`, `lookupCoupon`. Couples cart with the coupon table directly — consider whether a coupon repository abstraction belongs in cart or in billing.",
        tags: ["public-api", "module-coupling"],
      },
      {
        hunk_id: "cart-pricing-2",
        score: 7.0,
        reasons:
          "applyCoupon is unexported but reaches across coupon types; switch on coupon.type with a fallthrough that returns 0 silently — risk of new coupon types being added without compiler help.",
        tags: ["module-internal"],
      },
      {
        hunk_id: "billing-payment-1",
        score: 5.5,
        reasons:
          "Adds a branch into a new function (chargeWithCoupon) without showing where it lives — likely in another file, increasing cross-module coupling between billing and cart.",
        tags: ["coupling"],
      },
      {
        hunk_id: "cart-test-1",
        score: 3.5,
        reasons: "Test cleanup; minor.",
        tags: ["tests"],
      },
      {
        hunk_id: "readme-1",
        score: 1.0,
        reasons: "Documentation only.",
        tags: ["docs"],
      },
    ],
    [
      {
        title: "Public surface widened in cart module",
        files: ["src/cart/pricing.ts", "src/cart/coupon.ts"],
        why: "Two newly exported types (PriceResult, Coupon, CouponType) and one new exported function (lookupCoupon). External callers now have more shapes to track.",
      },
    ],
  ),
  tests: makeScores(
    "Three test cases removed and one assertion weakened in tests/cart.test.ts. Two of the removed tests covered edge cases that the diff itself touches (negative prices, 100% off).",
    [
      {
        hunk_id: "cart-test-1",
        score: 9.0,
        reasons:
          "Three tests removed: 'throws on negative price', '100% off coupons not negative', and a deep-equal assertion downgraded to a single field check. The diff modifies pricing logic that the deleted tests directly covered.",
        tags: ["test-removed", "weakened-assertion", "edge-cases"],
      },
      {
        hunk_id: "cart-pricing-1",
        score: 4.5,
        reasons:
          "Public function signature changed but no new tests for the new struct return shape.",
        tags: ["missing-coverage"],
      },
      {
        hunk_id: "cart-pricing-2",
        score: 4.5,
        reasons:
          "applyCoupon returns 0 for unknown coupon types — no test asserts unknown types are rejected, so future coupon types will silently no-op.",
        tags: ["missing-coverage", "silent-fallback"],
      },
      {
        hunk_id: "cart-coupon-1",
        score: 4.0,
        reasons:
          "New module with no co-located unit tests. lookupCoupon's expiry comparison uses Date.now via new Date — needs tests for tz/clock-skew edge cases.",
        tags: ["missing-coverage"],
      },
      {
        hunk_id: "billing-payment-1",
        score: 4.5,
        reasons:
          "Math.round → Math.floor change is exactly the kind of off-by-one that a property test would catch — but no new test was added.",
        tags: ["missing-coverage", "rounding"],
      },
      {
        hunk_id: "readme-1",
        score: 0.5,
        reasons: "Documentation only.",
        tags: ["docs"],
      },
    ],
    [
      {
        title: "Edge-case coverage shrunk just as code changed",
        files: ["tests/cart.test.ts", "src/cart/pricing.ts", "src/billing/payment.ts"],
        why: "Removed tests cover negative prices, 100%-off coupons, and exact-shape checks — exactly the surfaces the production diff modifies.",
      },
    ],
  ),
  custom: makeScores("Custom lens not yet computed.", []),
};
