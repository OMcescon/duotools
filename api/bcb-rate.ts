import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';
import { scrapeBcbTco } from './_lib/bcb.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await fetchWithCache('bcb:tco', 5 * 60_000, scrapeBcbTco);

    res.status(200).json({
      source: 'BCB (bcb.gob.bo)',
      tco: data.tco,
      cutoffDate: data.cutoffDate,
      effectiveDate: data.effectiveDate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('bcb-rate error:', error);
    res.status(502).json({ error: 'No se pudo obtener el TCO oficial del BCB', source: 'BCB (bcb.gob.bo)' });
  }
}
