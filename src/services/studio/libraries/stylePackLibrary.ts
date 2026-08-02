import { StylePackProfile } from "../types/types";

export const StylePackLibrary: Record<string, StylePackProfile> = {
  STYLE_LUXURY_EDITORIAL_001: {
    id: "STYLE_LUXURY_EDITORIAL_001",
    version: "3.0.0",
    name: "Luxury Editorial (Vogue / Harper's Bazaar)",
    gradingDescription: "High-end editorial color grading with rich shadows and natural skin tone accuracy",
    contrastProfile: "Medium-High Contrast with smooth highlight falloff",
    moodKeywords: ["Sophisticated", "Opulent", "Vogue Editorial", "Architectural"],
    cameraBehavior: "Sony A7R V with 85mm prime lens handheld precision look"
  },
  STYLE_APPLE_MINIMAL_002: {
    id: "STYLE_APPLE_MINIMAL_002",
    version: "3.0.0",
    name: "Commercial Minimal (Apple / COS Aesthetic)",
    gradingDescription: "Neutral, clean 5000K D50 studio color science",
    contrastProfile: "Clean Linear Contrast",
    moodKeywords: ["Minimal", "Precision", "Pure Product Focus", "Commercial"],
    cameraBehavior: "Hasselblad 100MP tethered tripod rigor"
  },
  STYLE_NIKE_STREET_003: {
    id: "STYLE_NIKE_STREET_003",
    version: "3.0.0",
    name: "High Streetwear (Nike / Off-White Aesthetic)",
    gradingDescription: "Dynamic high-contrast color grading with punchy midtones",
    contrastProfile: "High Contrast",
    moodKeywords: ["Dynamic", "Youth Culture", "Bold", "Urban Architectural"],
    cameraBehavior: "Low-angle dynamic wide lens perspective"
  }
};
