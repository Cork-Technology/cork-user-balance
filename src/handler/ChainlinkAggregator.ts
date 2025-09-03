import type { ETH_USD, WSTETH_USD, BTC_ETH, LINK_USD, XAU_USD, DAI_USD, EUR_USD, GBP_USD, PriceFeed_AnswerUpdated } from "generated";
import { USD_SYMBOL, AGG_TO_STEP } from "../helper";
import { makeTokenId, recomputePoolTvl, makeAssetPrice } from "../helper";

export function attachUSDPriceFeedHandlers(
  Aggregator: typeof ETH_USD | typeof WSTETH_USD | typeof BTC_ETH | typeof LINK_USD | typeof XAU_USD | typeof DAI_USD | typeof EUR_USD | typeof GBP_USD
): void {

  type Step = { aggregator: string; fromTokenAddr: string; toTokenAddr?: string; toCurrency?: string; decimals: number };

  Aggregator.AnswerUpdated.handler(async ({ event, context }) => {

    const src = event.srcAddress;

    const entity: PriceFeed_AnswerUpdated = {
      id: `${event.chainId}_${event.block.number}_${src}_${event.logIndex}`,
      current: event.params.current,
      roundId: event.params.roundId,
      updatedAt: event.params.updatedAt,
    };
    context.PriceFeed_AnswerUpdated.set(entity);

    // Lookup step by aggregator address
    const s = AGG_TO_STEP[src];

    if (!s) return;

    const step: Step = {
      aggregator: src,
      fromTokenAddr: s.fromTokenAddr,
      toTokenAddr: s.toTokenAddr,
      toCurrency: s.toCurrency,
      decimals: s.decimals,
    } as const;

    // Write/update normalized AssetPrice edge for this step
    const assetKey = step.toCurrency
      ? `${step.fromTokenAddr}:${step.toCurrency}`
      : `${step.fromTokenAddr}:${step.toTokenAddr}`;

    context.AssetPrice.set(makeAssetPrice(event.chainId, assetKey, {
      lastAnswer: event.params.current,
      decimals: step.decimals,
      updatedAt: new Date(Number(event.params.updatedAt) * 1000),
      toCurrency: step.toCurrency ?? null,
      fromTokenAddr: step.fromTokenAddr,
      toTokenAddr: step.toTokenAddr,
    }));

    // Find pools impacted by this token
    const tokenId = makeTokenId(event.chainId, step.fromTokenAddr);
    const assets = await context.PoolAsset.getWhere.token_id.eq(tokenId);

    if (context.isPreload) return;

    if (assets?.length) {
      for (const asset of assets) {
        const poolId = asset.pool_id.split(":")[1];
        await recomputePoolTvl(context, event.chainId, poolId);
      }
    }
  });
}