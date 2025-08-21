import type {
    SharesFactory,
    SharesFactory_CorkPoolChanged,
    SharesFactory_Initialized,
    SharesFactory_OwnershipTransferred,
    SharesFactory_SharesDeployed,
    SharesFactory_Upgraded,
  } from "generated";
  

  // ========================================
  // SIMPLE EVENT RECORDING HANDLERS
  // ========================================

  export function attachEventHandlers<T extends typeof SharesFactory>(
    Factory: T,
  ): void {
    // Persist CorkPoolChanged events
    Factory.CorkPoolChanged.handler(async ({ event, context }) => {
      const entity: SharesFactory_CorkPoolChanged = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        oldCorkPool: event.params.oldCorkPool,
        newCorkPool: event.params.newCorkPool,
      };
      context.SharesFactory_CorkPoolChanged.set(entity);
    });
  
    // Persist initialization events
    Factory.Initialized.handler(async ({ event, context }) => {
      const entity: SharesFactory_Initialized = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        version: event.params.version,
      };
      context.SharesFactory_Initialized.set(entity);
    });
  
    // Persist ownership transfers
    Factory.OwnershipTransferred.handler(async ({ event, context }) => {
      const entity: SharesFactory_OwnershipTransferred = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        previousOwner: event.params.previousOwner,
        newOwner: event.params.newOwner,
      };
      context.SharesFactory_OwnershipTransferred.set(entity);
    });
  
    // Persist upgrades
    Factory.Upgraded.handler(async ({ event, context }) => {
      const entity: SharesFactory_Upgraded = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        implementation: event.params.implementation,
      };
      context.SharesFactory_Upgraded.set(entity);
    });
  }
  