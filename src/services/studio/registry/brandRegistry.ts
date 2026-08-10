import { BrandDNA } from "../types/types";

export const BrandRegistry: Record<string, BrandDNA> = {
  BRAND_FSC_001: {
    id: "BRAND_FSC_001",
    name: "Forgiven Shopping Centre",
    tagline: "Premier Luxury Retail & Commerce Destination",
    primaryColorHex: "#A72087",
    secondaryColorHex: "#1A3E92",
    accentColorHex: "#D4AF37",
    logoDescription: "Official Forgiven Shopping Centre logo — stylized primary magenta (#A72087) shopping bag with a crisp white 'F', secondary royal blue (#1A3E92) bag shape, lime-green accent, and 'Forgiven Shopping Centre' wordmark.",
    logoAsset: "FORGIVEN_OFFICIAL_LOGO",
    logoPath: "/forgiven.png",
    logoUsage: "IMMUTABLE_REFERENCE_ASSET",
    architectureHeritage: "Modern African luxury retail architecture engineered to international flagship luxury standards",
    qualityStandard: "100MP Hasselblad / Sony Alpha high-fashion editorial finish",
    prohibitedElements: ["cheap plastic props", "digital watermark overlays", "flat studio blue lighting", "distorted garments", "logo redesign", "logo hallucination", "logo recreation"]
  }
};

export function getBrandDNA(brandId: string = "BRAND_FSC_001"): BrandDNA {
  return BrandRegistry[brandId] || BrandRegistry["BRAND_FSC_001"];
}
