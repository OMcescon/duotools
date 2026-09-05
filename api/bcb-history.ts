import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithCache } from './_lib/cache';
import { BCB_HEADERS } from './_lib/headers';

const BCB_URL = 'https://www.bcb.gob.bo/tco_reporte_ultima_cotizacion.php';

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

// The BCB page's "TIPO DE CAMBIO OFICIAL - DIARIO" table is not a rolling
// window — it's the full daily series since the administered float began
// (29-jun-2026), growing by one row per day. There is no query param to
// extend it (confirmed: ?dias=90 has no effect) and no data exists before
// the float started.
const TABLE_RE = /class="tco-daily-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i;
const ROW_RE = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
const DATE_RE = /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i;

type HistoryPoint = { date: string; value: number };

async function scrapeHistory(): Promise<HistoryPoint[]> {
  const response = await fetch(BCB_URL, { headers: BCB_HEADERS });
  if (!response.ok) throw new Error(`BCB respondió ${response.status}`);
  const html = await response.text();

  const tableMatch = html.match(TABLE_RE);
  if (!tableMatch) throw new Error('No se encontró la tabla histórica del TCO en la página del BCB');

  const points: HistoryPoint[] = [];
  ROW_RE.lastIndex = 0;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = ROW_RE.exec(tableMatch[1])) !== null) {
    const [, dateText, valueText] = rowMatch;
    const dateMatch = dateText.match(DATE_RE);
    const month = dateMatch ? MONTHS[dateMatch[2].toLowerCase()] : undefined;
    const value = parseFloat(valueText.trim().replace(',', '.'));
    if (!dateMatch || !month || isNaN(value)) continue;

    const day = dateMatch[1].padStart(2, '0');
    points.push({ date: `${dateMatch[3]}-${month}-${day}`, value });
  }

  if (points.length === 0) throw new Error('No se pudo parsear ningún punto histórico del TCO');
  return points;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await fetchWithCache('bcb:history', 6 * 60 * 60_000, scrapeHistory);

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
