import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const DEFAULT_IDS = 'bitcoin,ethereum,solana,tether,binancecoin';
const DEFAULT_VS_CURRENCIES = 'usd,bob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ids = (req.query.ids as string) || DEFAULT_IDS;
  const vsCurrencies = (req.query.vs_currencies as string) || DEFAULT_VS_CURRENCIES;

  try {
    const data = await fetchWithCache(`coingecko:${ids}:${vsCurrencies}`, 30_000, async () => {
      const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=${vsCurrencies}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CoinGecko respondió ${response.status}`);
      return response.json() as Promise<Record<string, Record<string, number>>>;
    });

    res.status(200).json({
      source: 'CoinGecko',
      prices: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('crypto-rates error:', error);
    res.status(502).json({ error: 'No se pudo obtener precios crypto', source: 'CoinGecko' });
  }
}
