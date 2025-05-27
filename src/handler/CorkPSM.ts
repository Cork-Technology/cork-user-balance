/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  CorkCore,
  CorkCore_InitializedModuleCore,
  CorkCore_Issued,
  CorkCore_Cancelled,
  CorkCore_CtRedeemed,
  CorkCore_DsRedeemed,
  CorkCore_PsmDeposited,
  CorkCore_Repurchased,
  HandlerTypes_eventConfig,
} from "generated";

import { addToBalance, createNewPoolAsset, createNewToken, makeCoverTerm, makeIsolatedMarket, makeIsolatedMarketId, makeLvPool, makePoolAssetEntry, makePoolAssetId, makePsmPool, subFromBalance } from "../helper";

type ICorkPsm = Pick<typeof CorkCore, "InitializedModuleCore" | "Issued" | "PsmDeposited" | "Cancelled" | "CtRedeemed" | "DsRedeemed" | "Repurchased">;
type PreRegisterDynamicContracts = HandlerTypes_eventConfig<unknown>["preRegisterDynamicContracts"];

export function attachEventHandlers<T extends ICorkPsm>(
  CorkCore: T,
  preRegisterDynamicContracts: PreRegisterDynamicContracts = true,
): void {
  const contractRegisterOpts = {
    preRegisterDynamicContracts,
  };

  CorkCore.InitializedModuleCore.contractRegister(
    ({ event, context }) => {
      context.addCorkLVT(event.params.lv);
    },
    contractRegisterOpts
  );

  CorkCore.Issued.contractRegister(
    ({ event, context }) => {
      context.addCorkDS(event.params.ds);
      context.addCorkCT(event.params.ct);
    },
    contractRegisterOpts
  );

  CorkCore.InitializedModuleCore.handler(async ({ event, context }) => {
    const {
      chainId,
      params: {
        id: marketKey,
        pa: paTokenAddr,
        ra: raTokenAddr,
        expiry: expiryInterval,
        initialArp,
        exchangeRateProvider,
        lv: lvTokenAddress,
      },
      srcAddress: managerAddress,
    } = event;

    createNewToken(chainId, paTokenAddr, "ERC20", context.Token.set);
    createNewToken(chainId, raTokenAddr, "ERC20", context.Token.set);
    context.IsolatedMarket.set(
      makeIsolatedMarket(
        event,
        marketKey,
        {
          paTokenAddr,
          raTokenAddr,
          initialArp,
          expiryInterval,
          exchangeRateProvider,
        }
      )
    );
    createNewToken(chainId, lvTokenAddress, "LVT", context.Token.set);
    context.Pool.set(
      makeLvPool(
        chainId,
        managerAddress,
        marketKey,
        lvTokenAddress,
      )
    );

    const entity: CorkCore_InitializedModuleCore = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      pa: event.params.pa,
      ra: event.params.ra,
      lv: event.params.lv,
      expiry: event.params.expiry,
      initialArp: event.params.initialArp,
      exchangeRateProvider: event.params.exchangeRateProvider,
    };
  
    context.CorkCore_InitializedModuleCore.set(entity);
  });
  
  CorkCore.Issued.handler(async ({ event, context }) => {
    const {
      chainId,
      params: {
        id: marketKey,
        dsId: termKey,
        ds: dsTokenAddress,
        ct: coverTokenAddress,
      },
      srcAddress: managerAddress,
    } = event;

    context.CoverTerm.set(
      makeCoverTerm(
        event,
        marketKey,
        termKey,
      )
    );
    createNewToken(chainId, dsTokenAddress, "DS", context.Token.set);
    createNewToken(chainId, coverTokenAddress, "CT", context.Token.set);
    context.Pool.set(
      makePsmPool(
        chainId,
        marketKey,
        termKey,
        managerAddress,
        coverTokenAddress,
      )
    );   

    const entity: CorkCore_Issued = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      dsId: event.params.dsId,
      expiry: event.params.expiry,
      ds: event.params.ds,
      ct: event.params.ct,
      raCtUniPairId: event.params.raCtUniPairId,
    };
  
    context.CorkCore_Issued.set(entity);
  });

  CorkCore.PsmDeposited.handlerWithLoader({
    // event PsmDeposited(Id indexed id, uint256 indexed dsId, address indexed depositor, uint256 amount, uint256 received, uint256 exchangeRate)
    // IN: RA
    // OUT: DS + CT
    loader: async ({ event, context }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
        },
      } = event;

      const market = await context.IsolatedMarket.get(makeIsolatedMarketId(chainId, marketKey));
      const { raTokenAddr } = market || {};

      const poolKey = `${marketKey}:${termKey}:PSM`;
      return Promise.all([
        market,
        raTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, raTokenAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn: [market, raPoolAsset] }) => {
      const {
        id: marketKey,
        dsId: termKey,
        amount: raAmountIn,
      } = event.params;

      if (!market) {
        context.log.error(`IsolatedMarket not found for marketKey: ${marketKey}`);
      } else {
        const { raTokenAddr } = market;
        const poolKey = `${marketKey}:${termKey}:PSM`;

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            raTokenAddr,
            raAmountIn,
          )
        );

        context.PoolAsset.set(
          addToBalance(
            raPoolAsset ?? createNewPoolAsset(event.chainId, poolKey, raTokenAddr, context.PoolAsset.set),
            raAmountIn,
          )
        );
      }

      const entity: CorkCore_PsmDeposited = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        dsId: event.params.dsId,
        depositor: event.params.depositor,
        amount: event.params.amount,
        received: event.params.received,
        exchangeRate: event.params.exchangeRate,
      };
    
      context.CorkCore_PsmDeposited.set(entity);
    },
  });

  CorkCore.Cancelled.handlerWithLoader({
    // event Cancelled(Id indexed id, uint256 indexed dsId, address indexed redeemer, uint256 raAmount, uint256 swapAmount)
    // IN: CT + DS
    // OUT: RA
    loader: async ({ event, context }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
        },
      } = event;

      const market = await context.IsolatedMarket.get(makeIsolatedMarketId(chainId, marketKey));
      const { raTokenAddr } = market || {};

      const poolKey = `${marketKey}:${termKey}:PSM`;
      return Promise.all([
        market,
        raTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, raTokenAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn: [market, raPoolAsset] }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
          raAmount: raAmountOut,
        },
      } = event;

      if (!market) {
        context.log.error(`IsolatedMarket not found for marketKey: ${marketKey}`);
      } else {
        const { raTokenAddr } = market;
        const poolKey = `${marketKey}:${termKey}:PSM`;

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            raTokenAddr,
            -raAmountOut,
          )
        );

        context.PoolAsset.set(
          subFromBalance(
            raPoolAsset ?? createNewPoolAsset(chainId, poolKey, raTokenAddr, context.PoolAsset.set),
            raAmountOut,
          )
        );
      }

      const entity: CorkCore_Cancelled = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        dsId: event.params.dsId,
        redeemer: event.params.redeemer,
        raAmount: event.params.raAmount,
        swapAmount: event.params.swapAmount,
      };
    
      context.CorkCore_Cancelled.set(entity);
    },
  });
  
  CorkCore.CtRedeemed.handlerWithLoader({
    // event CtRedeemed(Id indexed id, uint256 indexed dsId, address indexed redeemer, uint256 amount, uint256 paReceived, uint256 raReceived)
    // IN: CT
    // OUT: PA + RA
    loader: async ({ event, context }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
        },
      } = event;

      const market = await context.IsolatedMarket.get(makeIsolatedMarketId(chainId, marketKey));
      const { paTokenAddr, raTokenAddr } = market || {};

      const poolKey = `${marketKey}:${termKey}:PSM`;
      return Promise.all([
        market,
        paTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, paTokenAddr)) : undefined,
        raTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, raTokenAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn: [market, paPoolAsset, raPoolAsset] }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
          paReceived: paAmountOut,
          raReceived: raAmountOut,
        },
      } = event;

      if (!market) {
        context.log.error(`IsolatedMarket not found for marketKey: ${marketKey}`);
      } else {
        const { paTokenAddr, raTokenAddr } = market;
        const poolKey = `${marketKey}:${termKey}:PSM`;

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            paTokenAddr,
            -paAmountOut,
          )
        );

        context.PoolAsset.set(
          subFromBalance(
            paPoolAsset ?? createNewPoolAsset(chainId, poolKey, paTokenAddr, context.PoolAsset.set),
            -paAmountOut,
          )
        );

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            raTokenAddr,
            -raAmountOut,
          )
        );

        context.PoolAsset.set(
          subFromBalance(
            raPoolAsset ?? createNewPoolAsset(chainId, poolKey, raTokenAddr, context.PoolAsset.set),
            -raAmountOut,
          )
        );
      }

      const entity: CorkCore_CtRedeemed = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        dsId: event.params.dsId,
        redeemer: event.params.redeemer,
        amount: event.params.amount,
        paReceived: event.params.paReceived,
        raReceived: event.params.raReceived,
      };
    
      context.CorkCore_CtRedeemed.set(entity);
    },
  });
  
  CorkCore.DsRedeemed.handlerWithLoader({
    // event DsRedeemed(Id indexed id, uint256 indexed dsId, address indexed redeemer, uint256 paUsed, uint256 dsUsed, uint256 raReceived, uint256 dsExchangeRate, uint256 feePercentage, uint256 fee)
    // IN: DS + PA
    // OUT: RA + fee
    loader: async ({ event, context }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
        },
      } = event;

      const market = await context.IsolatedMarket.get(makeIsolatedMarketId(chainId, marketKey));
      const { paTokenAddr, raTokenAddr } = market || {};

      const poolKey = `${marketKey}:${termKey}:PSM`;
      return Promise.all([
        market,
        paTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, paTokenAddr)) : undefined,
        raTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, raTokenAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn: [market, paPoolAsset, raPoolAsset] }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
          paUsed: paAmountIn,
          raReceived: raAmountOut,
          fee: raFeeOut,
        },
      } = event;

      if (!market) {
        context.log.error(`IsolatedMarket not found for marketKey: ${marketKey}`);
      } else {
        const { paTokenAddr, raTokenAddr } = market;
        const poolKey = `${marketKey}:${termKey}:PSM`;

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            paTokenAddr,
            -paAmountIn,
          )
        );

        context.PoolAsset.set(
          addToBalance(
            paPoolAsset ?? createNewPoolAsset(chainId, poolKey, paTokenAddr, context.PoolAsset.set),
            paAmountIn,
          )
        );

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            raTokenAddr,
            -(raAmountOut + raFeeOut),
          )
        );

        context.PoolAsset.set(
          subFromBalance(
            raPoolAsset ?? createNewPoolAsset(chainId, poolKey, raTokenAddr, context.PoolAsset.set),
            (raAmountOut + raFeeOut),
          )
        );
      }

      const entity: CorkCore_DsRedeemed = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        dsId: event.params.dsId,
        redeemer: event.params.redeemer,
        paUsed: event.params.paUsed,
        dsUsed: event.params.dsUsed,
        raReceived: event.params.raReceived,
        dsExchangeRate: event.params.dsExchangeRate,
        feePercentage: event.params.feePercentage,
        fee: event.params.fee,
      };
    
      context.CorkCore_DsRedeemed.set(entity);
    },
  });

  CorkCore.Repurchased.handlerWithLoader({
    // event Repurchased(Id indexed id, address indexed buyer, uint256 indexed dsId, uint256 raUsed, uint256 receivedPa, uint256 receivedDs, uint256 feePercentage, uint256 fee, uint256 exchangeRates)
    // IN: RA (raUsed includes fee)
    // OUT: PA + DS
    loader: async ({ event, context }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
        },
      } = event;

      const market = await context.IsolatedMarket.get(makeIsolatedMarketId(chainId, marketKey));
      const { paTokenAddr, raTokenAddr } = market || {};

      const poolKey = `${marketKey}:${termKey}:PSM`;
      return Promise.all([
        market,
        paTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, paTokenAddr)) : undefined,
        raTokenAddr ? context.PoolAsset.get(makePoolAssetId(chainId, poolKey, raTokenAddr)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn: [market, paPoolAsset, raPoolAsset] }) => {
      const {
        chainId,
        params: {
          id: marketKey,
          dsId: termKey,
          raUsed: raAmountIn,
          receivedPa: paAmountOut,
          fee: raFeeOut,
        },
      } = event;

      if (!market) {
        context.log.error(`IsolatedMarket not found for marketKey: ${marketKey}`);
      } else {
        const { paTokenAddr, raTokenAddr } = market;
        const poolKey = `${marketKey}:${termKey}:PSM`;

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            paTokenAddr,
            -paAmountOut,
          )
        );

        context.PoolAsset.set(
          subFromBalance(
            paPoolAsset ?? createNewPoolAsset(chainId, poolKey, paTokenAddr, context.PoolAsset.set),
            paAmountOut,
          )
        );

        context.PoolAssetEntry.set(
          makePoolAssetEntry(
            event,
            poolKey,
            raTokenAddr,
            raAmountIn - raFeeOut,
          )
        );

        context.PoolAsset.set(
          addToBalance(
            raPoolAsset ?? createNewPoolAsset(chainId, poolKey, raTokenAddr, context.PoolAsset.set),
            raAmountIn - raFeeOut,
          )
        );
      }

      const entity: CorkCore_Repurchased = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        event_id: event.params.id,
        buyer: event.params.buyer,
        dsId: event.params.dsId,
        raUsed: event.params.raUsed,
        receivedPa: event.params.receivedPa,
        receivedDs: event.params.receivedDs,
        feePercentage: event.params.feePercentage,
        fee: event.params.fee,
        exchangeRates: event.params.exchangeRates,
      };
    
      context.CorkCore_Repurchased.set(entity);
    },
  });
}
