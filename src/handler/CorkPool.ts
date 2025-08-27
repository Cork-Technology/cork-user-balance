import type {
  CorkPool,
  CorkPool_BaseRedemptionFeePercentageUpdated,
  CorkPool_Deposit,
  CorkPool_DepositPaused,
  CorkPool_DepositUnpaused,
  CorkPool_Initialized,
  CorkPool_MarketCreated,
  CorkPool_OwnershipTransferred,
  CorkPool_ReturnPaused,
  CorkPool_ReturnUnpaused,
  CorkPool_Swap,
  CorkPool_SwapPaused,
  CorkPool_SwapUnpaused,
  CorkPool_UnwindSwap,
  CorkPool_UnwindSwapFeeRateUpdated,
  CorkPool_UnwindSwapPaused,
  CorkPool_UnwindSwapUnpaused,
  CorkPool_Upgraded,
  CorkPool_WithdrawExtended,
  CorkPool_WithdrawalPaused,
  CorkPool_WithdrawalUnpaused
} from "generated";
import {
  createNewAccount,
  createNewToken,
  createNewPool,
  createNewPoolAsset,
  makePoolId,
  makeTokenId,
  makeAccountId,
  makePoolAssetId,
  makePoolAssetEntry,
  addToBalance,
  subFromBalance,
} from "../helper";
import { recomputePoolTvl } from "../helper";

export function attachEventHandlers<T extends typeof CorkPool>(
  Pool: T,
): void {
  // ========================================
  // MAIN BUSINESS LOGIC HANDLERS
  // ========================================

  /**
   * MarketCreated: Initialize new pool and tokens
   * Creates: Pool, CA token, REF token, CPT token, CST token
   * PoolAssets: None created (pool starts empty)
   */
  Pool.MarketCreated.contractRegister(({event, context}) => {
    context.addCPT(event.params.principalToken);
    context.addCST(event.params.swapToken);
    context.addExchangeRateProvider(event.params.exchangeRateProvider);
  })

  Pool.MarketCreated.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const marketId = `${event.params.id}`;
    const poolId = marketId;
    const {referenceAsset, collateralAsset, principalToken, swapToken, exchangeRateProvider, expiry} = event.params;


    // Parallel fetch tokens
    let [refToken, collToken, prToken, swToken] = await Promise.all([
      context.Token.get(makeTokenId(chainId, referenceAsset)),
      context.Token.get(makeTokenId(chainId, collateralAsset)),
      context.Token.get(makeTokenId(chainId, principalToken)),
      context.Token.get(makeTokenId(chainId, swapToken)),
    ]);
    refToken ||= createNewToken(chainId, referenceAsset, "REF", context.Token.set);
    collToken ||= createNewToken(chainId, collateralAsset, "CA", context.Token.set);
    prToken ||= createNewToken(chainId, principalToken, "CPT", context.Token.set);
    swToken ||= createNewToken(chainId, swapToken, "CST", context.Token.set);

    // Ensure zero-balance PoolAsset records exist for CA and REF so that
    // required Pool relationships can be linked immediately.
    createNewPoolAsset(chainId, poolId, collateralAsset, context.PoolAsset.set);
    createNewPoolAsset(chainId, poolId, referenceAsset, context.PoolAsset.set);

    // Create the pool entry. If it already exists this will overwrite
    // existing data with the new parameters. The helper links principal/swap
    // tokens and collateral/reference assets via *_id fields.
    createNewPool(chainId, poolId, {
      poolIdBytes: marketId,
      principalTokenAddr: principalToken,
      swapTokenAddr: swapToken,
      collateralAssetAddr: collateralAsset,
      referenceAssetAddr: referenceAsset,
      exchangeRateProviderAddr: exchangeRateProvider,
      expiry,
      startBlock: event.block.number,
    }, context.Pool.set);

    // Link CPT/CST tokens back to the pool for convenience
    context.Token.set({ ...prToken, pool_id: makePoolId(chainId, poolId) });
    context.Token.set({ ...swToken, pool_id: makePoolId(chainId, poolId) });

    const entity: CorkPool_MarketCreated = {
      id: makePoolId(chainId, poolId),
      event_id: event.params.id,
      referenceAsset: event.params.referenceAsset,
      collateralAsset: event.params.collateralAsset,
      expiry: event.params.expiry,
      exchangeRateProvider: event.params.exchangeRateProvider,
      principalToken: event.params.principalToken,
      swapToken: event.params.swapToken,
    };
    context.CorkPool_MarketCreated.set(entity);
  });

  /**
   * Deposit: User deposits collateral, receives CPT/CST shares
   * IN: CA (from user) → OUT: CPT + CST (to user)
   * PoolAssets: CA balance increases
   */
  Pool.Deposit.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const poolId = `${event.params.marketId}`;
    const pool = await context.Pool.get(makePoolId(chainId, poolId));
    if (!pool) {
      context.log.error(`CorkPool: deposit received for unknown pool ${poolId}`);
      return;
    }
    const { principalTokenAddr, swapTokenAddr, collateralAssetAddr, referenceAssetAddr } = pool;

    let [collateralToken, principalToken, swapToken, referenceToken, senderAccount, ownerAccount, collateralPoolAsset, referencePoolAsset] = await Promise.all([
      context.Token.get(makeTokenId(chainId, collateralAssetAddr)),
      context.Token.get(makeTokenId(chainId, principalTokenAddr)),
      context.Token.get(makeTokenId(chainId, swapTokenAddr)),
      context.Token.get(makeTokenId(chainId, referenceAssetAddr)),
      context.Account.get(makeAccountId(chainId, event.params.sender)),
      context.Account.get(makeAccountId(chainId, event.params.owner)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAssetAddr)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAssetAddr)),
    ]);

    principalToken ||= createNewToken(chainId, principalTokenAddr, "CPT", context.Token.set);
    swapToken ||= createNewToken(chainId, swapTokenAddr, "CST", context.Token.set);
    collateralToken ||= createNewToken(chainId, collateralAssetAddr, "CA", context.Token.set);
    referenceToken ||= createNewToken(chainId, referenceAssetAddr, "REF", context.Token.set);

    senderAccount ||= createNewAccount(chainId, event.params.sender, context.Account.set);
    ownerAccount ||= createNewAccount(chainId, event.params.owner, context.Account.set);

    collateralPoolAsset ||= createNewPoolAsset(chainId, poolId, collateralAssetAddr, context.PoolAsset.set);
    referencePoolAsset ||= createNewPoolAsset(chainId, poolId, referenceAssetAddr, context.PoolAsset.set);

    const { assets } = event.params;
    context.PoolAssetEntry.set(
      makePoolAssetEntry(event, poolId, collateralAssetAddr, assets),
    );
    context.PoolAsset.set(addToBalance(collateralPoolAsset, assets));

    const entity: CorkPool_Deposit = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
      sender: event.params.sender,
      owner: event.params.owner,
      assets: event.params.assets,
      shares: event.params.shares,
    };
    context.CorkPool_Deposit.set(entity);
    // if(context.isPreload) return;
    await recomputePoolTvl(context, chainId, poolId);
  });



  /**
   * WithdrawExtended: User burns CPT/CST shares, receives CA/REF assets
   * IN: CPT + CST (from user) → OUT: CA + REF (to user)
   * PoolAssets: CA and REF balances decrease
   */
  Pool.WithdrawExtended.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const poolId = `${event.params.marketId}`;
    const pool = await context.Pool.get(makePoolId(chainId, poolId));
    if (!pool) {
      context.log.error(`CorkPool: withdrawExtended received for unknown pool ${poolId}`);
      return;
    }
    const { principalTokenAddr, swapTokenAddr, collateralAssetAddr, referenceAssetAddr } = pool;

    let [collateralToken, principalToken, swapToken, referenceToken, senderAccount, ownerAccount, collateralPoolAsset, referencePoolAsset] = await Promise.all([
      context.Token.get(makeTokenId(chainId, collateralAssetAddr)),
      context.Token.get(makeTokenId(chainId, principalTokenAddr)),
      context.Token.get(makeTokenId(chainId, swapTokenAddr)),
      context.Token.get(makeTokenId(chainId, referenceAssetAddr)),
      context.Account.get(makeAccountId(chainId, event.params.sender)),
      context.Account.get(makeAccountId(chainId, event.params.owner)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAssetAddr)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAssetAddr)),
    ]);

    principalToken ||= createNewToken(chainId, principalTokenAddr, "CPT", context.Token.set);
    swapToken ||= createNewToken(chainId, swapTokenAddr, "CST", context.Token.set);
    collateralToken ||= createNewToken(chainId, collateralAssetAddr, "CA", context.Token.set);
    referenceToken ||= createNewToken(chainId, referenceAssetAddr, "REF", context.Token.set);

    senderAccount ||= createNewAccount(chainId, event.params.sender, context.Account.set);
    ownerAccount ||= createNewAccount(chainId, event.params.owner, context.Account.set);

    collateralPoolAsset ||= createNewPoolAsset(chainId, poolId, collateralAssetAddr, context.PoolAsset.set);
    referencePoolAsset ||= createNewPoolAsset(chainId, poolId, referenceAssetAddr, context.PoolAsset.set);

    const { assets0, assets1 } = event.params;
    if (assets0 > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, collateralAssetAddr, -assets0),
      );
      context.PoolAsset.set(subFromBalance(collateralPoolAsset, assets0));
    }
    if (assets1 > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, referenceAssetAddr, -assets1),
      );
      context.PoolAsset.set(subFromBalance(referencePoolAsset, assets1));
    }

    const entity: CorkPool_WithdrawExtended = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
      sender: event.params.sender,
      owner: event.params.owner,
      assets0: event.params.assets0,
      assets1: event.params.assets1,
      shares0: event.params.shares0,
      shares1: event.params.shares1,
    };
    context.CorkPool_WithdrawExtended.set(entity);
    // if(context.isPreload) return;
    await recomputePoolTvl(context, chainId, poolId);
  });

  /**
   * Swap: User exchanges REF + CST for CA
   * IN: REF + CST (from user) → OUT: CA (to user)
   * PoolAssets: REF increases, CA decreases
   */
  Pool.Swap.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const poolId = `${event.params.id}`;
    const pool = await context.Pool.get(makePoolId(chainId, poolId));
    if (!pool) {
      context.log.error(`CorkPool: swap received for unknown pool ${poolId}`);
      return;
    }
    const { referenceAssetAddr, collateralAssetAddr } = pool;

    let [referenceToken, collateralToken, swaperAccount, referencePoolAsset, collateralPoolAsset] = await Promise.all([
      context.Token.get(makeTokenId(chainId, referenceAssetAddr)),
      context.Token.get(makeTokenId(chainId, collateralAssetAddr)),
      context.Account.get(makeAccountId(chainId, event.params.swaper)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAssetAddr)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAssetAddr)),
    ]);

    referenceToken ||= createNewToken(chainId, referenceAssetAddr, "REF", context.Token.set);
    collateralToken ||= createNewToken(chainId, collateralAssetAddr, "CA", context.Token.set);
    swaperAccount ||= createNewAccount(chainId, event.params.swaper, context.Account.set);
    referencePoolAsset ||= createNewPoolAsset(chainId, poolId, referenceAssetAddr, context.PoolAsset.set);
    collateralPoolAsset ||= createNewPoolAsset(chainId, poolId, collateralAssetAddr, context.PoolAsset.set);

    const { paUsed, raReceived } = event.params;
    if (paUsed > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, referenceAssetAddr, paUsed),
      );
      context.PoolAsset.set(addToBalance(referencePoolAsset, paUsed));
    }
    if (raReceived > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, collateralAssetAddr, -raReceived),
      );
      context.PoolAsset.set(subFromBalance(collateralPoolAsset, raReceived));
    }

    const swapEntity: CorkPool_Swap = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      swaper: event.params.swaper,
      paUsed: event.params.paUsed,
      swapTokenUsed: event.params.swapTokenUsed,
      raReceived: event.params.raReceived,
      dsExchangeRate: event.params.dsExchangeRate,
      feePercentage: event.params.feePercentage,
      fee: event.params.fee,
    };
    context.CorkPool_Swap.set(swapEntity);
    // if(context.isPreload) return;
    await recomputePoolTvl(context, chainId, poolId);
  });

  /**
   * UnwindSwap: User deposits CA, receives REF + CST
   * IN: CA (from user) → OUT: REF + CST (to user)  
   * PoolAssets: CA increases, REF decreases
   */
  Pool.UnwindSwap.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const poolId = `${event.params.id}`;
    const pool = await context.Pool.get(makePoolId(chainId, poolId));
    if (!pool) {
      context.log.error(`CorkPool: unwindSwap received for unknown pool ${poolId}`);
      return;
    }
    const { referenceAssetAddr, collateralAssetAddr } = pool;

    let [referenceToken, collateralToken, buyerAccount, referencePoolAsset, collateralPoolAsset] = await Promise.all([
      context.Token.get(makeTokenId(chainId, referenceAssetAddr)),
      context.Token.get(makeTokenId(chainId, collateralAssetAddr)),
      context.Account.get(makeAccountId(chainId, event.params.buyer)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAssetAddr)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAssetAddr)),
    ]);

    referenceToken ||= createNewToken(chainId, referenceAssetAddr, "REF", context.Token.set);
    collateralToken ||= createNewToken(chainId, collateralAssetAddr, "CA", context.Token.set);
    buyerAccount ||= createNewAccount(chainId, event.params.buyer, context.Account.set);
    referencePoolAsset ||= createNewPoolAsset(chainId, poolId, referenceAssetAddr, context.PoolAsset.set);
    collateralPoolAsset ||= createNewPoolAsset(chainId, poolId, collateralAssetAddr, context.PoolAsset.set);

    const { raUsed, receivedReferenceAsset } = event.params;
    if (raUsed > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, collateralAssetAddr, raUsed),
      );
      context.PoolAsset.set(addToBalance(collateralPoolAsset, raUsed));
    }
    if (receivedReferenceAsset > 0n) {
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, referenceAssetAddr, -receivedReferenceAsset),
      );
      context.PoolAsset.set(subFromBalance(referencePoolAsset, receivedReferenceAsset));
    }

    const unwindEntity: CorkPool_UnwindSwap = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      buyer: event.params.buyer,
      raUsed: event.params.raUsed,
      receivedReferenceAsset: event.params.receivedReferenceAsset,
      receivedSwapToken: event.params.receivedSwapToken,
      feePercentage: event.params.feePercentage,
      fee: event.params.fee,
      exchangeRates: event.params.exchangeRates,
    };
    context.CorkPool_UnwindSwap.set(unwindEntity);
    // if(context.isPreload) return;
    await recomputePoolTvl(context, chainId, poolId);
  });

  // ========================================
  // SIMPLE EVENT RECORDING HANDLERS
  // ========================================

  Pool.BaseRedemptionFeePercentageUpdated.handler(async ({ event, context }) => {
    const entity: CorkPool_BaseRedemptionFeePercentageUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      baseRedemptionFeePercentage: event.params.baseRedemptionFeePercentage,
    };
    context.CorkPool_BaseRedemptionFeePercentageUpdated.set(entity);
  });

  Pool.DepositPaused.handler(async ({ event, context }) => {
    const entity: CorkPool_DepositPaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_DepositPaused.set(entity);
  });
  
  Pool.DepositUnpaused.handler(async ({ event, context }) => {
    const entity: CorkPool_DepositUnpaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_DepositUnpaused.set(entity);
  });

  Pool.Initialized.handler(async ({ event, context }) => {
    const entity: CorkPool_Initialized = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      version: event.params.version,
    };
    context.CorkPool_Initialized.set(entity);
  });

  Pool.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity: CorkPool_OwnershipTransferred = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
    };
    context.CorkPool_OwnershipTransferred.set(entity);
  });

  Pool.ReturnPaused.handler(async ({ event, context }) => {
    const entity: CorkPool_ReturnPaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_ReturnPaused.set(entity);
  });

  Pool.ReturnUnpaused.handler(async ({ event, context }) => {
    const entity: CorkPool_ReturnUnpaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_ReturnUnpaused.set(entity);
  });

  Pool.SwapPaused.handler(async ({ event, context }) => {
    const entity: CorkPool_SwapPaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_SwapPaused.set(entity);
  });

  Pool.SwapUnpaused.handler(async ({ event, context }) => {
    const entity: CorkPool_SwapUnpaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_SwapUnpaused.set(entity);
  });

  Pool.UnwindSwapFeeRateUpdated.handler(async ({ event, context }) => {
    const entity: CorkPool_UnwindSwapFeeRateUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      unwindSwapFeeRate: event.params.unwindSwapFeeRate,
    };
    context.CorkPool_UnwindSwapFeeRateUpdated.set(entity);
  });

  Pool.UnwindSwapPaused.handler(async ({ event, context }) => {
    const entity: CorkPool_UnwindSwapPaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_UnwindSwapPaused.set(entity);
  });

  Pool.UnwindSwapUnpaused.handler(async ({ event, context }) => {
    const entity: CorkPool_UnwindSwapUnpaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_UnwindSwapUnpaused.set(entity);
  });

  Pool.Upgraded.handler(async ({ event, context }) => {
    const entity: CorkPool_Upgraded = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      implementation: event.params.implementation,
    };
    context.CorkPool_Upgraded.set(entity);
  });

  Pool.WithdrawalPaused.handler(async ({ event, context }) => {
    const entity: CorkPool_WithdrawalPaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_WithdrawalPaused.set(entity);
  });

  Pool.WithdrawalUnpaused.handler(async ({ event, context }) => {
    const entity: CorkPool_WithdrawalUnpaused = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      marketId: event.params.marketId,
    };
    context.CorkPool_WithdrawalUnpaused.set(entity);
  });
}
