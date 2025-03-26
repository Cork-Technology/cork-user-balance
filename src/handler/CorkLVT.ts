/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  CorkLVT,
  CorkLVT_Approval,
  CorkLVT_EIP712DomainChanged,
  CorkLVT_OwnershipTransferred,
  CorkLVT_Transfer,
} from "generated";

export function attachEventHandlers<T extends typeof CorkLVT>(
  ERC20: T,
): void {
  ERC20.Approval.handler(async ({ event, context }) => {
    const entity: CorkLVT_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLVT_Approval.set(entity);
  });
  
  ERC20.EIP712DomainChanged.handler(async ({ event, context }) => {
    const entity: CorkLVT_EIP712DomainChanged = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLVT_EIP712DomainChanged.set(entity);
  });
  
  ERC20.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity: CorkLVT_OwnershipTransferred = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLVT_OwnershipTransferred.set(entity);
  });
  
  ERC20.Transfer.handler(async ({ event, context }) => {
    const entity: CorkLVT_Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkLVT_Transfer.set(entity);
  });
}
