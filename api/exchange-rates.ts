import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache';

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/latest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const base = ((req.query.base as string) || 'USD').toUpperCase();

  try {
    const data = await fetchWithCache(`frankfurter:${base}`, 60_000, async () => {
      const response = await fetch(`${FRANKFURTER_URL}?base=${base}`);
      if (!response.ok) throw new Error(`Frankfurter respondió ${response.status}`);
      return response.json() as Promise<{ amount: number; base: string; date: string; rates: Record<string, number> }>;
    });

    res.status(200).json({
      source: 'Frankfurter.dev',
      base,
      rates: data.rates,
      officialDate: data.date,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('exchange-rates error:', error);
    res.status(502).json({ error: 'No se pudo obtener el tipo de cambio fiat', source: 'Frankfurter.dev' });
  }
}
