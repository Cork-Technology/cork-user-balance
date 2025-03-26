/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  CorkLPT,
  CorkLPT_Approval,
  CorkLPT_EIP712DomainChanged,
  CorkLPT_Initialized,
  CorkLPT_OwnershipTransferred,
  CorkLPT_Transfer,
} from "generated";

export function attachEventHandlers<T extends typeof CorkLPT>(
  ERC20: T,
): void {
  ERC20.Approval.handler(async ({ event, context }) => {
    const entity: CorkLPT_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLPT_Approval.set(entity);
  });
  
  ERC20.EIP712DomainChanged.handler(async ({ event, context }) => {
    const entity: CorkLPT_EIP712DomainChanged = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLPT_EIP712DomainChanged.set(entity);
  });
  
  ERC20.Initialized.handler(async ({ event, context }) => {
    const entity: CorkLPT_Initialized = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      version: event.params.version,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLPT_Initialized.set(entity);
  });
  
  ERC20.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity: CorkLPT_OwnershipTransferred = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLPT_OwnershipTransferred.set(entity);
  });
  
  ERC20.Transfer.handler(async ({ event, context }) => {
    const entity: CorkLPT_Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLPT_Transfer.set(entity);
  });
}
