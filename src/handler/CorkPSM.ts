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

import { createNewToken, makeCoverTerm, makeIsolatedMarket, makeLvPool, makePsmPool } from "../helper";

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

  CorkCore.PsmDeposited.handler(async ({ event, context }) => {
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
  });

  CorkCore.Cancelled.handler(async ({ event, context }) => {
    const entity: CorkCore_Cancelled = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      event_id: event.params.id,
      dsId: event.params.dsId,
      redeemer: event.params.redeemer,
      raAmount: event.params.raAmount,
      swapAmount: event.params.swapAmount,
    };
  
    context.CorkCore_Cancelled.set(entity);
  });
  
  CorkCore.CtRedeemed.handler(async ({ event, context }) => {
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
  });
  
  CorkCore.DsRedeemed.handler(async ({ event, context }) => {
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
  });

  CorkCore.Repurchased.handler(async ({ event, context }) => {
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
  });
}
