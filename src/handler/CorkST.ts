/*
 * Event handlers for the `CST` (Cork Swap Token) contract.
 */
import type {
  CST,
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
  makeTokenApproval,
  makeTokenTransferId,
  makeTokenApprovalId,
} from "../helper";

export function attachEventHandlers<T extends typeof CST>(
  CST: T,
): void {

  CST.Transfer.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const tokenAddress = event.srcAddress;
    const { from: fromAddress, to: toAddress, value: amount } = event.params;

    const [token, fromAccount, toAccount, fromAccountToken, toAccountToken] = await Promise.all([
      // Load token
      context.Token.get(makeTokenId(chainId, tokenAddress)),
      // Load accounts
      fromAddress !== ZERO_ADDRESS ? context.Account.get(makeAccountId(chainId, fromAddress)) : Promise.resolve(undefined),
      toAddress !== ZERO_ADDRESS ? context.Account.get(makeAccountId(chainId, toAddress)) : Promise.resolve(undefined),
      // Load account tokens
      fromAddress !== ZERO_ADDRESS ? context.AccountToken.get(makeAccountTokenId(chainId, fromAddress, tokenAddress)) : Promise.resolve(undefined),
      toAddress !== ZERO_ADDRESS ? context.AccountToken.get(makeAccountTokenId(chainId, toAddress, tokenAddress)) : Promise.resolve(undefined),
    ]);

    if (context.isPreload) return;

    // Ensure token exists (CST type)
    let cstToken = token;
    cstToken ||= createNewToken(chainId, tokenAddress, "CST", context.Token.set);

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
    if (fromAddress !== ZERO_ADDRESS) {
      fromAcc ||= createNewAccount(chainId, fromAddress, context.Account.set);
    }

    let toAcc = toAccount;
    if (toAddress !== ZERO_ADDRESS) {
      toAcc ||= createNewAccount(chainId, toAddress, context.Account.set);
    }

    // Create missing account tokens
    let fromAccToken = fromAccountToken;
    if (fromAddress !== ZERO_ADDRESS) {
      fromAccToken ||= createNewAccountToken(chainId, fromAddress, tokenAddress, context.AccountToken.set);
    }

    let toAccToken = toAccountToken;
    if (toAddress !== ZERO_ADDRESS) {
      toAccToken ||= createNewAccountToken(chainId, toAddress, tokenAddress, context.AccountToken.set);
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

    context.CorkST_Transfer.set({
      id: makeTokenTransferId(event),
      from: fromAddress,
      to: toAddress,
      amount,
    });
  });

  CST.Approval.handler(async ({ event, context }) => {
    const chainId = event.chainId;
    const { owner, spender, value } = event.params;
    const tokenAddress = event.srcAddress;

    let [token, ownerAccount] = await Promise.all([
      context.Token.get(makeTokenId(chainId, tokenAddress)),
      context.Account.get(makeAccountId(chainId, owner))
    ]);

    if (context.isPreload) return;

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

    const entity: CorkST_Approval = {
      id: makeTokenApprovalId(event.chainId, tokenAddress, owner, spender),
      owner: event.params.owner,
      spender: event.params.spender,
      amount: value,
      srcAddress: event.srcAddress,
    };

    context.CorkST_Approval.set(entity);
  });
} 