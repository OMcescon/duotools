import { BCB_HEADERS } from './headers.js';

// BCB dejó de actualizar la página estática "tco_reporte_ultima_cotizacion.php"
// (quedó clavada en agosto). Este es el endpoint real que su propio sitio usa
// para el iframe "Tipo de cambio por períodos" en ?q=cotizaciones_tc — un GET
// con rango de fechas, confirmado que devuelve el TCO diario real bajo la
// flotación administrada.
const PERIODOS_URL = 'https://www.bcb.gob.bo/librerias/indicadores/dolar/periodos.php';

const TABLE_RE = /<table[^>]*class="tablaborde"[^>]*>([\s\S]*?)<\/table>/i;
const ROW_RE = /<div align="center">(\d{1,2}) de ([A-Za-z]+) (\d{4})<\/div><\/td>\s*<td><div align="right"><strong>Bs<\/strong>([\d.,]+) por 1 US\$/gi;

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

type BcbPoint = { date: string; value: number; label: string };

function buildPeriodUrl(start: Date, end: Date): string {
  const params = new URLSearchParams({
    sdd: String(start.getDate()), smm: String(start.getMonth() + 1), saa: String(start.getFullYear()),
    edd: String(end.getDate()), emm: String(end.getMonth() + 1), eaa: String(end.getFullYear()),
    qlist: '1',
  });
  return `${PERIODOS_URL}?${params.toString()}`;
}

async function fetchBcbPeriod(start: Date, end: Date): Promise<BcbPoint[]> {
  const response = await fetch(buildPeriodUrl(start, end), { headers: BCB_HEADERS });
  if (!response.ok) throw new Error(`BCB respondió ${response.status}`);
  const html = await response.text();

  const tableMatch = html.match(TABLE_RE);
  if (!tableMatch) throw new Error('No se encontró la tabla del TCO en el reporte de períodos del BCB');

  const points: BcbPoint[] = [];
  ROW_RE.lastIndex = 0;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = ROW_RE.exec(tableMatch[1])) !== null) {
    const [, day, monthName, year, valueText] = rowMatch;
    const month = MONTHS[monthName.toLowerCase()];
    const value = parseFloat(valueText.replace(/\./g, '').replace(',', '.'));
    if (!month || isNaN(value)) continue;
    points.push({ date: `${year}-${month}-${day.padStart(2, '0')}`, value, label: `${day} de ${monthName} ${year}` });
  }
  return points;
}

// Toma el TCO más reciente dentro de una ventana de ~10 días, para que un
// atraso de publicación de uno o dos días del BCB no deje el resultado vacío.
export async function scrapeBcbTco() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 10);

  const points = await fetchBcbPeriod(start, end);
  if (points.length === 0) throw new Error('No se encontró el TCO en el reporte de períodos del BCB');

  const latest = points[points.length - 1];
  return { tco: latest.value, cutoffDate: null as string | null, effectiveDate: latest.label };
}

// La tabla de períodos solo publica el TCO puro (sin compra/venta) desde el
// 27-jun-2026, cuando arrancó la flotación administrada.
export async function scrapeBcbHistory(): Promise<{ date: string; value: number }[]> {
  const start = new Date(Date.UTC(2026, 5, 27));
  const end = new Date();

  const points = await fetchBcbPeriod(start, end);
  if (points.length === 0) throw new Error('No se pudo parsear ningún punto histórico del TCO');

  return points.map(({ date, value }) => ({ date, value }));
}
