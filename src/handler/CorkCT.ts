/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  CorkCT,
  CorkCT_Approval,
  CorkCT_EIP712DomainChanged,
  CorkCT_OwnershipTransferred,
  CorkCT_Transfer,
} from "generated";

export function attachEventHandlers<T extends typeof CorkCT>(
  ERC20: T,
): void {
  ERC20.Approval.handler(async ({ event, context }) => {
    const entity: CorkCT_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkCT_Approval.set(entity);
  });
  
  ERC20.EIP712DomainChanged.handler(async ({ event, context }) => {
    const entity: CorkCT_EIP712DomainChanged = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      srcAddress: event.srcAddress,
    };
  
    context.CorkCT_EIP712DomainChanged.set(entity);
  });
  
  ERC20.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity: CorkCT_OwnershipTransferred = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
      srcAddress: event.srcAddress,
    };
  
    context.CorkCT_OwnershipTransferred.set(entity);
  });
  
  ERC20.Transfer.handler(async ({ event, context }) => {
    const entity: CorkCT_Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      value: event.params.value,
      srcAddress: event.srcAddress,
    };
  
    context.CorkCT_Transfer.set(entity);
  });
}
