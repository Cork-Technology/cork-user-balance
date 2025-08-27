import type {
  ExchangeRateProvider,
  ExchangeRateProvider_RateUpdated,
} from "generated";
import { makeAssetPrice, makeTokenId } from "../helper";
  

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

    const pool = await context.Pool.get(makeTokenId(event.chainId, event.params.id as unknown as string));
    if (!pool) return;
    const refAddr = pool.referenceAssetAddr;
    const ethAddr = pool.collateralAssetAddr; // assuming CA is ETH in this market

    context.AssetPrice.set(
      makeAssetPrice(event.chainId, `${refAddr}:${ethAddr}`, {
        lastAnswer: event.params.newRate,
        decimals: 18, // rate decimals assumption; adjust as needed
        updatedAt: new Date(event.block.timestamp * 1000),
        toCurrency: null,
        fromTokenAddr: refAddr,
        toTokenAddr: ethAddr,
      })
    );
  });
}
  