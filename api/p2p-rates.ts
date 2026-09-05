import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache';
import { P2P_HEADERS } from './_lib/headers';

const ASSET = 'USDT';
const FIAT = 'BOB';
const ROWS = 10;

type P2POffer = {
  exchange: string;
  buyPrice: number | null;
  sellPrice: number | null;
  paymentMethods: string[];
  status: 'ok' | 'error';
  error?: string;
};

// Binance P2P: request tradeType is the taker's intent, so a "BUY" request
// returns the counter-party SELL ads (what you'd pay), and vice versa.
async function fetchBinance(): Promise<P2POffer> {
  const exchange = 'Binance P2P';
  try {
    const search = async (tradeType: 'BUY' | 'SELL') => {
      const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        method: 'POST',
        headers: { ...P2P_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiat: FIAT, asset: ASSET, tradeType, page: 1, rows: ROWS }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return (json.data ?? []) as any[];
    };

    const [buyAds, sellAds] = await Promise.all([search('BUY'), search('SELL')]);

    const buyPrices = buyAds.map((d) => parseFloat(d.adv.price)).filter((p) => !isNaN(p));
    const sellPrices = sellAds.map((d) => parseFloat(d.adv.price)).filter((p) => !isNaN(p));
    const methods = new Set<string>();
    buyAds.forEach((d) => (d.adv.tradeMethods ?? []).forEach((m: any) => m.tradeMethodName && methods.add(m.tradeMethodName)));

    return {
      exchange,
      buyPrice: buyPrices.length ? Math.min(...buyPrices) : null,
      sellPrice: sellPrices.length ? Math.max(...sellPrices) : null,
      paymentMethods: Array.from(methods),
      status: 'ok',
    };
  } catch (error: any) {
    return { exchange, buyPrice: null, sellPrice: null, paymentMethods: [], status: 'error', error: error.message };
  }
}

// Bybit P2P (unofficial, reverse-engineered endpoint): side "1" returns
// SELL ads sorted ascending (best buy price first), side "0" returns BUY
// ads sorted descending (best sell price first) — confirmed empirically.
async function fetchBybit(): Promise<P2POffer> {
  const exchange = 'Bybit P2P';
  try {
    const search = async (side: '1' | '0') => {
      const response = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
        method: 'POST',
        headers: { ...P2P_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '', tokenId: ASSET, currencyId: FIAT, payment: [], side, size: String(ROWS), page: '1', amount: '' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.ret_code !== 0) throw new Error(json.ret_msg || 'Bybit error');
      return (json.result?.items ?? []) as any[];
    };

    const [buyItems, sellItems] = await Promise.all([search('1'), search('0')]);

    const buyPrices = buyItems.map((i) => parseFloat(i.price)).filter((p) => !isNaN(p));
    const sellPrices = sellItems.map((i) => parseFloat(i.price)).filter((p) => !isNaN(p));

    return {
      exchange,
      buyPrice: buyPrices.length ? Math.min(...buyPrices) : null,
      sellPrice: sellPrices.length ? Math.max(...sellPrices) : null,
      paymentMethods: [],
      status: 'ok',
    };
  } catch (error: any) {
    return { exchange, buyPrice: null, sellPrice: null, paymentMethods: [], status: 'error', error: error.message };
  }
}

// OKX P2P (unofficial endpoint): side=buy/sell map directly to the
// response's data.buy / data.sell arrays.
async function fetchOkx(): Promise<P2POffer> {
  const exchange = 'OKX P2P';
  try {
    const search = async (side: 'buy' | 'sell') => {
      const url = `https://www.okx.com/v3/c2c/tradingOrders/books?side=${side}&baseCurrency=${ASSET.toLowerCase()}&quoteCurrency=${FIAT.toLowerCase()}&paymentMethod=all&userType=all`;
      const response = await fetch(url, { headers: P2P_HEADERS });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.code !== 0) throw new Error('OKX error');
      return (json.data?.[side] ?? []) as any[];
    };

    const [buyAds, sellAds] = await Promise.all([search('buy'), search('sell')]);

    const buyPrices = buyAds.map((a) => parseFloat(a.price)).filter((p) => !isNaN(p));
    const sellPrices = sellAds.map((a) => parseFloat(a.price)).filter((p) => !isNaN(p));
    const methods = new Set<string>();
    buyAds.forEach((a) => (a.paymentMethods ?? []).forEach((m: string) => methods.add(m)));

    return {
      exchange,
      buyPrice: buyPrices.length ? Math.min(...buyPrices) : null,
      sellPrice: sellPrices.length ? Math.max(...sellPrices) : null,
      paymentMethods: Array.from(methods),
      status: 'ok',
    };
  } catch (error: any) {
    return { exchange, buyPrice: null, sellPrice: null, paymentMethods: [], status: 'error', error: error.message };
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const offers = await fetchWithCache('p2p:usdt-bob', 30_000, async () => {
    return Promise.all([fetchBinance(), fetchBybit(), fetchOkx()]);
  });

  const usable = offers.filter((o) => o.status === 'ok' && o.buyPrice !== null);
  const bestBuy = usable.length ? usable.reduce((a, b) => (b.buyPrice! < a.buyPrice! ? b : a)) : null;

  res.status(200).json({
    asset: ASSET,
    fiat: FIAT,
    exchanges: offers,
    bestBuyExchange: bestBuy?.exchange ?? null,
    timestamp: new Date().toISOString(),
  });
}
