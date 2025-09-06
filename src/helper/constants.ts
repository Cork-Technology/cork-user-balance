export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Fixed-point scale (1e18)
export const WAD = 10n ** 18n;

export const USD_SYMBOL = "USD";



// Direct aggregator: O(1) lookups in handlers
export const AGG_TO_STEP: Record<string, {
  fromTokenAddr: string;
  toTokenAddr?: string;
  toCurrency?: string;
  decimals: number;
}> = {
  // LINK/USD
  "0x5A2734CC0341ea6564dF3D00171cc99C63B1A7d3": {
    fromTokenAddr: "0x0000000237805496906796B1e767640a804576DF", // acting as LINK token while it is CETH
    toCurrency: "USD",
    decimals: 8,
  },
  // XAU/USD
  "0x2606DffB6dfD8e9871CcE1C0A3F153F5d5F65106": {
    fromTokenAddr: "0x22222228802B45325E0b8D0152C633449Ab06913", // acting as wstETH token while it is XAU
    toCurrency: "USD",
    decimals: 8,
  },
  // wstETH/USD
  "0xaBc400913676a91A61B798Ed35962602de3544aF": {
    fromTokenAddr: "0xBfEDFEc502CAd6D815Edc947Ba0Fd5A31D8ef5e1", // acting as ETHFI token while it is wstETH
    toCurrency: "USD",
    decimals: 8,
  },
  // BTC/ETH
  "0x9d9305445F404E925563d5D5EcC65C815Ec1655b": {
    fromTokenAddr: "0x33333335a697843FDd47D599680Ccb91837F59aF", // acting as BTC token while it is bsETH
    toTokenAddr: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2",
    decimals: 18,
  },
  // ETH/USD
  "0x719E22E3D4b690E5d96cCb40619180B5427F14AE": {
    fromTokenAddr: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2",
    toCurrency: "USD",
    decimals: 8,
  },
  

  
  // DAI/USD
  "0x90FeD00c44aE95f96A7883af38782Ef937c72A03": {   
    fromTokenAddr: "0x666666685C211074C1b0cFed7e43E1e7D8749E43", // acting as DAI token while it is fedUSD
    toCurrency: "USD",
    decimals: 8,
  },
  // EUR/USD
  "0xD404D68e5616e9C7045be2Dc1C5865EE328B6638": {
    fromTokenAddr: "0x1111111A3Ae9c9b133Ea86BdDa837E7E796450EA", // acting as EUR token while it is CUSD
    toCurrency: "USD",
    decimals: 8,
  },
  // GBP/USD
  "0x498D8bcCE2E3aEf50A69Cd6F1cA6CB8f3E3B5C9A": {
    fromTokenAddr: "0x5555555eBBf30a4b084078319Da2348fD7B9e470", // acting as GBP token while it is svbUSD
    toCurrency: "USD",
    decimals: 8,
  },
  

};
