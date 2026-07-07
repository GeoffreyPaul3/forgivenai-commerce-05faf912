import {
  LogisticsProviderV1,
  QuoteRequest,
  QuoteResponse,
  ShipmentRequest,
  ShipmentResponse,
  TrackingResponse,
  ProviderHealth
} from './ProviderInterfaceV1';

export class ImpalaCourierProvider implements LogisticsProviderV1 {
  readonly code = 'IMPALA_COURIER';

  async calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // In our V4 architecture, quote calculation is offloaded to the logistics-orchestrator
    // to ensure frontend doesn't need API keys or heavy calculation logic.
    // However, if we need a quick frontend estimation fallback:
    return {
      amount: 5000, // Example base rate
      currency: 'MWK',
      estimatedDays: 2,
      available: await this.validateCoverage(request.receiverCity),
    };
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    throw new Error('createShipment must be called via Logistics Orchestrator on the backend.');
  }

  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    throw new Error('trackShipment must be called via Logistics Orchestrator on the backend.');
  }

  async validateCoverage(city: string): Promise<boolean> {
    const validLocations = ['Blantyre', 'Lilongwe', 'Mzuzu', 'Zomba', 'Mangochi', 'Kasungu'];
    return validLocations.includes(city);
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      isHealthy: true,
      latencyMs: 80,
      lastChecked: new Date().toISOString(),
    };
  }
}
