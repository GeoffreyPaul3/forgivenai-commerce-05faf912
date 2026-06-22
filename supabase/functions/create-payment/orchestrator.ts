import { PaymentProvider } from "./providers/ProviderInterface.ts";
import { PayChanguProvider } from "./providers/PayChanguProvider.ts";
import { OneKhusaProvider } from "./providers/OneKhusaProvider.ts";

export class PaymentOrchestrator {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.registerProvider(new PayChanguProvider());
    this.registerProvider(new OneKhusaProvider());
  }

  private registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.getProviderName().toLowerCase(), provider);
  }

  getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Payment provider '${name}' is not supported.`);
    }
    return provider;
  }
}
