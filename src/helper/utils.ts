import { makePoolId, makePoolAssetId, makeTokenId, makeAssetPriceId } from "./entity";
import { WAD } from "./constants";


// TVL/Price helpers
export function scaleToWad(value: bigint, fromDecimals: number): bigint {
    if (fromDecimals === 18) return value;
    if (fromDecimals < 18) return value * (10n ** BigInt(18 - fromDecimals));
    return value / (10n ** BigInt(fromDecimals - 18));
  }
  
  export async function recomputePoolTvl(
    context: any,
    chainId: number,
    poolId: string,
  ): Promise<void> {
  
    if (context.isPreload) return;
  
    const pool = await context.Pool.get(makePoolId(chainId, poolId));
    if (!pool) return;
  
    const { collateralAssetAddr, referenceAssetAddr } = pool;
    const [paCA, paREF] = await Promise.all([
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, collateralAssetAddr)),
      context.PoolAsset.get(makePoolAssetId(chainId, poolId, referenceAssetAddr)),
    ]);
  
    // Resolve USD price via AssetPrice graph (token -> ... -> USD)
    const priceCA = await resolveUsdPrice(context, chainId, collateralAssetAddr);
    const priceREF = await resolveUsdPrice(context, chainId, referenceAssetAddr);
  
    const caAmountWad = paCA?.balance ?? 0n;
    const refAmountWad = paREF?.balance ?? 0n;
    const caPriceWad = priceCA ?? 0n;
    const refPriceWad = priceREF ?? 0n;
  
    const caValue = (caAmountWad * caPriceWad) / WAD;
    const refValue = (refAmountWad * refPriceWad) / WAD;
  
    // Write per-asset TVL values; pool-level summing can be done in the UI
    if (paCA) {
      context.PoolAsset.set({ ...paCA, tvlUsd: caValue, tvlUpdatedAt: new Date() });
    }
    if (paREF) {
      context.PoolAsset.set({ ...paREF, tvlUsd: refValue, tvlUpdatedAt: new Date() });
    }
  }
  
  // Resolve token -> USD by walking AssetPrice edges (lowercase IDs only).
  // Returns 18-decimal WAD or 0n if unresolved.
  async function resolveUsdPrice(
    context: any,
    chainId: number,
    tokenAddr: string,
    visited: Set<string> = new Set(),
  ): Promise<bigint> {
    const addr = tokenAddr;
    const tokenId = makeTokenId(chainId, addr);
  
    if (visited.has(tokenId)) return 0n; // prevent cycles
    visited.add(tokenId);
  
    // 1) Direct token -> USD
    const direct = await context.AssetPrice.get(
      makeAssetPriceId(chainId, `${addr}:USD`)
    );
    if (direct) {
      return scaleToWad(direct.lastAnswer, direct.decimals);
    }
  
    // 2) Indirect: token -> midToken, then midToken -> USD
    const edges = await context.AssetPrice.getWhere.fromToken_id.eq(tokenId);
    if (edges?.length) {
      for (const edge of edges) {
        if (!edge.toToken_id) continue;
        const midTokenAddr = edge.toToken_id.split(":")[1];
        const midUsd = await resolveUsdPrice(context, chainId, midTokenAddr, visited);
        if (midUsd > 0n) {
          const edgePriceWad = scaleToWad(edge.lastAnswer, edge.decimals);
          return (edgePriceWad * midUsd) / WAD;
        }
      }
    }
    return 0n;
  }
  