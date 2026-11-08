/**
 * Payments Module - Factory Pattern for Payment Providers
 *
 * Permite cambiar de proveedor (AZUL, Stripe, Manual) sin tocar lógica de negocio
 */
import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ManualTransferProvider } from "./providers/manual-transfer.provider";
import {
  PaymentProviderFactory,
  PaymentProviderType,
} from "./interfaces/payment-provider.interface";
import { PaymentIntentController } from "./payment-intent.controller";
import { PaymentEvidenceService } from "./services/payment-evidence.service";
import {
  CURRENT_PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_FACTORY,
} from "./payment-provider.tokens";

export {
  CURRENT_PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_FACTORY,
} from "./payment-provider.tokens";

/**
 * Factory function que retorna el proveedor configurado
 */
export const paymentProviderFactory: PaymentProviderFactory = (
  providerType: PaymentProviderType,
) => {
  switch (providerType) {
    case "MANUAL_TRANSFER":
      return new ManualTransferProvider(new ConfigService());
    case "AZUL":
      // TODO: Implementar AzulProvider cuando se valide API
      throw new Error(
        "AZUL provider not implemented yet - pending API validation",
      );
    case "STRIPE":
      // TODO: Implementar StripeProvider
      throw new Error("STRIPE provider not implemented yet");
    default:
      throw new Error(`Unknown payment provider: ${providerType}`);
  }
};

@Global()
@Module({
  controllers: [PaymentIntentController],
  providers: [
    PaymentEvidenceService,
    {
      provide: PAYMENT_PROVIDER_FACTORY,
      useValue: paymentProviderFactory,
    },
    {
      provide: CURRENT_PAYMENT_PROVIDER,
      useFactory: (factory: PaymentProviderFactory, config: ConfigService) => {
        const providerType =
          config.get("PAYMENT_PROVIDER") || "MANUAL_TRANSFER";
        const provider = factory(providerType);
        return provider;
      },
      inject: [PAYMENT_PROVIDER_FACTORY, ConfigService],
    },
    ManualTransferProvider,
  ],
  exports: [
    PAYMENT_PROVIDER_FACTORY,
    CURRENT_PAYMENT_PROVIDER,
    ManualTransferProvider,
    PaymentEvidenceService,
  ],
})
export class PaymentsModule {}
