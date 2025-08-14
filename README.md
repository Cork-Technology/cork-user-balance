# Cork Protocol Indexer

A comprehensive blockchain indexer for the Cork Protocol ecosystem, built with [Envio](https://envio.dev). This indexer tracks user balances, pool assets, token transfers, and market activities across Cork's principal tokens (CPT), swap tokens (CST), collateral assets (CA), and reference assets (REF).

## 🚀 Quick Start

### Prerequisites

- [Node.js v18+](https://nodejs.org/en/download/current)
- [pnpm v8+](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation & Setup

Setup the toolchain with pinned versions:

```bash
curl --proto '=https' --tlsv1.3 https://mise.run | sh
eval "$(mise activate --shims)"
echo "eval \"\$(mise activate bash)\"" >> ~/.bashrc
exec bash

# Installs Node.js v24 and pnpm v10
mise trust
mise install
```

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Generate TypeScript types from schema
pnpm codegen

# Start development server with hot reload
pnpm dev

# Run tests
pnpm test
```

### Access the GraphQL Playground

Visit [http://localhost:8080](http://localhost:8080)
- **Password:** `testing`

## 📊 What This Indexer Tracks

### Contracts Monitored

| Contract | Purpose | Events Tracked |
|----------|---------|----------------|
| **CorkConfig** | Protocol configuration | Pool settings, roles, treasury |
| **CorkPool** | Main pool operations | Deposits, withdrawals, swaps, market creation |
| **ExchangeRateProvider** | Price feeds | Rate updates |
| **SharesFactory** | Token deployment | Share token creation |
| **CPT** (Cork Principal Token) | ERC4626 principal shares | Transfers, deposits, withdrawals |
| **CST** (Cork Swap Token) | ERC4626 swap shares | Transfers, approvals |

### Data Models

- **👤 Accounts** - User wallet addresses and their token holdings
- **🪙 Tokens** - CPT, CST tokens with total supply tracking
- **💰 Account Balances** - Real-time user token balances
- **🏊 Pool Assets** - Pool-level asset balances (CA/REF)
- **📈 Token Transfers** - Complete transfer history
- **🔄 Pool Operations** - Deposits, withdrawals, swaps, unwind operations

## 🏗️ Architecture

### Handler Structure

```
src/
├── EventHandlers.ts          # Main event dispatcher
└── handler/
    ├── CorkConfig.ts         # Protocol configuration events
    ├── CorkPool.ts           # Pool operations (deposits, swaps, etc.)
    ├── ExchangeRateProvider.ts # Price feed events
    ├── SharesFactory.ts      # Token deployment events
    ├── CorkPT.ts            # CPT token events (transfers, deposits, withdrawals)
    └── CorkST.ts            # CST token events (transfers, approvals)
```

### Token Types

- **CPT** - Cork Principal Token (ERC4626 shares)
- **CST** - Cork Swap Token (ERC4626 shares)  
- **CA** - Collateral Asset (underlying asset)
- **REF** - Reference Asset (underlying asset)

### Token Flow Tracking

| Operation                        | Input Tokens | Output Tokens  | Pool Assets  |
|----------------------------------|--------------|----------------|--------------|
| **Deposit/Mint**                 | CA           | CPT + CST      | CA ↑         |
| **UnwindDeposit/UnwindMint**     | CPT + CST    | CA             | CA ↓         |
| **Withdraw/Redeem (expired)**    | CPT + CST    | CA + REF       | CA ↓, REF ↓  |
| **Swap/Exercise**                | REF + CST    | CA - CAFee     | CA ↓, REF ↑  |
| **UnwindSwap/UnwindExercise**    | CA + CAFee   | REF + CST      | CA ↑, REF ↓  |

## 📝 Configuration

### Network Configuration (`config.yaml`)

The indexer is configured for **Sepolia testnet** (Chain ID: 11155111) and monitors:

- **CorkConfig:** `0xE5c5C29e32b9ef3eE63c2c22A588d7eB4AAf328e`
- **CorkPool:** `0xDF181Defd2A02171A9cDacB24B171DB9cDc9bEd6`
- **ExchangeRateProvider:** `0x8480B2ea4a367de5b1E0Df4803F1872002f3C6e5`
- **SharesFactory:** `0xDCed1d589bbc522d8C6843c39203d40DC2eD0B5b`

## 📊 Example Queries

### Get User Token Balances

```graphql
query GetUserBalances($userAddress: String!) {
  AccountToken(where: { account: { address: { _eq: $userAddress } } }) {
    balance
    token {
      address
      typ
    }
  }
}
```

### Get Pool Asset Balances

```graphql
query GetPoolAssets($poolId: String!) {
  PoolAsset(where: { pool: { id: { _eq: $poolId } } }) {
    balance
    token {
      address
      typ
    }
  }
}
```

### Get Recent Transfers

```graphql
query GetRecentTransfers($limit: Int = 10) {
  TokenTransfer(limit: $limit, order_by: { timestamp: desc }) {
    amount
    timestamp
    token {
      address
      typ
    }
    from {
      address
    }
    to {
      address
    }
  }
}
```

## 🛠️ Balance Tracking System

### User Balances (CPT/CST)
- Tracked via **Transfer events** in dedicated handler files
- Handles minting (from zero address) and burning (to zero address)
- Updates both individual balances and total supply

### Pool Assets (CA/REF)
- Tracked via **CorkPool events** (Deposit, Swap, etc.)
- Only pool-level balances, not individual user holdings
- Represents assets held by the pool contract

## 📚 Resources

- [Envio Documentation](https://docs.envio.dev)
- [GraphQL Documentation](https://graphql.org/learn/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm codegen` to ensure types are up to date
5. Test your changes with `pnpm dev`
6. Submit a pull request

## 📄 License

This project is part of the Cork Protocol ecosystem.
