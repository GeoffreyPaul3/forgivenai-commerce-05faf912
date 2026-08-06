/**
 * Enterprise Creative OS — Studio Spatial Model (Zones)
 * 
 * The studio is represented as a physical space with typed zones.
 * Locked zones can never be touched by any decorator or product rule.
 */

export enum StudioZone {
  ARCH        = "ARCH",        // locked
  LOGO        = "LOGO",        // locked
  PODIUM      = "PODIUM",      // locked
  LED_STRIP   = "LED_STRIP",   // locked
  FLOOR       = "FLOOR",       // locked
  LEFT_DECOR  = "LEFT_DECOR",  // editable
  RIGHT_DECOR = "RIGHT_DECOR", // editable
  BACKGROUND  = "BACKGROUND",  // editable
  FOREGROUND  = "FOREGROUND",  // editable
  SUBJECT     = "SUBJECT",     // editable
  PRODUCT     = "PRODUCT",     // editable
  LIGHTING    = "LIGHTING",    // editable (within bounds)
  CAMERA      = "CAMERA",      // editable (within allowed profiles)
}

export const LOCKED_ZONES: StudioZone[] = [
  StudioZone.ARCH,
  StudioZone.LOGO,
  StudioZone.PODIUM,
  StudioZone.LED_STRIP,
  StudioZone.FLOOR,
];

export interface ZoneDefinition {
  id: StudioZone;
  name: string;
  isLocked: boolean;
  baseDescription: string;
  spatialAnchor?: string;
}
