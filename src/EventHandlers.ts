/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  CorkCore,
  // CorkCore_Cancelled,
  // CorkCore_CtRedeemed,
  // CorkCore_DsRedeemed,
  CorkCore_EarlyRedemptionFeeRateUpdated,
  CorkCore_Initialized,
  // CorkCore_InitializedModuleCore,
  // CorkCore_Issued,
  CorkCore_LiquidationFundsRequested,
  CorkCore_LvDeposited,
  CorkCore_LvDepositsStatusUpdated,
  CorkCore_LvRedeemEarly,
  CorkCore_LvWithdrawalsStatusUpdated,
  CorkCore_OwnershipTransferred,
  CorkCore_ProfitReceived,
  CorkCore_PsmBaseRedemptionFeePercentageUpdated,
  // CorkCore_PsmDeposited,
  CorkCore_PsmDepositsStatusUpdated,
  CorkCore_PsmRepurchasesStatusUpdated,
  CorkCore_PsmWithdrawalsStatusUpdated,
  CorkCore_RateUpdated,
  CorkCore_RepurchaseFeeRateUpdated,
  // CorkCore_Repurchased,
  CorkCore_RolledOver,
  CorkCore_RolloverProfitClaimed,
  CorkCore_SnapshotUpdated,
  CorkCore_TradeExecutionResultFundsReceived,
  CorkCore_TradeExecutionResultFundsUsed,
  CorkCore_Upgraded,
  CorkCore_VaultNavThresholdUpdated,
  CorkHook,
  CorkCT,
  CorkLPT,
  CorkLVT,
  Withdrawal,
  Withdrawal_WithdrawalClaimed,
  Withdrawal_WithdrawalRequested,
} from "generated";

import { attachEventHandlers as attachEventHandlersPSM } from "./handler/CorkPSM";
import { attachEventHandlers as attachEventHandlersHook } from "./handler/CorkHook";
import { attachEventHandlers as attachEventHandlersCT } from "./handler/CorkCT";
import { attachEventHandlers as attachEventHandlersLPT } from "./handler/CorkLPT";
import { attachEventHandlers as attachEventHandlersLVT } from "./handler/CorkLVT";

attachEventHandlersPSM(CorkCore);
attachEventHandlersHook(CorkHook);
attachEventHandlersCT(CorkCT);
attachEventHandlersLPT(CorkLPT);
attachEventHandlersLVT(CorkLVT);

/******************************************************************************
 * Event Handlers generated by `envio init` command
 *****************************************************************************/

CorkCore.EarlyRedemptionFeeRateUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_EarlyRedemptionFeeRateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    earlyRedemptionFeeRate: event.params.earlyRedemptionFeeRate,
  };

  context.CorkCore_EarlyRedemptionFeeRateUpdated.set(entity);
});

CorkCore.Initialized.handler(async ({ event, context }) => {
  const entity: CorkCore_Initialized = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    version: event.params.version,
  };

  context.CorkCore_Initialized.set(entity);
});

CorkCore.LiquidationFundsRequested.handler(async ({ event, context }) => {
  const entity: CorkCore_LiquidationFundsRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    who: event.params.who,
    amount: event.params.amount,
  };

  context.CorkCore_LiquidationFundsRequested.set(entity);
});

CorkCore.LvDeposited.handler(async ({ event, context }) => {
  const entity: CorkCore_LvDeposited = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    depositor: event.params.depositor,
    received: event.params.received,
    deposited: event.params.deposited,
  };

  context.CorkCore_LvDeposited.set(entity);
});

CorkCore.LvDepositsStatusUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_LvDepositsStatusUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    isLVDepositPaused: event.params.isLVDepositPaused,
  };

  context.CorkCore_LvDepositsStatusUpdated.set(entity);
});

CorkCore.LvRedeemEarly.handler(async ({ event, context }) => {
  const entity: CorkCore_LvRedeemEarly = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    redeemer: event.params.redeemer,
    receiver: event.params.receiver,
    lvBurned: event.params.lvBurned,
    ctReceivedFromAmm: event.params.ctReceivedFromAmm,
    ctReceivedFromVault: event.params.ctReceivedFromVault,
    dsReceived: event.params.dsReceived,
    paReceived: event.params.paReceived,
    raReceivedFromAmm: event.params.raReceivedFromAmm,
    raIdleReceived: event.params.raIdleReceived,
    withdrawalId: event.params.withdrawalId,
  };

  context.CorkCore_LvRedeemEarly.set(entity);
});

CorkCore.LvWithdrawalsStatusUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_LvWithdrawalsStatusUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    isLVWithdrawalPaused: event.params.isLVWithdrawalPaused,
  };

  context.CorkCore_LvWithdrawalsStatusUpdated.set(entity);
});

CorkCore.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: CorkCore_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.CorkCore_OwnershipTransferred.set(entity);
});

CorkCore.ProfitReceived.handler(async ({ event, context }) => {
  const entity: CorkCore_ProfitReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    router: event.params.router,
    amount: event.params.amount,
  };

  context.CorkCore_ProfitReceived.set(entity);
});

CorkCore.PsmBaseRedemptionFeePercentageUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_PsmBaseRedemptionFeePercentageUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    psmBaseRedemptionFeePercentage: event.params.psmBaseRedemptionFeePercentage,
  };

  context.CorkCore_PsmBaseRedemptionFeePercentageUpdated.set(entity);
});

CorkCore.PsmDepositsStatusUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_PsmDepositsStatusUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    isPSMDepositPaused: event.params.isPSMDepositPaused,
  };

  context.CorkCore_PsmDepositsStatusUpdated.set(entity);
});

CorkCore.PsmRepurchasesStatusUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_PsmRepurchasesStatusUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    isPSMRepurchasePaused: event.params.isPSMRepurchasePaused,
  };

  context.CorkCore_PsmRepurchasesStatusUpdated.set(entity);
});

CorkCore.PsmWithdrawalsStatusUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_PsmWithdrawalsStatusUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    isPSMWithdrawalPaused: event.params.isPSMWithdrawalPaused,
  };

  context.CorkCore_PsmWithdrawalsStatusUpdated.set(entity);
});

CorkCore.RateUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_RateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    newRate: event.params.newRate,
    previousRate: event.params.previousRate,
  };

  context.CorkCore_RateUpdated.set(entity);
});

CorkCore.RepurchaseFeeRateUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_RepurchaseFeeRateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    repurchaseFeeRate: event.params.repurchaseFeeRate,
  };

  context.CorkCore_RepurchaseFeeRateUpdated.set(entity);
});

CorkCore.RolledOver.handler(async ({ event, context }) => {
  const entity: CorkCore_RolledOver = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    currentDsId: event.params.currentDsId,
    owner: event.params.owner,
    prevDsId: event.params.prevDsId,
    amountCtRolledOver: event.params.amountCtRolledOver,
    dsReceived: event.params.dsReceived,
    ctReceived: event.params.ctReceived,
    paReceived: event.params.paReceived,
  };

  context.CorkCore_RolledOver.set(entity);
});

CorkCore.RolloverProfitClaimed.handler(async ({ event, context }) => {
  const entity: CorkCore_RolloverProfitClaimed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    dsId: event.params.dsId,
    owner: event.params.owner,
    amount: event.params.amount,
    profit: event.params.profit,
    remainingDs: event.params.remainingDs,
  };

  context.CorkCore_RolloverProfitClaimed.set(entity);
});

CorkCore.SnapshotUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_SnapshotUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    snapshotIndex: event.params.snapshotIndex,
    newValue: event.params.newValue,
  };

  context.CorkCore_SnapshotUpdated.set(entity);
});

CorkCore.TradeExecutionResultFundsReceived.handler(async ({ event, context }) => {
  const entity: CorkCore_TradeExecutionResultFundsReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    who: event.params.who,
    amount: event.params.amount,
  };

  context.CorkCore_TradeExecutionResultFundsReceived.set(entity);
});

CorkCore.TradeExecutionResultFundsUsed.handler(async ({ event, context }) => {
  const entity: CorkCore_TradeExecutionResultFundsUsed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    who: event.params.who,
    amount: event.params.amount,
  };

  context.CorkCore_TradeExecutionResultFundsUsed.set(entity);
});

CorkCore.Upgraded.handler(async ({ event, context }) => {
  const entity: CorkCore_Upgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    implementation: event.params.implementation,
  };

  context.CorkCore_Upgraded.set(entity);
});

CorkCore.VaultNavThresholdUpdated.handler(async ({ event, context }) => {
  const entity: CorkCore_VaultNavThresholdUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    navThreshold: event.params.navThreshold,
  };

  context.CorkCore_VaultNavThresholdUpdated.set(entity);
});

Withdrawal.WithdrawalClaimed.handler(async ({ event, context }) => {
  const entity: Withdrawal_WithdrawalClaimed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    withdrawalId: event.params.withdrawalId,
    owner: event.params.owner,
  };

  context.Withdrawal_WithdrawalClaimed.set(entity);
});

Withdrawal.WithdrawalRequested.handler(async ({ event, context }) => {
  const entity: Withdrawal_WithdrawalRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    withdrawalId: event.params.withdrawalId,
    owner: event.params.owner,
    claimableAt: event.params.claimableAt,
  };

  context.Withdrawal_WithdrawalRequested.set(entity);
});
