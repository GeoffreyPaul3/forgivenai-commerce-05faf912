import { supabase } from '@/integrations/supabase/client';
import { QuoteRequest, QuoteResponse } from './providers/ProviderInterfaceV1';

export interface AutoQuoteResponse {
  selectedProviderCode: string;
  providerName: string;
  quote: QuoteResponse;
  score: number;
}

/**
 * Logistics Domain Service
 * Acts as the Thin Client wrapper for the frontend to communicate with the Logistics Orchestrator.
 * The UI never talks to Edge Functions or Providers directly.
 */
export class LogisticsService {
  /**
   * Requests a live quote from the Logistics Orchestrator.
   * If `providerCode` is 'AUTO', the orchestrator runs the Decision Engine and returns the optimal provider.
   */
  static async getLiveQuote(
    request: QuoteRequest,
    providerCode: string = 'AUTO'
  ): Promise<AutoQuoteResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('logistics-orchestrator', {
        body: {
          action: 'calculate-quote',
          payload: request,
          providerPreference: providerCode,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('No response from Logistics Orchestrator');

      return data as AutoQuoteResponse;
    } catch (err: any) {
      console.error('Error fetching live quote via LogisticsService:', err);
      throw new Error(err.message || 'Failed to fetch delivery quote. Please try again.');
    }
  }

  /**
   * Tracks a shipment globally, regardless of which courier is handling it.
   */
  static async trackShipment(trackingNumber: string) {
    try {
      const { data, error } = await supabase.functions.invoke('logistics-orchestrator', {
        body: {
          action: 'track-shipment',
          trackingNumber,
        },
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error tracking shipment via LogisticsService:', err);
      throw new Error(err.message || 'Failed to track shipment.');
    }
  }
}
