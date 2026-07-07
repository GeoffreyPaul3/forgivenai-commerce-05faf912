import {
  LogisticsProviderV1,
  QuoteRequest,
  QuoteResponse,
  ShipmentRequest,
  ShipmentResponse,
  TrackingResponse,
  ProviderHealth
} from './ProviderInterfaceV1';

export class SmartDeliveriesProvider implements LogisticsProviderV1 {
  readonly code = 'SMART_DELIVERIES';

  async calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // Smart Deliveries typically has fixed prices for specific cities.
    // We can fetch from an edge function or calculate locally if rules are fixed.
    const { getDeliveryQuote } = await import('@/integrations/smart-deliveries/deliveryFeeEngine');
    
    try {
      const quote = await getDeliveryQuote({
        city: request.receiverCity,
        deliveryType: 'office_collection', // default fallback for quoting
        itemsCount: request.itemsCount || 1,
      });

      return {
        amount: quote.fee,
        currency: 'MWK',
        estimatedDays: 1, // Same Day/Next Day typically
        available: true,
      };
    } catch (err: any) {
      return {
        amount: 0,
        currency: 'MWK',
        estimatedDays: 0,
        available: false,
        notes: err.message,
      };
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    // This frontend adapter shouldn't directly create shipment in an enterprise context,
    // It should invoke the Edge Function `smart-deliveries-create-parcel` (or the new orchestrator).
    // In our V4 architecture, shipment creation happens strictly in the backend Orchestrator!
    // But if called directly for some reason (e.g. testing), we can route to edge fn:
    throw new Error('createShipment must be called via Logistics Orchestrator on the backend.');
  }

  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    throw new Error('trackShipment must be called via Logistics Orchestrator on the backend.');
  }

  async validateCoverage(city: string): Promise<boolean> {
    const validLocations = ['Blantyre', 'Lilongwe', 'Limbe', 'Mzuzu', 'Zomba'];
    return validLocations.includes(city);
  }

  async healthCheck(): Promise<ProviderHealth> {
    // In a real frontend thin-client, healthcheck is done by the backend.
    return {
      isHealthy: true,
      latencyMs: 50,
      lastChecked: new Date().toISOString(),
    };
  }
}
