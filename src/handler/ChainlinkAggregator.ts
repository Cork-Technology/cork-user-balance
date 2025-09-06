import type { PriceFeed_AnswerUpdated } from "generated";
import { AGG_TO_STEP, createPriceFeed_AnswerUpdated } from "../helper";
import { makeTokenId, recomputePoolTvl, makeAssetPrice } from "../helper";

type AggregatorContract = {
  AnswerUpdated: {
    handler: (cb: (args: { event: any; context: any }) => Promise<void>) => void;
  };
};

export function attachUSDPriceFeedHandlers(Aggregator: AggregatorContract): void {

  Aggregator.AnswerUpdated.handler(async ({ event, context }) => {

    const src = event.srcAddress;
    
    // Lookup oracle config by aggregator address
    const oracleConfig = AGG_TO_STEP[src];

    if (!oracleConfig) return;

    const step = {
      aggregator: src,
      fromTokenAddr: oracleConfig.fromTokenAddr,
      toTokenAddr: oracleConfig.toTokenAddr,
      toCurrency: oracleConfig.toCurrency,
      decimals: oracleConfig.decimals,
    } as const;

    // Find pools impacted by this token
    const tokenId = makeTokenId(event.chainId, step.fromTokenAddr);
    const assets = await context.PoolAsset.getWhere.token_id.eq(tokenId);

    if (context.isPreload) return;

    createPriceFeed_AnswerUpdated(
      event.chainId,
      event.block.number,
      event.logIndex,
      event.params.current,
      event.params.roundId,
      event.params.updatedAt,
      src,
      context.PriceFeed_AnswerUpdated.set
    );

    makeAssetPrice(event.chainId, {
      lastAnswer: event.params.current,
      decimals: step.decimals,
      updatedAt: new Date(Number(event.params.updatedAt) * 1000),
      toCurrency: step.toCurrency,
      fromTokenAddr: step.fromTokenAddr,
      toTokenAddr: step.toTokenAddr,
    },
      context.AssetPrice.set
    );

    if (assets?.length) {
      for (const asset of assets) {
        const poolId = asset.pool_id.split(":")[1];
        await recomputePoolTvl(context, event.chainId, poolId);
      }
    }
  });
}