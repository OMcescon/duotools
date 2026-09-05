import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';
import { scrapeBcbTco } from './_lib/bcb.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const DEFAULT_IDS = 'bitcoin,ethereum,solana,tether,binancecoin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ids = (req.query.ids as string) || DEFAULT_IDS;

  try {
    const usdPrices = await fetchWithCache(`coingecko:${ids}`, 30_000, async () => {
      const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=usd`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CoinGecko respondió ${response.status}`);
      return response.json() as Promise<Record<string, { usd: number }>>;
    });

    let tco: number | null = null;
    try {
      tco = (await fetchWithCache('bcb:tco', 5 * 60_000, scrapeBcbTco)).tco;
    } catch (error) {
      console.error('crypto-rates: no se pudo obtener TCO del BCB para derivar BOB:', error);
    }

    const prices = Object.fromEntries(
      Object.entries(usdPrices).map(([id, { usd }]) => [
        id,
        { usd, bob: tco !== null ? Number((usd * tco).toFixed(4)) : null },
      ]),
    );

    res.status(200).json({
      source: tco !== null ? 'CoinGecko (USD) + BCB (TCO)' : 'CoinGecko (USD)',
      prices,
      usdBobRate: tco,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('crypto-rates error:', error);
    res.status(502).json({ error: 'No se pudo obtener precios crypto', source: 'CoinGecko' });
  }
}
