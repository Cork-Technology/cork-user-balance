export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Fixed-point scale (1e18)
export const WAD = 10n ** 18n;


// Deprecated: AGGREGATOR_TO_TOKEN removed in favor of PATH_TO_USD

export const USD_SYMBOL = "USD";



// Direct aggregator: O(1) lookups in handlers
export const AGG_TO_STEP: Record<string, {
  fromTokenAddr: string;
  toTokenAddr?: string;
  toCurrency?: string;
  decimals: number;
}> = {
  // LINK/USD
  "0x5a2734cc0341ea6564df3d00171cc99c63b1a7d3": {
    fromTokenAddr: "0x0000000237805496906796B1e767640a804576DF", // acting as LINK token while it is CETH
    toCurrency: "USD",
    decimals: 8,
  },
  // wstETH/USD
  "0xabc400913676a91a61b798ed35962602de3544af": {
    fromTokenAddr: "0x22222228802B45325E0b8D0152C633449Ab06913", // acting as wstETH token while it is wamuETH
    toCurrency: "USD",
    decimals: 8,
  },
  // BTC/ETH
  "0x9d9305445f404e925563d5d5ecc65c815ec1655b": {
    fromTokenAddr: "0x33333335a697843FDd47D599680Ccb91837F59aF", // acting as BTC token while it is bsETH
    toTokenAddr: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2",
    decimals: 18,
  },
  // ETH/USD
  "0x719e22e3d4b690e5d96ccb40619180b5427f14ae": {
    fromTokenAddr: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2",
    toCurrency: "USD",
    decimals: 8,
  },
};
