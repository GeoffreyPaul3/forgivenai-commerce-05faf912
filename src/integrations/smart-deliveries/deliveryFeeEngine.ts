export interface DeliveryQuoteRequest {
  city: string;
  deliveryType: 'door_to_door' | 'office_collection';
  itemsCount: number;
}

export interface DeliveryQuote {
  available: boolean;
  fee: number;
  currency: string;
  message?: string;
}

/**
 * Abstraction layer for delivery quotes.
 * Supports future dynamic pricing, zone pricing, weight, and distance pricing.
 */
export async function getDeliveryQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
  // Stubbed for now as Smart Deliveries currently doesn't provide quote APIs,
  // but architected to support it.
  
  // Example base logic:
  const baseFee = 2500; // Base rate
  let finalFee = baseFee;

  if (request.deliveryType === 'door_to_door') {
    finalFee += 1500; // Additional for door-to-door
  }

  // E.g., bulk surcharge
  if (request.itemsCount > 3) {
    finalFee += (request.itemsCount - 3) * 500;
  }

  return {
    available: true,
    fee: finalFee,
    currency: 'MWK'
  };
}
