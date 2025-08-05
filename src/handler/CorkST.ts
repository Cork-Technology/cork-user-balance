/*
 * Event handlers for the `CST` (Cork Swap Token) contract.
 */
import type {
  CST,
  CorkST_Transfer,
  CorkST_Approval,
} from "generated";
import {
  ZERO_ADDRESS,
  createNewAccount,
  createNewToken,
  createNewAccountToken,
  makeTokenId,
  makeAccountId,
  makeAccountTokenId,
  makeAccountTokenEntry,
  makeTokenTransfer,
  addToBalance,
  subFromBalance,
} from "../helper";

export function attachEventHandlers<T extends typeof CST>(
  CST: T,
): void {
  
  CST.Transfer.handlerWithLoader({
    loader: async ({ event, context }) => {
      const chainId = event.chainId;
      const tokenAddress = event.srcAddress;
      const fromAddress = event.params.from;
      const toAddress = event.params.to;
      
      return Promise.all([
        // Load token
        context.Token.get(makeTokenId(chainId, tokenAddress)),
        // Load accounts
        fromAddress !== ZERO_ADDRESS ? context.Account.get(makeAccountId(chainId, fromAddress)) : undefined,
        toAddress !== ZERO_ADDRESS ? context.Account.get(makeAccountId(chainId, toAddress)) : undefined,
        // Load account tokens
        fromAddress !== ZERO_ADDRESS ? context.AccountToken.get(makeAccountTokenId(chainId, fromAddress, tokenAddress)) : undefined,
        toAddress !== ZERO_ADDRESS ? context.AccountToken.get(makeAccountTokenId(chainId, toAddress, tokenAddress)) : undefined,
      ]);
    },
    handler: async ({ event, context, loaderReturn }) => {
      const [token, fromAccount, toAccount, fromAccountToken, toAccountToken] = loaderReturn as any[];
      
      const chainId = event.chainId;
      const tokenAddress = event.srcAddress;
      const fromAddress = event.params.from;
      const toAddress = event.params.to;
      const amount = event.params.value;

      // Ensure token exists (CST type)
      let cstToken = token;
      if (!cstToken) {
        cstToken = createNewToken(chainId, tokenAddress, "CST", context.Token.set);
      }

      // Update total supply based on minting/burning
      if (fromAddress === ZERO_ADDRESS) {
        // Minting: increase total supply
        context.Token.set({ ...cstToken, totalSupply: (cstToken.totalSupply ?? 0n) + amount });
      } else if (toAddress === ZERO_ADDRESS) {
        // Burning: decrease total supply
        context.Token.set({ ...cstToken, totalSupply: (cstToken.totalSupply ?? 0n) - amount });
      }

      // Create missing accounts
      let fromAcc = fromAccount;
      if (!fromAcc && fromAddress !== ZERO_ADDRESS) {
        fromAcc = createNewAccount(chainId, fromAddress, context.Account.set);
      }
      
      let toAcc = toAccount;
      if (!toAcc && toAddress !== ZERO_ADDRESS) {
        toAcc = createNewAccount(chainId, toAddress, context.Account.set);
      }

      // Create missing account tokens
      let fromAccToken = fromAccountToken;
      if (!fromAccToken && fromAddress !== ZERO_ADDRESS) {
        fromAccToken = createNewAccountToken(chainId, fromAddress, tokenAddress, context.AccountToken.set);
      }
      
      let toAccToken = toAccountToken;
      if (!toAccToken && toAddress !== ZERO_ADDRESS) {
        toAccToken = createNewAccountToken(chainId, toAddress, tokenAddress, context.AccountToken.set);
      }

      // Update balances and create entries
      if (fromAddress !== ZERO_ADDRESS && fromAccToken) {
        // Subtract from sender (normal transfer)
        context.AccountTokenEntry.set(
          makeAccountTokenEntry(event, fromAddress, tokenAddress, -amount),
        );
        context.AccountToken.set(
          subFromBalance(fromAccToken, amount),
        );
      }

      if (toAddress !== ZERO_ADDRESS && toAccToken) {
        // Add to receiver (both normal transfer and minting from ZERO_ADDRESS)
        context.AccountTokenEntry.set(
          makeAccountTokenEntry(event, toAddress, tokenAddress, amount),
        );
        context.AccountToken.set(
          addToBalance(toAccToken, amount),
        );
      }

      // Record the token transfer
      context.TokenTransfer.set(
        makeTokenTransfer(event, tokenAddress, fromAddress, toAddress, amount),
      );

      // Record the original transfer event for compatibility
      context.CorkST_Transfer.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        from: event.params.from,
        to: event.params.to,
        amount: event.params.value,
      });
    },
  });

  // Handle CST approvals
  CST.Approval.handler(async ({ event, context }) => {
    // Record the approval event
    context.CorkST_Approval.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      amount: event.params.value,
      srcAddress: event.srcAddress,
    });
  });
} 