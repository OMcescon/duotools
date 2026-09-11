import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';
import { scrapeBcbTco } from './_lib/bcb.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const DEFAULT_IDS = 'bitcoin,ethereum,solana,tether,binancecoin';
// Moneda puente para derivar cruces fiat que CoinGecko soporta como vs_currency
// pero Frankfurter (ECB) no publica: ARS y CLP.
const FIAT_BRIDGE_COIN = 'bitcoin';

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

    let fiatCross: { ars: number | null; clp: number | null } = { ars: null, clp: null };
    try {
      const bridge = await fetchWithCache(`coingecko:bridge:${FIAT_BRIDGE_COIN}`, 30_000, async () => {
        const url = `${COINGECKO_URL}?ids=${FIAT_BRIDGE_COIN}&vs_currencies=usd,ars,clp`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`CoinGecko respondió ${response.status}`);
        return response.json() as Promise<Record<string, { usd: number; ars: number; clp: number }>>;
      });
      const b = bridge[FIAT_BRIDGE_COIN];
      if (b?.usd && b?.ars) fiatCross.ars = Number((b.ars / b.usd).toFixed(4));
      if (b?.usd && b?.clp) fiatCross.clp = Number((b.clp / b.usd).toFixed(4));
    } catch (error) {
      console.error('crypto-rates: no se pudo derivar cruce ARS/CLP vía CoinGecko:', error);
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
      fiatCross,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('crypto-rates error:', error);
    res.status(502).json({ error: 'No se pudo obtener precios crypto', source: 'CoinGecko' });
  }
}
