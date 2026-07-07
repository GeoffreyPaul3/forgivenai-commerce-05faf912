export type ShipmentState =
  | 'Draft'
  | 'Quoted'
  | 'Paid'
  | 'Shipment Requested'
  | 'Shipment Created'
  | 'Pending Pickup'
  | 'Collected'
  | 'Sorting'
  | 'In Transit'
  | 'Local Hub'
  | 'Out For Delivery'
  | 'Delivered'
  | 'Completed'
  | 'Failed'
  | 'Returned'
  | 'Cancelled';

export interface QuoteRequest {
  senderCity: string;
  receiverCity: string;
  weight?: number;
  declaredValue?: number;
  itemsCount?: number;
}

export interface QuoteResponse {
  amount: number;
  currency: string;
  estimatedDays: number;
  available: boolean;
  notes?: string;
}

export interface ShipmentRequest {
  orderId: string;
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  receiverAddress?: string;
  deliveryType: string;
  items: any[];
  idempotencyKey: string;
}

export interface ShipmentResponse {
  trackingNumber: string;
  providerId: string;
  status: ShipmentState;
  rawPayload?: any;
}

export interface TrackingResponse {
  status: ShipmentState;
  events: {
    status: ShipmentState;
    description: string;
    timestamp: string;
  }[];
  rawPayload?: any;
}

export interface ProviderHealth {
  isHealthy: boolean;
  latencyMs: number;
  lastChecked: string;
}

/**
 * Logistics Provider Interface V1
 * Ensures all couriers expose the exact same contract to the Orchestrator.
 */
export interface LogisticsProviderV1 {
  /**
   * Identifies the provider code (e.g., 'SMART_DELIVERIES', 'IMPALA_COURIER')
   */
  readonly code: string;

  /**
   * Retrieves a live quote for a delivery.
   */
  calculateQuote(request: QuoteRequest): Promise<QuoteResponse>;

  /**
   * Creates a shipment/parcel with the provider.
   */
  createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;

  /**
   * Tracks an existing shipment by its tracking number.
   */
  trackShipment(trackingNumber: string): Promise<TrackingResponse>;

  /**
   * Checks if the provider can deliver to the given destination.
   */
  validateCoverage(city: string): Promise<boolean>;

  /**
   * Returns the current API health status of the provider.
   */
  healthCheck(): Promise<ProviderHealth>;
}
