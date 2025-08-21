import type {
    ExchangeRateProvider,
    ExchangeRateProvider_RateUpdated,
  } from "generated";
  

  // ========================================
  // SIMPLE EVENT RECORDING HANDLERS
  // ========================================

  export function attachEventHandlers<T extends typeof ExchangeRateProvider>(
    Provider: T,
  ): void {
    Provider.RateUpdated.handler(async ({ event, context }) => {
      const entity: ExchangeRateProvider_RateUpdated = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        newRate: event.params.newRate,
      };
      context.ExchangeRateProvider_RateUpdated.set(entity);
    });
  }
  