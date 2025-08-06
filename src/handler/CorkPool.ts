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
  ZERO_ADDRESS,
  createNewAccount,
  createNewToken,
  createNewAccountToken,
  createNewPool,
  createNewPoolAsset,
  makePoolId,
  makeTokenId,
  makeAccountId,
  makeAccountTokenId,
  makePoolAssetId,
  makePoolAssetEntry,
  makeAccountTokenEntry,
  makeTokenTransfer,
  addToBalance,
  subFromBalance,
} from "../helper";

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
  })

  Pool.MarketCreated.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const marketId = event.params.id as unknown as string;
    const poolId = marketId;
    const referenceAsset = event.params.referenceAsset;
    const collateralAsset = event.params.collateralAsset;
    const principalToken = event.params.principalToken;
    const swapToken = event.params.swapToken;
    const exchangeRateProvider = event.params.exchangeRateProvider;
    const expiry = event.params.expiry;



    // Ensure all referenced tokens exist
    // Use the new token type names: REF for reference asset, CA for collateral asset,
    // CPT for principal (cover principal token) and CST for swap token. These
    // abbreviations mirror the updated TokenType enum defined in the schema.
    if (!(await context.Token.get(makeTokenId(chainId, referenceAsset)))) {
      createNewToken(chainId, referenceAsset, "REF", context.Token.set);
    }
    if (!(await context.Token.get(makeTokenId(chainId, collateralAsset)))) {
      createNewToken(chainId, collateralAsset, "CA", context.Token.set);
    }
    if (!(await context.Token.get(makeTokenId(chainId, principalToken)))) {
      createNewToken(chainId, principalToken, "CPT", context.Token.set);
    }
    if (!(await context.Token.get(makeTokenId(chainId, swapToken)))) {
      createNewToken(chainId, swapToken, "CST", context.Token.set);
    }

    // Create the pool entry. If it already exists this will overwrite
    // existing data with the new parameters.
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

    const entity: CorkPool_MarketCreated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
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
  Pool.Deposit.handlerWithLoader({
    loader: async ({ event, context }) => {
      const chainId = event.chainId;
      const poolId = event.params.marketId as unknown as string;
      const pool = await context.Pool.get(makePoolId(chainId, poolId));
      if (!pool) {
        return [undefined];
      }
      const collateralAddr = pool.collateralAssetAddr;
      const principalAddr = pool.principalTokenAddr;
      const swapAddr = pool.swapTokenAddr;
      const referenceAddr = pool.referenceAssetAddr;
      return Promise.all([
        pool,
        // Load the collateral, principal, swap, and reference tokens. These may be undefined
        collateralAddr ? context.Token.get(makeTokenId(chainId, collateralAddr)) : undefined,
        principalAddr ? context.Token.get(makeTokenId(chainId, principalAddr)) : undefined,
        swapAddr ? context.Token.get(makeTokenId(chainId, swapAddr)) : undefined,
        referenceAddr ? context.Token.get(makeTokenId(chainId, referenceAddr)) : undefined,
        // Load the sender and owner accounts
        context.Account.get(makeAccountId(chainId, event.params.sender)),
        context.Account.get(makeAccountId(chainId, event.params.owner)),
        // Load the pool asset records for collateral and reference tokens
        collateralAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAddr)) : undefined,
        referenceAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn }) => {
      // If pool was not found we cannot process the deposit
      const [pool, collateralToken, principalToken, swapToken, referenceToken, senderAccount, ownerAccount, collateralPoolAsset, referencePoolAsset] = loaderReturn as any[];
      const chainId = event.chainId;
      const poolId = event.params.marketId as unknown as string;
      if (!pool) {
        context.log.error(`CorkPool: deposit received for unknown pool ${poolId}`);
        return;
      }
      const collateralAddr = pool.collateralAssetAddr;
      const principalAddr = pool.principalTokenAddr;
      const swapAddr = pool.swapTokenAddr;
      const referenceAddr = pool.referenceAssetAddr;

      // Create missing tokens. Use updated token types CA for collateral,
      // CPT for principal (cover principal token), CST for swap token, and REF for reference.
      let collToken = collateralToken;
      if (!collToken) {
        collToken = createNewToken(chainId, collateralAddr, "CA", context.Token.set);
      }
      let prToken = principalToken;
      if (!prToken) {
        prToken = createNewToken(chainId, principalAddr, "CPT", context.Token.set);
      }
      let swToken = swapToken;
      if (!swToken) {
        swToken = createNewToken(chainId, swapAddr, "CST", context.Token.set);
      }
      let refToken = referenceToken;
      if (!refToken) {
        refToken = createNewToken(chainId, referenceAddr, "REF", context.Token.set);
      }

      // Create missing accounts
      let sender = senderAccount;
      if (!sender) {
        sender = createNewAccount(chainId, event.params.sender, context.Account.set);
      }
      let owner = ownerAccount;
      if (!owner) {
        owner = createNewAccount(chainId, event.params.owner, context.Account.set);
      }

      // Create pool assets if missing - both collateral and reference need tracking
      let collPoolAsset = collateralPoolAsset;
      if (!collPoolAsset) {
        collPoolAsset = createNewPoolAsset(chainId, poolId, collateralAddr, context.PoolAsset.set);
      }
      let refPoolAsset = referencePoolAsset;
      if (!refPoolAsset) {
        refPoolAsset = createNewPoolAsset(chainId, poolId, referenceAddr, context.PoolAsset.set);
      }

      const assets = event.params.assets;
      const shares = event.params.shares;

      // Update pool collateral balance: the pool receives `assets` of CA from the sender.
      context.PoolAssetEntry.set(
        makePoolAssetEntry(event, poolId, collateralAddr, assets),
      );
      context.PoolAsset.set(
        addToBalance(collPoolAsset, assets),
      );

      // Record deposit entity
      const entity: CorkPool_Deposit = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        marketId: event.params.marketId,
        sender: event.params.sender,
        owner: event.params.owner,
        assets: event.params.assets,
        shares: event.params.shares,
      };
      context.CorkPool_Deposit.set(entity);
    },
  });



  /**
   * WithdrawExtended: User burns CPT/CST shares, receives CA/REF assets
   * IN: CPT + CST (from user) → OUT: CA + REF (to user)
   * PoolAssets: CA and REF balances decrease
   */
  Pool.WithdrawExtended.handlerWithLoader({
    loader: async ({ event, context }) => {
      const chainId = event.chainId;
      const poolId = event.params.marketId as unknown as string;
      const pool = await context.Pool.get(makePoolId(chainId, poolId));
      if (!pool) {
        return [undefined];
      }
      const collateralAddr = pool.collateralAssetAddr;
      const principalAddr = pool.principalTokenAddr;
      const swapAddr = pool.swapTokenAddr;
      const referenceAddr = pool.referenceAssetAddr;
      return Promise.all([
        pool,
        // Load all relevant tokens
        collateralAddr ? context.Token.get(makeTokenId(chainId, collateralAddr)) : undefined,
        principalAddr ? context.Token.get(makeTokenId(chainId, principalAddr)) : undefined,
        swapAddr ? context.Token.get(makeTokenId(chainId, swapAddr)) : undefined,
        referenceAddr ? context.Token.get(makeTokenId(chainId, referenceAddr)) : undefined,
        // Load accounts
        context.Account.get(makeAccountId(chainId, event.params.sender)),
        context.Account.get(makeAccountId(chainId, event.params.owner)),
        // Load pool assets for collateral and reference tokens
        collateralAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAddr)) : undefined,
        referenceAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn }) => {
      const [pool, collateralToken, principalToken, swapToken, referenceToken, senderAccount, ownerAccount, collateralPoolAsset, referencePoolAsset] = loaderReturn as any[];
      const chainId = event.chainId;
      const poolId = event.params.marketId as unknown as string;
      if (!pool) {
        context.log.error(`CorkPool: withdrawExtended received for unknown pool ${poolId}`);
        return;
      }
      const collateralAddr = pool.collateralAssetAddr;
      const principalAddr = pool.principalTokenAddr;
      const swapAddr = pool.swapTokenAddr;
      const referenceAddr = pool.referenceAssetAddr;
      
      // Ensure tokens. Use CPT for principal (cover principal token), CA for the
      // collateral asset, CST for the swap token, and REF for reference as per the updated
      // TokenType enum.
      let prToken = principalToken;
      if (!prToken) {
        prToken = createNewToken(chainId, principalAddr, "CPT", context.Token.set);
      }
      let collToken = collateralToken;
      if (!collToken) {
        collToken = createNewToken(chainId, collateralAddr, "CA", context.Token.set);
      }
      let swToken = swapToken;
      if (!swToken) {
        swToken = createNewToken(chainId, swapAddr, "CST", context.Token.set);
      }
      let refToken = referenceToken;
      if (!refToken) {
        refToken = createNewToken(chainId, referenceAddr, "REF", context.Token.set);
      }
      
      // Ensure accounts
      let sender = senderAccount;
      if (!sender) {
        sender = createNewAccount(chainId, event.params.sender, context.Account.set);
      }
      let owner = ownerAccount;
      if (!owner) {
        owner = createNewAccount(chainId, event.params.owner, context.Account.set);
      }
      
      // Ensure pool assets for collateral and reference tokens
      let collPool = collateralPoolAsset;
      if (!collPool) {
        collPool = createNewPoolAsset(chainId, poolId, collateralAddr, context.PoolAsset.set);
      }
      let refPool = referencePoolAsset;
      if (!refPool) {
        refPool = createNewPoolAsset(chainId, poolId, referenceAddr, context.PoolAsset.set);
      }
      
      // First pair: collateral/principal (assets0/shares0)
      const assets0 = event.params.assets0;
      const shares0 = event.params.shares0;
      if (shares0 > 0n || assets0 > 0n) {
        // Total supply is managed by Transfer events, not here
        
        // Transfer collateral from pool - only pool asset balance tracking
        context.PoolAssetEntry.set(makePoolAssetEntry(event, poolId, collateralAddr, -assets0));
        context.PoolAsset.set(subFromBalance(collPool, assets0));
      }
      
      // Second pair: reference/swap tokens (assets1/shares1)
      const assets1 = event.params.assets1;
      const shares1 = event.params.shares1;
      if (shares1 > 0n || assets1 > 0n) {
        // Total supply is managed by Transfer events, not here
        
        // Transfer reference asset from pool - only pool asset balance tracking
        context.PoolAssetEntry.set(makePoolAssetEntry(event, poolId, referenceAddr, -assets1));
        context.PoolAsset.set(subFromBalance(refPool, assets1));
      }
      
      // Persist extended withdraw event
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
    },
  });

  /**
   * Swap: User exchanges REF + CST for CA
   * IN: REF + CST (from user) → OUT: CA (to user)
   * PoolAssets: REF increases, CA decreases
   */
  Pool.Swap.handlerWithLoader({
    loader: async ({ event, context }) => {
      const chainId = event.chainId;
      const poolId = event.params.id as unknown as string;
      const pool = await context.Pool.get(makePoolId(chainId, poolId));
      if (!pool) {
        return [undefined];
      }
      const refAddr = pool.referenceAssetAddr;
      const swapAddr = pool.swapTokenAddr;
      const collAddr = pool.collateralAssetAddr;
      return Promise.all([
        pool,
        // Load relevant tokens
        refAddr ? context.Token.get(makeTokenId(chainId, refAddr)) : undefined,
        collAddr ? context.Token.get(makeTokenId(chainId, collAddr)) : undefined,
        // Load swaper account
        context.Account.get(makeAccountId(chainId, event.params.swaper)),
        // Load pool assets for CA/REF tokens
        refAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, refAddr)) : undefined,
        collAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, collAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn }) => {
      const [pool, refToken, collToken, swaperAccount, refPoolAsset, collPoolAsset] = loaderReturn as any[];
      const chainId = event.chainId;
      const poolId = event.params.id as unknown as string;
      if (!pool) {
        context.log.error(`CorkPool: swap received for unknown pool ${poolId}`);
        return;
      }
      const refAddr = pool.referenceAssetAddr;
      const swapAddr = pool.swapTokenAddr;
      const collAddr = pool.collateralAssetAddr;
      
      // Ensure tokens exist using updated types
      let refTok = refToken;
      if (!refTok) {
        refTok = createNewToken(chainId, refAddr, "REF", context.Token.set);
      }
      let colTok = collToken;
      if (!colTok) {
        colTok = createNewToken(chainId, collAddr, "CA", context.Token.set);
      }
      
      // Ensure account exists
      let swaper = swaperAccount;
      if (!swaper) {
        swaper = createNewAccount(chainId, event.params.swaper, context.Account.set);
      }
      
      // Ensure pool assets exist for CA/REF
      let refPool = refPoolAsset;
      if (!refPool) {
        refPool = createNewPoolAsset(chainId, poolId, refAddr, context.PoolAsset.set);
      }
      let collPool = collPoolAsset;
      if (!collPool) {
        collPool = createNewPoolAsset(chainId, poolId, collAddr, context.PoolAsset.set);
      }
      
      // Extract amounts
      const refAmountIn = event.params.paUsed;
      const swapAmountIn = event.params.swapTokenUsed;
      const caAmountOut = event.params.raReceived;
      
      // REF: add to pool - only pool asset balance tracking
      if (refAmountIn > 0n) {
        context.PoolAssetEntry.set(
          makePoolAssetEntry(event, poolId, refAddr, refAmountIn),
        );
        context.PoolAsset.set(addToBalance(refPool, refAmountIn));
      }
      
      // CST: CST balance changes handled by Transfer events, not here
      // We only track pool CST assets if needed for pool-level tracking
      
      // CA: transfer from pool - only pool asset balance tracking
      if (caAmountOut > 0n) {
        context.PoolAssetEntry.set(
          makePoolAssetEntry(event, poolId, collAddr, -caAmountOut),
        );
        context.PoolAsset.set(subFromBalance(collPool, caAmountOut));
      }
      
      // Persist swap event entity
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
    },
  });

  /**
   * UnwindSwap: User deposits CA, receives REF + CST
   * IN: CA (from user) → OUT: REF + CST (to user)  
   * PoolAssets: CA increases, REF decreases
   */
  Pool.UnwindSwap.handlerWithLoader({
    loader: async ({ event, context }) => {
      const chainId = event.chainId;
      const poolId = event.params.id as unknown as string;
      const pool = await context.Pool.get(makePoolId(chainId, poolId));
      if (!pool) {
        return [undefined];
      }
      const refAddr = pool.referenceAssetAddr;
      const swapAddr = pool.swapTokenAddr;
      const collAddr = pool.collateralAssetAddr;
      return Promise.all([
        pool,
        // Load relevant tokens
        refAddr ? context.Token.get(makeTokenId(chainId, refAddr)) : undefined,
        collAddr ? context.Token.get(makeTokenId(chainId, collAddr)) : undefined,
        // Load buyer account
        context.Account.get(makeAccountId(chainId, event.params.buyer)),
        // Load pool assets for CA/REF tokens
        refAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, refAddr)) : undefined,
        collAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolId, collAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn }) => {
      const [pool, refToken, collToken, buyerAccount, refPoolAsset, collPoolAsset] = loaderReturn as any[];
      const chainId = event.chainId;
      const poolId = event.params.id as unknown as string;
      if (!pool) {
        context.log.error(`CorkPool: unwindSwap received for unknown pool ${poolId}`);
        return;
      }
      const refAddr = pool.referenceAssetAddr;
      const swapAddr = pool.swapTokenAddr;
      const collAddr = pool.collateralAssetAddr;
      
      // Ensure tokens
      let refTok = refToken;
      if (!refTok) {
        refTok = createNewToken(chainId, refAddr, "REF", context.Token.set);
      }
      let colTok = collToken;
      if (!colTok) {
        colTok = createNewToken(chainId, collAddr, "CA", context.Token.set);
      }
      
      // Ensure account exists
      let buyer = buyerAccount;
      if (!buyer) {
        buyer = createNewAccount(chainId, event.params.buyer, context.Account.set);
      }
      
      // Ensure pool assets for CA/REF
      let refPool = refPoolAsset;
      if (!refPool) {
        refPool = createNewPoolAsset(chainId, poolId, refAddr, context.PoolAsset.set);
      }
      let collPool = collPoolAsset;
      if (!collPool) {
        collPool = createNewPoolAsset(chainId, poolId, collAddr, context.PoolAsset.set);
      }
      
      // Amounts
      const caAmountIn = event.params.raUsed;
      const refAmountOut = event.params.receivedReferenceAsset;
      const swapAmountOut = event.params.receivedSwapToken;
      
      // Deposit CA: add to pool - only pool asset balance tracking
      if (caAmountIn > 0n) {
        context.PoolAssetEntry.set(
          makePoolAssetEntry(event, poolId, collAddr, caAmountIn),
        );
        context.PoolAsset.set(addToBalance(collPool, caAmountIn));
      }
      
      // Withdraw REF: subtract from pool - only pool asset balance tracking
      if (refAmountOut > 0n) {
        context.PoolAssetEntry.set(
          makePoolAssetEntry(event, poolId, refAddr, -refAmountOut),
        );
        context.PoolAsset.set(subFromBalance(refPool, refAmountOut));
      }
      
      // CST: CST balance changes handled by Transfer events, not here
      // We don't manage CST user balances or pool assets in this handler
      
      // Persist unwindSwap event entity
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
    },
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
