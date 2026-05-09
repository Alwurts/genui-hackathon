"""Mock PR + diff data for the demo.

Mirrors the TS demo in apps/frontend/src/data/demoPR.ts so the agent can
load a known PR shape without hitting GitHub. The agent then scores the
diff itself via LLM reasoning and calls the frontend `setScores` tool —
that's the part we want to demonstrate, so we deliberately do NOT mock
the scores.
"""

from __future__ import annotations

from typing import Any


DEMO_PR: dict[str, Any] = {
    "url": "https://github.com/Alwurts/demo-shop/pull/42",
    "title": "feat: coupon codes + refactor cart pricing",
    "author": "alwurts",
    "base": "main",
    "head": "feat/coupons",
    "files_changed": 5,
    "additions": 76,
    "deletions": 41,
}


DEMO_DIFF: dict[str, Any] = {
    "files": [
        {
            "path": "src/billing/payment.ts",
            "hunks": [
                {
                    "hunk_id": "billing-payment-1",
                    "header": "@@ -42,9 +42,11 @@ export async function chargeCart(cart: Cart) {",
                    "lines": [
                        {"type": " ", "content": "export async function chargeCart(cart: Cart) {"},
                        {"type": " ", "content": "  const subtotal = cart.lines.reduce((s, l) => s + l.price * l.qty, 0);"},
                        {"type": "-", "content": "  const fee = Math.round(subtotal * 0.029);"},
                        {"type": "+", "content": "  const fee = Math.floor(subtotal * 0.029);"},
                        {"type": " ", "content": "  const total = subtotal + fee;"},
                        {"type": "+", "content": "  if (cart.coupon) {"},
                        {"type": "+", "content": "    return chargeWithCoupon(cart, total);"},
                        {"type": "+", "content": "  }"},
                        {"type": " ", "content": "  return stripe.charges.create({ amount: total, currency: cart.currency });"},
                        {"type": " ", "content": "}"},
                    ],
                }
            ],
        },
        {
            "path": "src/cart/pricing.ts",
            "hunks": [
                {
                    "hunk_id": "cart-pricing-1",
                    "header": "@@ -1,8 +1,12 @@ // public pricing API",
                    "lines": [
                        {"type": "-", "content": "export function priceCart(lines: Line[]): number {"},
                        {"type": "+", "content": "export interface PriceResult { subtotal: number; discount: number; total: number; }"},
                        {"type": "+", "content": ""},
                        {"type": "+", "content": "export function priceCart(lines: Line[], coupon?: Coupon): PriceResult {"},
                        {"type": " ", "content": "  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);"},
                        {"type": "-", "content": "  return subtotal;"},
                        {"type": "+", "content": "  const discount = coupon ? applyCoupon(subtotal, coupon) : 0;"},
                        {"type": "+", "content": "  return { subtotal, discount, total: subtotal - discount };"},
                        {"type": " ", "content": "}"},
                    ],
                },
                {
                    "hunk_id": "cart-pricing-2",
                    "header": "@@ -22,4 +26,12 @@ function applyDiscount(amount: number, pct: number) {",
                    "lines": [
                        {"type": " ", "content": "function applyDiscount(amount: number, pct: number) {"},
                        {"type": " ", "content": "  return Math.round(amount * pct);"},
                        {"type": " ", "content": "}"},
                        {"type": "+", "content": ""},
                        {"type": "+", "content": "function applyCoupon(subtotal: number, coupon: Coupon): number {"},
                        {"type": "+", "content": "  if (coupon.type === 'percent') return applyDiscount(subtotal, coupon.value / 100);"},
                        {"type": "+", "content": "  if (coupon.type === 'flat') return Math.min(coupon.value, subtotal);"},
                        {"type": "+", "content": "  return 0;"},
                        {"type": "+", "content": "}"},
                    ],
                },
            ],
        },
        {
            "path": "src/cart/coupon.ts",
            "hunks": [
                {
                    "hunk_id": "cart-coupon-1",
                    "header": "@@ -0,0 +1,18 @@",
                    "lines": [
                        {"type": "+", "content": "export type CouponType = 'percent' | 'flat';"},
                        {"type": "+", "content": ""},
                        {"type": "+", "content": "export interface Coupon {"},
                        {"type": "+", "content": "  code: string;"},
                        {"type": "+", "content": "  type: CouponType;"},
                        {"type": "+", "content": "  value: number;"},
                        {"type": "+", "content": "  expiresAt: string;"},
                        {"type": "+", "content": "}"},
                    ],
                }
            ],
        },
        {
            "path": "tests/cart.test.ts",
            "hunks": [
                {
                    "hunk_id": "cart-test-1",
                    "header": "@@ -15,12 +15,8 @@ describe('priceCart', () => {",
                    "lines": [
                        {"type": " ", "content": "  it('returns subtotal for empty coupon', () => {"},
                        {"type": " ", "content": "    const r = priceCart([{ price: 100, qty: 2 }]);"},
                        {"type": "-", "content": "    expect(r).toEqual({ subtotal: 200, discount: 0, total: 200 });"},
                        {"type": "+", "content": "    expect(r.total).toBe(200);"},
                        {"type": " ", "content": "  });"},
                        {"type": "-", "content": "  it('throws on negative price', () => {"},
                        {"type": "-", "content": "    expect(() => priceCart([{ price: -1, qty: 1 }])).toThrow();"},
                        {"type": "-", "content": "  });"},
                    ],
                }
            ],
        },
        {
            "path": "README.md",
            "hunks": [
                {
                    "hunk_id": "readme-1",
                    "header": "@@ -10,6 +10,8 @@ ## Features",
                    "lines": [
                        {"type": " ", "content": "- product catalog"},
                        {"type": " ", "content": "- shopping cart"},
                        {"type": "+", "content": "- coupon codes (percent + flat)"},
                        {"type": " ", "content": "- stripe checkout"},
                    ],
                }
            ],
        },
    ],
}
