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
  PriceFeed_AnswerUpdated,
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
  return `${event.chainId}:${event.block.number}:${event.logIndex}`;
}

export function makeAccountTokenEntryId(event: Event, accountAddress: string): string {
  return `${event.chainId}:${event.block.number}:${event.logIndex}`;
}

export function makePoolId(chainId: number, poolId: string): string {
  return `${chainId}:${poolId}`;
}

export function makePoolAssetId(chainId: number, poolId: string, tokenAddress: string): string {
  return `${chainId}:${tokenAddress}:${poolId}`;
}

export function makePoolAssetEntryId(event: Event, poolId: string): string {
  return `${event.chainId}:${event.block.number}:${event.logIndex}:${poolId}`;
}

export function makeAssetPriceId(chainId: number, fromTokenAddr: string, toTokenAddr?: string, toCurrency?: string): string {
  return `${chainId}:${toCurrency ? `${fromTokenAddr}:${toCurrency}` : `${fromTokenAddr}:${toTokenAddr}`}`;
}

export function makeCorkPool_DepositId(chainId: number, blockNumber: number, logIndex: number): string {
  return `${chainId}:${blockNumber}:${logIndex}`;
}

export function makeCorkPool_WithdrawExtendedId(chainId: number, blockNumber: number, logIndex: number): string {
  return `${chainId}:${blockNumber}:${logIndex}`;
}

export function makePriceFeed_AnswerUpdatedId(chainId: number, blockNumber: number, srcAddress: string, logIndex: number): string {
  return `${chainId}:${blockNumber}:${srcAddress}:${logIndex}`;
}

/*
 * Entity constructors (pure functions)
 */
export function makeAccount(chainId: number, accountAddress: string): Account {
  const account: Account = {
    id: makeAccountId(chainId, accountAddress),
    address: accountAddress,
  };
  return account;
}

export function makeToken(
  chainId: number,
  tokenAddress: string,
  tokenType: Token["typ"],
): Token {
  const token: Token = {
    id: makeTokenId(chainId, tokenAddress),
    address: tokenAddress,
    typ: tokenType,
    totalSupply: 0n,
    // Pool relation is required by the generated type; will be set later when applicable
    pool_id: undefined,
  };
  return token;
}

export function makeAccountToken(
  chainId: number,
  accountAddress: string,
  tokenAddress: string,
  balance: bigint,
): AccountToken {
  const accountToken: AccountToken = {
    id: makeAccountTokenId(chainId, accountAddress, tokenAddress),
    account_id: makeAccountId(chainId, accountAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    balance,
  };
  return accountToken;
}

export function makeAccountTokenEntry(
  event: Event,
  accountAddress: string,
  tokenAddress: string,
  amount: bigint,
  transferId?: string,
): AccountTokenEntry {
  const { chainId, block } = event;
  const resolvedTransferId = transferId ?? makeTokenTransferId(event);
  const entry: AccountTokenEntry = {
    id: makeAccountTokenEntryId(event, accountAddress),
    account_id: makeAccountId(chainId, accountAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    transfer_id: resolvedTransferId,
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  };
  return entry;
}

export function makeTokenApproval(
  event: Event,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: bigint,
): TokenApproval {
  const { chainId, block } = event;
  const approval: TokenApproval = {
    id: makeTokenApprovalId(chainId, tokenAddress, ownerAddress, spenderAddress),
    token_id: makeTokenId(chainId, tokenAddress),
    owner_id: makeAccountId(chainId, ownerAddress),
    spender_id: makeAccountId(chainId, spenderAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  };
  return approval;
}

export function makeTokenTransfer(
  event: Event,
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: bigint,
): TokenTransfer {
  const { chainId, block } = event;
  const transfer: TokenTransfer = {
    id: makeTokenTransferId(event),
    token_id: makeTokenId(chainId, tokenAddress),
    from_id: makeAccountId(chainId, fromAddress),
    to_id: makeAccountId(chainId, toAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  };
  return transfer;
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
  const poolEntity: Pool = {
    id: makePoolId(chainId, poolId),
    poolId: poolIdBytes,
    principalTokenAddr,
    swapTokenAddr,
    collateralAssetAddr,
    referenceAssetAddr,
    exchangeRateProviderAddr,
    expiry,
    startBlock,
    // Link relations by ID as required by generated types
    principalToken_id: makeTokenId(chainId, principalTokenAddr),
    swapToken_id: makeTokenId(chainId, swapTokenAddr),
    collateralAsset_id: makePoolAssetId(chainId, poolId, collateralAssetAddr),
    referenceAsset_id: makePoolAssetId(chainId, poolId, referenceAssetAddr),
  };
  return poolEntity;
}

export function makePoolAsset(
  chainId: number,
  poolId: string,
  tokenAddress: string,
  balance: bigint,
): PoolAsset {
  const poolAsset: PoolAsset = {
    id: makePoolAssetId(chainId, poolId, tokenAddress),
    pool_id: makePoolId(chainId, poolId),
    token_id: makeTokenId(chainId, tokenAddress),
    balance,
    tvlUsd: 0n,
    tvlUpdatedAt: new Date()
  };
  return poolAsset;
}

export function makePoolAssetEntry(
  event: Event,
  poolId: string,
  tokenAddress: string,
  amount: bigint,
): PoolAssetEntry {
  const { chainId, block } = event;
  const entry: PoolAssetEntry = {
    id: makePoolAssetEntryId(event, poolId),
    // Link directly to the specific PoolAsset as per generated types
    poolAsset_id: makePoolAssetId(chainId, poolId, tokenAddress),
    amount,
    timestamp: new Date(block.timestamp * 1000),
    blockNumber: block.number,
  };
  return entry;
}

export function makeAssetPrice(
  chainId: number,
  details: {
    lastAnswer: bigint;
    decimals: number;
    updatedAt: Date;
    toCurrency?: string;
    fromTokenAddr: string;
    toTokenAddr?: string;
  },
  setAssetPrice: (assetPrice: AssetPrice) => void,
): AssetPrice {
  const {
    lastAnswer,
    decimals,
    updatedAt,
    toCurrency,
    fromTokenAddr,
    toTokenAddr,
  } = details;
  const price: AssetPrice = {
    id: makeAssetPriceId(chainId, fromTokenAddr, toTokenAddr, toCurrency),
    lastAnswer,
    decimals,
    updatedAt,
    toCurrency: toCurrency,
    fromToken_id: makeTokenId(chainId, fromTokenAddr),
    toToken_id: toTokenAddr ? makeTokenId(chainId, toTokenAddr) : undefined,
  };
  setAssetPrice(price);
  return price;
}

export function createPriceFeed_AnswerUpdated(
  chainId: number,
  blockNumber: number,
  srcAddress: string,
  logIndex: number,
  current: bigint,
  roundId: bigint,
  updatedAt: bigint,
  setPriceFeed_AnswerUpdated: (priceFeed: PriceFeed_AnswerUpdated) => void,
): PriceFeed_AnswerUpdated {
  const PriceFeed: PriceFeed_AnswerUpdated = {
    id: makePriceFeed_AnswerUpdatedId(chainId, blockNumber, srcAddress, logIndex),
    current,
    roundId,
    updatedAt,
  };
  setPriceFeed_AnswerUpdated(PriceFeed);
  return PriceFeed;
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

/*
 * Balance helpers: these functions produce updated copies of an entity
 * with the balance adjusted by the specified amount. They do not
 * perform any writes on their own.
 */
export function addToBalance(entity: AccountToken, amount: bigint): AccountToken;
export function addToBalance(entity: PoolAsset, amount: bigint): PoolAsset;
export function addToBalance(entity: AccountToken | PoolAsset, amount: bigint): AccountToken | PoolAsset {
  return { ...entity, balance: (entity.balance ?? 0n) + amount };
}

export function subFromBalance(entity: AccountToken, amount: bigint): AccountToken;
export function subFromBalance(entity: PoolAsset, amount: bigint): PoolAsset;
export function subFromBalance(entity: AccountToken | PoolAsset, amount: bigint): AccountToken | PoolAsset {
  return { ...entity, balance: (entity.balance ?? 0n) - amount };
}
