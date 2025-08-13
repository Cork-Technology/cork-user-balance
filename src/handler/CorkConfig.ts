import type {
    CorkConfig,
    CorkConfig_CorkPoolSet,
    CorkConfig_Paused,
    CorkConfig_RoleAdminChanged,
    CorkConfig_RoleGranted,
    CorkConfig_RoleRevoked,
    CorkConfig_TreasurySet,
    CorkConfig_Unpaused,
  } from "generated";
  
  export function attachEventHandlers<T extends typeof CorkConfig>(
    Config: T,
  ): void {

    Config.CorkPoolSet.contractRegister(({event, context}) => {
      context.addCorkPool(event.params.corkPool);
    })
    
    Config.CorkPoolSet.handler(async ({ event, context }) => {
      const entity: CorkConfig_CorkPoolSet = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        corkPool: event.params.corkPool,
      };
      context.CorkConfig_CorkPoolSet.set(entity);
    });
  
    Config.Paused.handler(async ({ event, context }) => {
      const entity: CorkConfig_Paused = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        account: event.params.account,
      };
      context.CorkConfig_Paused.set(entity);
    });
  
    Config.RoleAdminChanged.handler(async ({ event, context }) => {
      const entity: CorkConfig_RoleAdminChanged = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        role: event.params.role,
        previousAdminRole: event.params.previousAdminRole,
        newAdminRole: event.params.newAdminRole,
      };
      context.CorkConfig_RoleAdminChanged.set(entity);
    });
  
    Config.RoleGranted.handler(async ({ event, context }) => {
      const entity: CorkConfig_RoleGranted = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        role: event.params.role,
        account: event.params.account,
        sender: event.params.sender,
      };
      context.CorkConfig_RoleGranted.set(entity);
    });
  
    Config.RoleRevoked.handler(async ({ event, context }) => {
      const entity: CorkConfig_RoleRevoked = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        role: event.params.role,
        account: event.params.account,
        sender: event.params.sender,
      };
      context.CorkConfig_RoleRevoked.set(entity);
    });
  
    Config.TreasurySet.handler(async ({ event, context }) => {
      const entity: CorkConfig_TreasurySet = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        treasury: event.params.treasury,
      };
      context.CorkConfig_TreasurySet.set(entity);
    });
  
    Config.Unpaused.handler(async ({ event, context }) => {
      const entity: CorkConfig_Unpaused = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        account: event.params.account,
      };
      context.CorkConfig_Unpaused.set(entity);
    });
  }
  