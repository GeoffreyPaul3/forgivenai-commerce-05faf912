import { useMemo } from "react";
import { getOnboardingState } from "@/pages/dashboard/agent/onboarding/hooks/useOnboardingState";

interface Product {
  id: string;
  name: string;
  category?: string;
  stock_quantity?: number;
  status?: string;
  price?: number;
  discount_price?: number;
  [key: string]: unknown;
}

interface RecommendedProduct extends Product {
  score: number;
  reason: string;
}

/**
 * Ranks products based on agent profile signals from onboarding state.
 * Pure scoring — no new API calls. Works on top of the existing products query result.
 */
export function useRecommendedProducts(
  products: Product[] | undefined | null,
  userId: string,
  maxResults = 6
): RecommendedProduct[] {
  return useMemo(() => {
    if (!products?.length) return [];

    const state = getOnboardingState(userId);
    const preferredCategories = state?.preferredCategories || [];

    return products
      .map((product): RecommendedProduct => {
        let score = 0;
        const reasons: string[] = [];

        // Category match (+3 per matching preferred category)
        if (preferredCategories.length > 0) {
          const categoryLower = (product.category || "").toLowerCase();
          const matched = preferredCategories.some(cat =>
            categoryLower.includes(cat.toLowerCase().split(" ")[0])
          );
          if (matched) {
            score += 3;
            reasons.push("Matches your categories");
          }
        }

        // In stock (+2)
        if (
          product.status === "active" &&
          (product.stock_quantity == null || product.stock_quantity > 0)
        ) {
          score += 2;
          reasons.push("In stock");
        }

        // Has discount (+1 — suggests campaign activity)
        if (product.discount_price && product.discount_price < (product.price || Infinity)) {
          score += 1;
          reasons.push("On promotion");
        }

        // Affordable price range (+1 if under MWK 50,000 — broader audience)
        if (product.price && product.price < 50000) {
          score += 1;
          reasons.push("Broad audience price");
        }

        return {
          ...product,
          score,
          reason: reasons.length > 0 ? reasons[0] : "Popular item",
        };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [products, userId, maxResults]);
}
