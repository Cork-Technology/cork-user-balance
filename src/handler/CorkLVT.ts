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

import {
  addToBalance,
  subFromBalance,
  createNewAccount,
  createNewAccountToken,
  createNewToken,
  makeAccountId,
  makeAccountTokenEntry,
  makeAccountTokenId,
  makeTokenApproval,
  makeTokenId,
  makeTokenTransfer,
  ZERO_ADDRESS,
} from "../helper";

export const TOKEN_TYPE = "LVT";

export function attachEventHandlers<T extends typeof CorkLVT>(
  ERC20: T,
): void {
  // ERC20.Approval.handler(async ({ event, context }) => {
  //   const entity: CorkLVT_Approval = {
  //     id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
  //     owner: event.params.owner,
  //     spender: event.params.spender,
  //     value: event.params.value,
  //     srcAddress: event.srcAddress,
  //   };
  
  //   context.CorkLVT_Approval.set(entity);
  // });
  
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
  
  // ERC20.Transfer.handler(async ({ event, context }) => {
  //   const entity: CorkLVT_Transfer = {
  //     id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
  //     from: event.params.from,
  //     to: event.params.to,
  //     value: event.params.value,
  //     srcAddress: event.srcAddress,
  //   };
  
  //   context.CorkLVT_Transfer.set(entity);
  // });

  ERC20.Approval.handlerWithLoader({
    loader: async ({ event, context }) => Promise.all([
      context.Token.get(makeTokenId(event.chainId, event.srcAddress)),
      context.Account.get(makeAccountId(event.chainId, event.params.owner)),
    ]),
    handler: async ({ event, context, loaderReturn: [token, ownerAccount] }) => {
      const chainId = event.chainId;
      const { owner, spender, value } = event.params;
      const tokenAddress = event.srcAddress;
  
      if (!token) {
        token = createNewToken(chainId, tokenAddress, TOKEN_TYPE, context.Token.set);
      }
      if (!ownerAccount) {
        ownerAccount = createNewAccount(chainId, owner, context.Account.set);
      }
  
      context.TokenApproval.set(
        makeTokenApproval(
          event,
          tokenAddress,
          owner,
          spender,
          value,
        )
      );

      const entity: CorkLVT_Approval = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner: event.params.owner,
        spender: event.params.spender,
        value: event.params.value,
        srcAddress: event.srcAddress,
      };
    
      context.CorkLVT_Approval.set(entity);
    },
  });

  ERC20.Transfer.handlerWithLoader({
    loader: async ({ event, context }) => Promise.all([
      context.Token.get(makeTokenId(event.chainId, event.srcAddress)),
      context.Account.get(makeAccountId(event.chainId, event.params.from)),
      context.Account.get(makeAccountId(event.chainId, event.params.to)),
      context.AccountToken.get(makeAccountTokenId(event.chainId, event.params.from, event.srcAddress)),
      context.AccountToken.get(makeAccountTokenId(event.chainId, event.params.to, event.srcAddress)),
    ]),
    handler: async ({
      event,
      context,
      loaderReturn: [
        token,
        senderAccount,
        receiverAccount,
        senderAccountToken,
        receiverAccountToken,
      ],
    }) => {
      const chainId = event.chainId;
      const { from, to, value } = event.params;
      const tokenAddress = event.srcAddress;

      if (!token) {
        token = createNewToken(chainId, tokenAddress, TOKEN_TYPE, context.Token.set);
      }
      if (!senderAccount) {
        senderAccount = createNewAccount(chainId, from, context.Account.set);
      }
      if (!receiverAccount) {
        receiverAccount = createNewAccount(chainId, to, context.Account.set);
      }

      if (value > 0n && from !== to) {
        if (from === ZERO_ADDRESS) {
          context.Token.set({ ...token, totalSupply: (token.totalSupply ?? 0n) + value });
        } else {
          context.AccountTokenEntry.set(
            makeAccountTokenEntry(
              event,
              from,
              tokenAddress,
              -value,
            )
          );

          context.AccountToken.set(
            subFromBalance(
              senderAccountToken ?? createNewAccountToken(chainId, from, tokenAddress, context.AccountToken.set),
              value,
            )
          );
        }

        if (to === ZERO_ADDRESS) {
          context.Token.set({ ...token, totalSupply: (token.totalSupply ?? 0n) - value });
        } else {
          context.AccountTokenEntry.set(
            makeAccountTokenEntry(
              event,
              to,
              tokenAddress,
              value,
            )
          );

          context.AccountToken.set(
            addToBalance(
              receiverAccountToken ?? createNewAccountToken(chainId, to, tokenAddress, context.AccountToken.set),
              value,
            )
          );
        }
      }

      context.TokenTransfer.set(
        makeTokenTransfer(
          event,
          tokenAddress,
          from,
          to,
          value,
        )
      );

      const entity: CorkLVT_Transfer = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        from: event.params.from,
        to: event.params.to,
        value: event.params.value,
        srcAddress: event.srcAddress,
      };
    
      context.CorkLVT_Transfer.set(entity);
    },
  });
}
