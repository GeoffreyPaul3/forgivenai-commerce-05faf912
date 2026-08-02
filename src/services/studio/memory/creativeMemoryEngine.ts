import { PerformanceTelemetry, AssetId } from "../types/types";

export class CreativeMemoryEngine {
  private memoryStore: Map<string, PerformanceTelemetry> = new Map();

  constructor() {
    this.seedHistoricalTelemetry();
  }

  private seedHistoricalTelemetry() {
    const historical: PerformanceTelemetry[] = [
      {
        compositionId: "COMP_HERO_PORTRAIT_001",
        blueprintId: "fsc_signature",
        variantId: "VAR_MORNING_001",
        channel: "Instagram Ads",
        impressions: 45000,
        clicks: 3060,
        conversions: 245,
        ctr: 0.068,
        cvr: 0.080,
        watchTimeSeconds: 14.2
      },
      {
        compositionId: "COMP_PRODUCT_HERO_002",
        blueprintId: "minimal_product_studio",
        variantId: "VAR_MINIMAL_004",
        channel: "Google Shopping",
        impressions: 68000,
        clicks: 4896,
        conversions: 416,
        ctr: 0.072,
        cvr: 0.085,
        watchTimeSeconds: 8.5
      }
    ];

    historical.forEach(item => {
      const key = `${item.blueprintId}_${item.channel}`;
      this.memoryStore.set(key, item);
    });
  }

  public recordTelemetry(data: PerformanceTelemetry): void {
    const key = `${data.blueprintId}_${data.channel}`;
    this.memoryStore.set(key, data);
  }

  public getTelemetry(blueprintId: AssetId, channel: string = "Instagram Ads"): PerformanceTelemetry | undefined {
    return this.memoryStore.get(`${blueprintId}_${channel}`);
  }

  public getExpectedCTR(blueprintId: AssetId, channel: string = "Instagram Ads"): number {
    const data = this.getTelemetry(blueprintId, channel);
    return data ? data.ctr : 0.055; // Default 5.5% baseline
  }
}

export const globalCreativeMemory = new CreativeMemoryEngine();
