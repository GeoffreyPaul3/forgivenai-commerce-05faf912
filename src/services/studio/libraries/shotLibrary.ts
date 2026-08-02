import { ShotDefinition } from "../types/types";

export const ShotLibrary: Record<string, ShotDefinition> = {
  SHOT_HERO_001: {
    id: "SHOT_HERO_001",
    name: "Hero Anchor Shot",
    type: "HERO",
    cameraDistance: "1.5m",
    angle: "Eye Level / 15° Low Angle",
    purpose: "Primary hero commercial display asset"
  },
  SHOT_LOOKBOOK_002: {
    id: "SHOT_LOOKBOOK_002",
    name: "Full Body Lookbook",
    type: "FULL_BODY",
    cameraDistance: "3.5m",
    angle: "Eye Level",
    purpose: "Garment movement and full architectural context"
  },
  SHOT_SIDE_003: {
    id: "SHOT_SIDE_003",
    name: "45° Dimensional Detail",
    type: "DETAIL",
    cameraDistance: "1.2m",
    angle: "45° Perspective",
    purpose: "Highlights product silhouette and side profile"
  },
  SHOT_MACRO_004: {
    id: "SHOT_MACRO_004",
    name: "Macro Fabric & Hardware",
    type: "MACRO",
    cameraDistance: "0.6m",
    angle: "Direct Parallel",
    purpose: "Demonstrates 100MP material craftsmanship & stitching"
  },
  SHOT_TOP_DOWN_005: {
    id: "SHOT_TOP_DOWN_005",
    name: "Flat Lay Overhead",
    type: "FLAT_LAY",
    cameraDistance: "2.5m",
    angle: "90° Perpendicular Overhead",
    purpose: "Curated styling arrangement and packaging display"
  }
};
