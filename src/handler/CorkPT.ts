/*
 * Event handlers for the `CPT` (Cork Principal Token) contract.
 */
import type {
  CPT,
  CorkPT_Approval,
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
  makeTokenApproval,
  makeTokenApprovalId,
  makeTokenTransferId,
} from "../helper";

export function attachEventHandlers<T extends typeof CPT>(
  CPT: T,
): void {
  // Handle CPT transfers with full balance tracking
  CPT.Transfer.handlerWithLoader({
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

      // Ensure token exists (CPT type)
      let cptToken = token;
      if (!cptToken) {
        cptToken = createNewToken(chainId, tokenAddress, "CPT", context.Token.set);
      }

      // Update total supply based on minting/burning
      if (fromAddress === ZERO_ADDRESS) {
        // Minting: increase total supply
        context.Token.set({ ...cptToken, totalSupply: (cptToken.totalSupply ?? 0n) + amount });
      } else if (toAddress === ZERO_ADDRESS) {
        // Burning: decrease total supply
        context.Token.set({ ...cptToken, totalSupply: (cptToken.totalSupply ?? 0n) - amount });
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
          makeAccountTokenEntry(event, fromAddress, tokenAddress, -amount, event.logIndex.toString()),
        );
        context.AccountToken.set(
          subFromBalance(fromAccToken, amount),
        );
      }

      if (toAddress !== ZERO_ADDRESS && toAccToken) {
        // Add to receiver (both normal transfer and minting from ZERO_ADDRESS)
        context.AccountTokenEntry.set(
          makeAccountTokenEntry(event, toAddress, tokenAddress, amount, event.logIndex.toString()),
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
      context.CorkPT_Transfer.set({
        id: makeTokenTransferId(event),
        from: event.params.from,
        to: event.params.to,
        amount: event.params.value,
      });
    },
  });

  CPT.Approval.handlerWithLoader({
    loader: async ({ event, context }) => Promise.all([
      context.Token.get(makeTokenId(event.chainId, event.srcAddress)),
      context.Account.get(makeAccountId(event.chainId, event.params.owner)),
    ]),
    handler: async ({ event, context, loaderReturn: [token, ownerAccount] }) => {
      const chainId = event.chainId;
      const { owner, spender, value } = event.params;
      const tokenAddress = event.srcAddress;

      if (!token) {
        token = createNewToken(chainId, tokenAddress, "CST", context.Token.set);
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

      const entity: CorkPT_Approval = {
        id: makeTokenApprovalId(event.chainId, tokenAddress, owner, spender),
        owner: event.params.owner,
        spender: event.params.spender,
        amount: value,
        srcAddress: event.srcAddress,
      };

      context.CorkPT_Approval.set(entity);
    },
  });

  CPT.Deposit.handler(async ({ event, context }) => {
    context.CorkPT_Deposit.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      caller: event.params.caller,
      owner: event.params.owner, 
      assets: event.params.assets,
      shares: event.params.shares
    });
  });

  CPT.Withdraw.handler(async ({ event, context }) => {
    context.CorkPT_Withdraw.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      caller: event.params.caller,
      receiver: event.params.receiver,
      owner: event.params.owner,
      assets: event.params.assets,
      shares: event.params.shares
    });
  });
}