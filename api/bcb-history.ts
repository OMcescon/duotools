import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';
import { scrapeBcbHistory } from './_lib/bcb.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await fetchWithCache('bcb:history', 6 * 60 * 60_000, scrapeBcbHistory);

    res.status(200).json({
      source: 'BCB (bcb.gob.bo)',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('bcb-history error:', error);
    res.status(502).json({ error: 'No se pudo obtener el histórico del TCO del BCB', source: 'BCB (bcb.gob.bo)' });
  }
}
