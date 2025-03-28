/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import type {
  Account,
  AccountToken,
  AccountTokenEntry,
  Token,
  TokenApproval,
  TokenTransfer,
} from "generated";

type Event = { chainId: number, block: { number: number, timestamp: number }, logIndex: number }

export function makeAccountId(chainId: number, accountAddress: string): string {
  return `${chainId}:${accountAddress}`;
}

export function makeTokenId(chainId: number, tokenAddress: string): string {
  return `${chainId}:${tokenAddress}`;
}

export function makeAccountTokenId(
  chainId: number,
  accountAddress: string,
  tokenAddress: string,
): string {
  return `${chainId}:${tokenAddress}:${accountAddress}`;
}

export function makeTokenApprovalId(
  chainId: number,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
): string {
  return `${chainId}:${tokenAddress}:${ownerAddress}:${spenderAddress}`;
}

export function makeTokenTransferId(event: Event): string {
  return `${event.chainId}_${event.block.number}_${event.logIndex}`;
}

export function makeAccountTokenEntryId(event: Event, accountAddress: string): string {
  return `${event.chainId}_${event.block.number}_${event.logIndex}:${accountAddress}`;
}

export function makeAccount(
  chainId: number,
  accountAddress: string,
): Account {
  return {
    id: makeAccountId(chainId, accountAddress),
    address: accountAddress,
  };
}

export function makeToken(
  chainId: number,
  tokenAddress: string,
  tokenType: Token["typ"],
): Token {
  return {
    id: makeTokenId(chainId, tokenAddress),
    address: tokenAddress,
    typ: tokenType,
    totalSupply: 0n,
  };
}

export function makeAccountToken(
  chainId: number,
  accountAddress: string,
  tokenAddress: string,
  balance: bigint,
): AccountToken {
  return {
    id: makeAccountTokenId(chainId, accountAddress, tokenAddress),
    account_id: makeAccountId(chainId, accountAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    balance,
  }
}

export function makeAccountTokenEntry(
  event: Event,
  accountAddress: string,
  tokenAddress: string,
  amount: bigint,
): AccountTokenEntry {
  const { chainId, block } = event;
  return {
    id: makeAccountTokenEntryId(event, accountAddress),
    account_id: makeAccountId(chainId, accountAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    transfer_id: makeTokenTransferId(event),
    amount,
    timestamp: new Date(block.timestamp * 1000),
  };
}

export function makeTokenApproval(
  event: Event,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: bigint,
): TokenApproval {
  const { chainId, block } = event;
  return {
    id: makeTokenApprovalId(chainId, tokenAddress, ownerAddress, spenderAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    owner_id: makeAccountId(chainId, ownerAddress),
    spender_id: makeAccountId(chainId, spenderAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
  };
}

export function makeTokenTransfer(
  event: Event,
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: bigint,
): TokenTransfer {
  const { chainId, block } = event;
  return {
    id: makeTokenTransferId(event),
    token_id: makeTokenId(chainId, tokenAddress),
    from_id: makeAccountId(chainId, fromAddress),
    to_id: makeAccountId(chainId, toAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
  };
}

export function createNewAccount(
  chainId: number,
  accountAddress: string,
  setAccount: (account: Account) => void,
): Account {
  const account = makeAccount(chainId, accountAddress);
  setAccount(account);
  return account;
}

export function createNewToken(
  chainId: number,
  tokenAddress: string,
  tokenType: Token["typ"],
  setToken: (token: Token) => void,
): Token {
  const token = makeToken(chainId, tokenAddress, tokenType);
  setToken(token);
  return token;
}

export function createNewAccountToken(
  chainId: number,
  accountAddress: string,
  tokenAddress: string,
  setAccountToken: (accountToken: AccountToken) => void
): AccountToken {
  const accountToken = makeAccountToken(chainId, accountAddress, tokenAddress, 0n);
  setAccountToken(accountToken);
  return accountToken;
}

export function addToBalance(
  accountToken: AccountToken,
  amount: bigint,
): AccountToken {
  return { ...accountToken, balance: accountToken.balance + amount };
}

export function subFromBalance(
  accountToken: AccountToken,
  amount: bigint,
): AccountToken {
  return { ...accountToken, balance: accountToken.balance - amount };
}
