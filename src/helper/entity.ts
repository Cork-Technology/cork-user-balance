/*
 * Helper utilities for creating and updating entities within the indexer.
 *
 * These functions abstract the construction of IDs and default entity
 * instances, allowing event handlers to focus on business logic rather
 * than boilerplate. The helpers mirror those from the previous project
 * but have been adapted to the new data model.
 */
import type {
  Account,
  AccountToken,
  AccountTokenEntry,
  Token,
  TokenApproval,
  TokenTransfer,
  Pool,
  PoolAsset,
  PoolAssetEntry,
  AssetPrice,
} from "generated";

// A lightweight representation of an EVM event used for constructing IDs
// and timestamped entries.
type Event = {
  chainId: number;
  block: { number: number; timestamp: number };
  logIndex: number;
};

/*
 * ID builders
 */
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

export function makePoolId(chainId: number, poolId: string): string {
  return `${chainId}:${poolId}`;
}

export function makePoolAssetId(chainId: number, poolId: string, tokenAddress: string): string {
  return `${chainId}:${tokenAddress}:${poolId}`;
}

export function makePoolAssetEntryId(event: Event, poolId: string): string {
  return `${event.chainId}_${event.block.number}_${event.logIndex}:${poolId}`;
}

export function makeAssetPriceId(chainId: number, id: string): string {
  return `${chainId}:${id}`;
}

/*
 * Entity constructors (pure functions)
 */
export function makeAccount(chainId: number, accountAddress: string): Account {
  return {
    id: makeAccountId(chainId, accountAddress),
    address: accountAddress,
  } as Account;
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
  } as Token;
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
  } as AccountToken;
}

export function makeAccountTokenEntry(
  event: Event,
  accountAddress: string,
  tokenAddress: string,
  amount: bigint,
  transferId?: string,
): AccountTokenEntry {
  const { chainId, block } = event;
  return {
    id: makeAccountTokenEntryId(event, accountAddress),
    account_id: makeAccountId(chainId, accountAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    transfer_id: transferId,
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  } as AccountTokenEntry;
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
    blockNumber: block.number,
  } as TokenApproval;
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
    blockNumber: block.number,
  } as TokenTransfer;
}

export function makePool(
  chainId: number,
  poolId: string,
  details: {
    poolIdBytes: string;
    principalTokenAddr: string;
    swapTokenAddr: string;
    collateralAssetAddr: string;
    referenceAssetAddr: string;
    exchangeRateProviderAddr: string;
    expiry: bigint;
    startBlock: number;
  },
): Pool {
  const {
    poolIdBytes,
    principalTokenAddr,
    swapTokenAddr,
    collateralAssetAddr,
    referenceAssetAddr,
    exchangeRateProviderAddr,
    expiry,
    startBlock,
  } = details;
  return {
    id: makePoolId(chainId, poolId),
    poolId: poolIdBytes,
    principalTokenAddr,
    swapTokenAddr,
    collateralAssetAddr,
    referenceAssetAddr,
    exchangeRateProviderAddr,
    expiry,
    startBlock,
  } as unknown as Pool;
}

export function makePoolAsset(
  chainId: number,
  poolId: string,
  tokenAddress: string,
  balance: bigint,
): PoolAsset {
  return {
    id: makePoolAssetId(chainId, poolId, tokenAddress),
    pool_id: makePoolId(chainId, poolId),
    token_id: makeTokenId(chainId, tokenAddress),
    balance,
  } as PoolAsset;
}

export function makePoolAssetEntry(
  event: Event,
  poolId: string,
  tokenAddress: string,
  amount: bigint,
): PoolAssetEntry {
  const { chainId, block } = event;
  return {
    id: makePoolAssetEntryId(event, poolId),
    pool_id: makePoolId(chainId, poolId),
    token_id: makeTokenId(chainId, tokenAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  } as PoolAssetEntry;
}

export function makeAssetPrice(
  chainId: number,
  assetId: string,
  details: {
    lastAnswer: bigint;
    decimals: number;
    updatedAt: Date;
    toCurrency: string;
    fromTokenAddr: string;
    toTokenAddr: string;
  },
): AssetPrice {
  const {
    lastAnswer,
    decimals,
    updatedAt,
    toCurrency,
    fromTokenAddr,
    toTokenAddr,
  } = details;
  return {
    id: makeAssetPriceId(chainId, assetId),
    lastAnswer,
    decimals,
    updatedAt,
    toCurrency,
    from_token_id: makeTokenId(chainId, fromTokenAddr),
    to_token_id: makeTokenId(chainId, toTokenAddr),
  } as unknown as AssetPrice;
}

/*
 * Entity creators that write directly to storage via the provided set
 * functions. These helpers encapsulate the creation of new entities
 * and immediately persist them to the database.
 */
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
  setAccountToken: (accountToken: AccountToken) => void,
): AccountToken {
  const accountToken = makeAccountToken(chainId, accountAddress, tokenAddress, 0n);
  setAccountToken(accountToken);
  return accountToken;
}

export function createNewPool(
  chainId: number,
  poolId: string,
  details: Parameters<typeof makePool>[2],
  setPool: (pool: Pool) => void,
): Pool {
  const pool = makePool(chainId, poolId, details);
  setPool(pool);
  return pool;
}

export function createNewPoolAsset(
  chainId: number,
  poolId: string,
  tokenAddress: string,
  setPoolAsset: (poolAsset: PoolAsset) => void,
): PoolAsset {
  const poolAsset = makePoolAsset(chainId, poolId, tokenAddress, 0n);
  setPoolAsset(poolAsset);
  return poolAsset;
}

export function createNewPoolAssetEntry(
  event: Event,
  poolId: string,
  tokenAddress: string,
  amount: bigint,
  setPoolAssetEntry: (entry: PoolAssetEntry) => void,
): PoolAssetEntry {
  const entry = makePoolAssetEntry(event, poolId, tokenAddress, amount);
  setPoolAssetEntry(entry);
  return entry;
}

export function createNewAssetPrice(
  chainId: number,
  assetId: string,
  details: Parameters<typeof makeAssetPrice>[2],
  setAssetPrice: (assetPrice: AssetPrice) => void,
): AssetPrice {
  const price = makeAssetPrice(chainId, assetId, details);
  setAssetPrice(price);
  return price;
}

/*
 * Balance helpers: these functions produce updated copies of an entity
 * with the balance adjusted by the specified amount. They do not
 * perform any writes on their own.
 */
export function addToBalance<T extends AccountToken | PoolAsset>(
  entity: T,
  amount: bigint,
): T {
  return { ...entity, balance: (entity.balance ?? 0n) + amount } as T;
}

export function subFromBalance<T extends AccountToken | PoolAsset>(
  entity: T,
  amount: bigint,
): T {
  return { ...entity, balance: (entity.balance ?? 0n) - amount } as T;
}
