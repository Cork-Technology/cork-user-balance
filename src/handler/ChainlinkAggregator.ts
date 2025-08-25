import type { ETH_USD, ETH_USD_AnswerUpdated, STETH_USD, STETH_USD_AnswerUpdated } from "generated";
import { AGGREGATOR_TO_TOKEN, CHAIN_ID, USD_SYMBOL } from "../helper";
import { makeTokenId, recomputePoolTvl } from "../helper";

export function attachETHUSDHandlers(Aggregator: typeof ETH_USD): void {
  Aggregator.AnswerUpdated.handler(async ({ event, context }) => {
    const entity: ETH_USD_AnswerUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      current: event.params.current,
      roundId: event.params.roundId,
      updatedAt: event.params.updatedAt,
    };
    context.ETH_USD_AnswerUpdated.set(entity);

    const tokenAddr = AGGREGATOR_TO_TOKEN[event.srcAddress as string] || AGGREGATOR_TO_TOKEN[(event.srcAddress as string).toLowerCase()];
    if (tokenAddr) {
      // todo: get feed decimals from the aggregator
      const feedDecimals = 8;

      const price = event.params.current;
      context.TokenPrice.set({
        id: makeTokenId(CHAIN_ID, tokenAddr),
        token_id: makeTokenId(CHAIN_ID, tokenAddr),
        price,
        feedDecimals,
        updatedAt: new Date(event.block.timestamp * 1000),
        toCurrency: USD_SYMBOL,
      });

      // Recompute TVL for pools that reference this token if an index exists
      const index = await context.TokenPoolsIndex.get(makeTokenId(event.chainId, tokenAddr));
      if (index?.poolIds?.length) {
        for (const poolId of index.poolIds as string[]) {
          await recomputePoolTvl(context, event.chainId, poolId);
        }
      }
    }
  });
}

export function attachSTETHUSDHandlers(Aggregator: typeof STETH_USD): void {
  Aggregator.AnswerUpdated.handler(async ({ event, context }) => {
    const entity: STETH_USD_AnswerUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      current: event.params.current,
      roundId: event.params.roundId,
      updatedAt: event.params.updatedAt,
    };
    context.STETH_USD_AnswerUpdated.set(entity);

    const tokenAddr = AGGREGATOR_TO_TOKEN[event.srcAddress as string] || AGGREGATOR_TO_TOKEN[(event.srcAddress as string).toLowerCase()];
    if (tokenAddr) {
      // todo: get feed decimals from the aggregator
      const feedDecimals = 8;
      
      const price = event.params.current;
      context.TokenPrice.set({
        id: makeTokenId(CHAIN_ID, tokenAddr),
        token_id: makeTokenId(CHAIN_ID, tokenAddr),
        price,
        feedDecimals,
        updatedAt: new Date(event.block.timestamp * 1000),
        toCurrency: USD_SYMBOL,
      });

      const index = await context.TokenPoolsIndex.get(makeTokenId(event.chainId, tokenAddr));
      if (index?.poolIds?.length) {
        for (const poolId of index.poolIds as string[]) {
          await recomputePoolTvl(context, event.chainId, poolId);
        }
      }
    }
  });
}


