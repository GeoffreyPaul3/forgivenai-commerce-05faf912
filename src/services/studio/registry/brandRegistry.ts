import { BrandDNA } from "../types/types";

export const BrandRegistry: Record<string, BrandDNA> = {
  BRAND_FSC_001: {
    id: "BRAND_FSC_001",
    name: "Forgiven Shopping Centre",
    tagline: "Premier Luxury Retail & Commerce Destination",
    primaryColorHex: "#B0208D",
    secondaryColorHex: "#F5F0EA",
    accentColorHex: "#D4AF37",
    logoDescription: "Bold magenta (#B0208D) shopping bag icon with crisp white 'F' and vertical text 'Forgiven Shopping Centre'",
    architectureHeritage: "Modern African luxury retail architecture engineered to international flagship luxury standards",
    qualityStandard: "100MP Hasselblad / Sony Alpha high-fashion editorial finish",
    prohibitedElements: ["cheap plastic props", "digital watermark overlays", "flat studio blue lighting", "distorted garments"]
  }
};

export function getBrandDNA(brandId: string = "BRAND_FSC_001"): BrandDNA {
  return BrandRegistry[brandId] || BrandRegistry["BRAND_FSC_001"];
}
