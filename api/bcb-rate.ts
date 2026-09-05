import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache.js';
import { BCB_HEADERS } from './_lib/headers.js';

const BCB_URL = 'https://www.bcb.gob.bo/tco_reporte_ultima_cotizacion.php';

// Matches the BCB page's own CSS-class markers, e.g.:
// <div class="tco-public-value">Bs 11,52/$us</div>
// <span class="tco-public-date">FECHA DE CORTE: JUEVES 20 DE AGOSTO DE 2026</span>
// <span class="tco-public-vigencia">VIGENCIA: VIERNES 21 DE AGOSTO DE 2026</span>
const VALUE_RE = /class="tco-public-value">\s*Bs\s*([\d.,]+)\s*\/\s*\$us/i;
const CUTOFF_DATE_RE = /class="tco-public-date">\s*FECHA DE CORTE:\s*([^<]+?)\s*</i;
const EFFECTIVE_DATE_RE = /class="tco-public-vigencia">\s*VIGENCIA:\s*([^<]+?)\s*</i;

async function scrapeBcb() {
  const response = await fetch(BCB_URL, { headers: BCB_HEADERS });
  if (!response.ok) throw new Error(`BCB respondió ${response.status}`);
  const html = await response.text();

  const valueMatch = html.match(VALUE_RE);
  if (!valueMatch) throw new Error('No se encontró el valor del TCO en la página del BCB');

  const tco = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
  const cutoffDate = html.match(CUTOFF_DATE_RE)?.[1] ?? null;
  const effectiveDate = html.match(EFFECTIVE_DATE_RE)?.[1] ?? null;

  return { tco, cutoffDate, effectiveDate };
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await fetchWithCache('bcb:tco', 5 * 60_000, scrapeBcb);

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
