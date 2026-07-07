import { LogisticsProviderV1 } from './providers/ProviderInterfaceV1';
import { SmartDeliveriesProvider } from './providers/SmartDeliveriesProvider';
import { ImpalaCourierProvider } from './providers/ImpalaCourierProvider';

export class ProviderFactory {
  private static providers: Map<string, LogisticsProviderV1> = new Map([
    ['SMART_DELIVERIES', new SmartDeliveriesProvider()],
    ['IMPALA_COURIER', new ImpalaCourierProvider()],
  ]);

  /**
   * Returns a provider implementation by its code.
   * @param code The unique provider code (e.g., 'SMART_DELIVERIES')
   */
  static getProvider(code: string): LogisticsProviderV1 {
    const provider = this.providers.get(code);
    if (!provider) {
      throw new Error(`Logistics provider with code '${code}' not found or not registered.`);
    }
    return provider;
  }

  /**
   * Get all registered providers.
   */
  static getAllProviders(): LogisticsProviderV1[] {
    return Array.from(this.providers.values());
  }
}
