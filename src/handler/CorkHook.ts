/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  CorkHook,
  CorkHook_AddedLiquidity,
  CorkHook_Initialized,
  CorkHook_OwnershipTransferred,
  CorkHook_RemovedLiquidity,
  CorkHook_Swapped,
  HandlerTypes_eventConfig,
} from "generated";

type PreRegisterDynamicContracts = HandlerTypes_eventConfig<unknown>["preRegisterDynamicContracts"];

export function attachEventHandlers<T extends typeof CorkHook>(
  Hook: T,
  preRegisterDynamicContracts: PreRegisterDynamicContracts = true,
): void {
  const contractRegisterOpts = {
    preRegisterDynamicContracts,
  };

  Hook.Initialized.contractRegister(
    ({ event, context }) => {
      context.addCorkLPT(event.params.liquidityToken);
    },
    contractRegisterOpts
  );

  Hook.AddedLiquidity.handler(async ({ event, context }) => {
    const entity: CorkHook_AddedLiquidity = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      ra: event.params.ra,
      ct: event.params.ct,
      raAmount: event.params.raAmount,
      ctAmount: event.params.ctAmount,
      mintedLp: event.params.mintedLp,
      who: event.params.who,
    };
  
    context.CorkHook_AddedLiquidity.set(entity);
  });
  
  Hook.Initialized.handler(async ({ event, context }) => {
    const entity: CorkHook_Initialized = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      ra: event.params.ra,
      ct: event.params.ct,
      liquidityToken: event.params.liquidityToken,
    };
  
    context.CorkHook_Initialized.set(entity);
  });
  
  Hook.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity: CorkHook_OwnershipTransferred = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
    };
  
    context.CorkHook_OwnershipTransferred.set(entity);
  });
  
  Hook.RemovedLiquidity.handler(async ({ event, context }) => {
    const entity: CorkHook_RemovedLiquidity = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      ra: event.params.ra,
      ct: event.params.ct,
      raAmount: event.params.raAmount,
      ctAmount: event.params.ctAmount,
      who: event.params.who,
    };
  
    context.CorkHook_RemovedLiquidity.set(entity);
  });
  
  Hook.Swapped.handler(async ({ event, context }) => {
    const entity: CorkHook_Swapped = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      input: event.params.input,
      output: event.params.output,
      amountIn: event.params.amountIn,
      amountOut: event.params.amountOut,
      who: event.params.who,
      baseFeePercentage: event.params.baseFeePercentage,
      realizedFeePercentage: event.params.realizedFeePercentage,
      realizedFeeAmount: event.params.realizedFeeAmount,
    };
  
    context.CorkHook_Swapped.set(entity);
  });
}
