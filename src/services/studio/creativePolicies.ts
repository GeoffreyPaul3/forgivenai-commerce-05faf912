export const FSC_CREATIVE_POLICIES = {
  version: "3.0.0",
  brandId: "BRAND_FSC_001",
  colorPolicy: {
    primaryAccent: "#B0208D",
    primaryAccentName: "FSC Vibrant Magenta",
    forbiddenColors: ["NEON_CYAN", "NEON_GREEN", "MUTED_BEIGE_GREY"],
    maxAccentPercentage: 15
  },
  logoPolicy: {
    mountingRequirement: "3D PHYSICAL ARCHITECTURAL MOUNTING ONLY",
    prohibitDigitalWatermark: true,
    prohibitOverlayText: true,
    unblockedRule: "Product or human subjects must never obscure > 10% of the FSC logo lockup."
  },
  lightingPolicy: {
    minColorTemperature: 2700,
    maxColorTemperature: 5600,
    enforceRealisticFalloff: true
  },
  qualityPolicy: {
    minResolutionMegapixels: 100,
    enforceTrue GarmentFidelity: true,
    prohibitThirdPartyLogoAlteration: true
  },
  safetyPolicy: {
    prohibitAdultContent: true,
    prohibitOffensiveSymbols: true,
    enforceEthicalRepresentation: true
  }
};
