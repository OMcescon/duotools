import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark, TrendingUp, RefreshCcw, AlertTriangle,
  ExternalLink, ArrowLeftRight, Loader2, Trophy, Building2
} from 'lucide-react';
import * as LightweightCharts from 'lightweight-charts';
import { fetchBcbRate, fetchBcbHistory, fetchP2pRates } from '../logic';

// --- Tipos: reflejan la forma exacta de las respuestas de /api/bcb-rate,
// /api/bcb-history y /api/p2p-rates construidas en Fases 1-3. ---

type BcbRateData = {
  source: string;
  tco: number;
  cutoffDate: string | null;
  effectiveDate: string | null;
  timestamp: string;
};

type HistoryPoint = { date: string; value: number };

type P2POffer = {
  exchange: string;
  buyPrice: number | null;
  sellPrice: number | null;
  paymentMethods: string[];
  status: 'ok' | 'error';
  error?: string;
};

type P2pRatesData = {
  asset: string;
  fiat: string;
  exchanges: P2POffer[];
  bestBuyExchange: string | null;
  timestamp: string;
};

// Cada fuente se modela por separado: loading/success/error independientes,
// para que un fallo del BCB no tumbe la fila de exchanges P2P ni el gráfico.
type FetchState<T> = {
  status: 'loading' | 'success' | 'error';
  data: T | null;
};

const REFRESH_INTERVAL_MS = 60_000;
const FLOAT_START_DATE = '2026-06-29';

const EXCHANGE_LINKS: Record<string, string> = {
  'Binance P2P': 'https://p2p.binance.com',
  'Bybit P2P': 'https://www.bybit.com/fiat/trade/otc',
};

function formatBs(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function formatSecondsAgo(seconds: number) {
  if (seconds < 5) return 'hace un instante';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `hace ${minutes}m ${rem}s`;
}

function ExchangeCard({ offer, isBest }: { offer: P2POffer; isBest: boolean }) {
  const link = EXCHANGE_LINKS[offer.exchange];

  if (offer.status === 'error') {
    return (
      <div className="glass-card p-6 space-y-3 opacity-50">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-white/40" />
          <span className="font-semibold text-white/60">{offer.exchange}</span>
        </div>
        <div className="flex items-center space-x-2 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>No disponible ahora mismo</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-6 space-y-4 relative ${isBest ? 'border-neon-cyan/40' : ''}`}>
      {isBest && (
        <span className="absolute -top-3 right-4 inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider bg-neon-cyan text-black px-2 py-1 rounded-full">
          <Trophy className="w-3 h-3" />
          <span>Mejor precio</span>
        </span>
      )}
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-white/60" />
        <span className="font-semibold">{offer.exchange}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Compra</p>
          <p className="font-mono font-bold text-neon-cyan">
            {offer.buyPrice !== null ? formatBs(offer.buyPrice) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Venta</p>
          <p className="font-mono font-bold text-white/80">
            {offer.sellPrice !== null ? formatBs(offer.sellPrice) : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {offer.paymentMethods.length > 0 ? (
          offer.paymentMethods.slice(0, 3).map((method) => (
            <span key={method} className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-white/50">
              {method}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-white/30">Métodos de pago en la app</span>
        )}
      </div>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-xs text-white/40 hover:text-neon-cyan transition-colors"
        >
          <span>Ver en {offer.exchange}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export default function BobDashboard() {
  // --- Datos remotos ---
  const [bcb, setBcb] = useState<FetchState<BcbRateData>>({ status: 'loading', data: null });
  const [p2p, setP2p] = useState<FetchState<P2pRatesData>>({ status: 'loading', data: null });
  const [history, setHistory] = useState<FetchState<HistoryPoint[]>>({ status: 'loading', data: null });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // --- Gráfico histórico ---
  const [chartRange, setChartRange] = useState<'all' | '30d'>('all');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<'Area'> | null>(null);

  // --- Calculadora ---
  const [calcMode, setCalcMode] = useState<'buy' | 'sell'>('buy');
  const [bobAmount, setBobAmount] = useState('100');
  const [usdtAmount, setUsdtAmount] = useState('');

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Derivados (sin useMemo, siguiendo el patrón del resto del proyecto) ---
  const okOffers = p2p.data?.exchanges.filter((e) => e.status === 'ok') ?? [];
  const buyOffers = okOffers.filter((e) => e.buyPrice !== null);
  const sellOffers = okOffers.filter((e) => e.sellPrice !== null);
  const bestBuyOffer = buyOffers.length
    ? buyOffers.reduce((a, b) => (b.buyPrice! < a.buyPrice! ? b : a))
    : null;
  const bestSellOffer = sellOffers.length
    ? sellOffers.reduce((a, b) => (b.sellPrice! > a.sellPrice! ? b : a))
    : null;

  // Precio promedio entre las dos únicas plataformas con liquidez real (Binance + Bybit)
  const binanceBuy = buyOffers.find((o) => o.exchange === 'Binance P2P')?.buyPrice ?? null;
  const bybitBuy = buyOffers.find((o) => o.exchange === 'Bybit P2P')?.buyPrice ?? null;
  const avgBuyPrice = binanceBuy !== null && bybitBuy !== null ? (binanceBuy + bybitBuy) / 2 : null;
  const activeOffer = calcMode === 'buy' ? bestBuyOffer : bestSellOffer;
  const activePrice = activeOffer ? (calcMode === 'buy' ? activeOffer.buyPrice : activeOffer.sellPrice) : null;

  const brechaPct =
    bcb.data && bestBuyOffer?.buyPrice
      ? ((bestBuyOffer.buyPrice - bcb.data.tco) / bcb.data.tco) * 100
      : null;

  const filteredHistory =
    history.data && chartRange === '30d'
      ? history.data.filter((p) => {
          const days = (Date.now() - new Date(p.date).getTime()) / 86_400_000;
          return days <= 30;
        })
      : history.data;

  // --- Fetchers: independientes, cada uno maneja su propio estado ---
  const fetchBcb = async () => {
    try {
      const data = await fetchBcbRate();
      setBcb({ status: 'success', data });
    } catch {
      setBcb({ status: 'error', data: null });
    }
  };

  const fetchP2p = async () => {
    try {
      const data = await fetchP2pRates();
      setP2p({ status: 'success', data });
    } catch {
      setP2p({ status: 'error', data: null });
    }
  };

  const fetchHistoryData = async () => {
    try {
      const res = await fetchBcbHistory();
      setHistory({ status: 'success', data: res.data });
    } catch {
      setHistory({ status: 'error', data: null });
    }
  };

  const fetchAll = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    await Promise.allSettled([fetchBcb(), fetchP2p()]);
    setLastUpdated(new Date());
    if (isManualRefresh) setIsRefreshing(false);
  };

  // Carga inicial: TCO + P2P (auto-refresh cada 60s) e histórico (una sola vez,
  // gana como máximo un punto nuevo por día — no tiene sentido re-scrapearlo cada minuto).
  useEffect(() => {
    fetchAll();
    fetchHistoryData();
    refreshIntervalRef.current = setInterval(() => fetchAll(), REFRESH_INTERVAL_MS);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  // Contador de "hace Xs", se resetea cuando llega una actualización nueva
  useEffect(() => {
    setSecondsAgo(0);
    tickIntervalRef.current = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [lastUpdated]);

  // Setup del gráfico (una sola vez)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
      handleScroll: false,
      handleScale: false,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const areaSeries = chart.addSeries(LightweightCharts.AreaSeries, {
      lineColor: '#bc13fe',
      topColor: 'rgba(188, 19, 254, 0.3)',
      bottomColor: 'rgba(188, 19, 254, 0.0)',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Actualiza los datos del gráfico cuando cambia el histórico o el rango
  useEffect(() => {
    if (seriesRef.current && filteredHistory && filteredHistory.length > 0) {
      seriesRef.current.setData(filteredHistory.map((p) => ({ time: p.date, value: p.value })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [filteredHistory]);

  // Recalcula el campo USDT cuando cambia el precio activo (refresh o toggle
  // Comprar/Vender), tomando el monto en BOB como ancla.
  useEffect(() => {
    const num = parseFloat(bobAmount);
    if (activePrice && !isNaN(num)) {
      setUsdtAmount((num / activePrice).toFixed(2));
    }
  }, [activePrice, calcMode]);

  const handleBobChange = (value: string) => {
    setBobAmount(value);
    const num = parseFloat(value);
    if (activePrice && !isNaN(num)) {
      setUsdtAmount((num / activePrice).toFixed(2));
    } else {
      setUsdtAmount('');
    }
  };

  const handleUsdtChange = (value: string) => {
    setUsdtAmount(value);
    const num = parseFloat(value);
    if (activePrice && !isNaN(num)) {
      setBobAmount((num * activePrice).toFixed(2));
    } else {
      setBobAmount('');
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
          BOB Hoy
        </h2>
        <p className="text-white/60">Tipo de cambio oficial y mejores precios P2P de USDT en Bolivia, en vivo.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center space-x-2 text-white/40 text-xs uppercase tracking-wider">
            <Landmark className="w-4 h-4" />
            <span>TCO Oficial BCB</span>
          </div>
          {bcb.status === 'loading' && <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />}
          {bcb.status === 'error' && (
            <div className="flex items-center space-x-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No disponible ahora mismo</span>
            </div>
          )}
          {bcb.status === 'success' && bcb.data && (
            <>
              <p className="text-3xl font-mono font-bold">{formatBs(bcb.data.tco)}</p>
              {bcb.data.effectiveDate && (
                <p className="text-xs text-white/40">Vigencia: {bcb.data.effectiveDate}</p>
              )}
            </>
          )}
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center space-x-2 text-white/40 text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Mejor Precio P2P (USDT)</span>
          </div>
          {p2p.status === 'loading' && <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />}
          {p2p.status === 'error' && (
            <div className="flex items-center space-x-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No disponible ahora mismo</span>
            </div>
          )}
          {p2p.status === 'success' &&
            (bestBuyOffer ? (
              <>
                <p className="text-3xl font-mono font-bold text-neon-cyan">{formatBs(bestBuyOffer.buyPrice!)}</p>
                <span className="inline-flex items-center space-x-1 text-xs bg-neon-cyan/10 text-neon-cyan px-2 py-1 rounded-full">
                  <Trophy className="w-3 h-3" />
                  <span>{bestBuyOffer.exchange}</span>
                </span>
              </>
            ) : (
              <p className="text-sm text-white/40">Ningún exchange respondió ahora mismo</p>
            ))}
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center space-x-2 text-white/40 text-xs uppercase tracking-wider">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Brecha vs. Oficial</span>
          </div>
          {brechaPct === null ? (
            <p className="text-sm text-white/40">Sin datos suficientes</p>
          ) : (
            <p
              className={`text-3xl font-mono font-bold ${
                Math.abs(brechaPct) < 2 ? 'text-emerald-400' : Math.abs(brechaPct) < 5 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {brechaPct >= 0 ? '+' : ''}
              {brechaPct.toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      {/* P2P comparison row */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white/80">Comparador P2P — USDT/BOB</h3>
        {p2p.status === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card p-6 h-44 bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        {p2p.status === 'error' && (
          <div className="glass-card p-6 flex items-center space-x-2 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>No se pudieron cargar los exchanges P2P. Reintentando en el próximo ciclo.</span>
          </div>
        )}
        {p2p.status === 'success' && p2p.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {p2p.data.exchanges.map((offer) => (
              <ExchangeCard key={offer.exchange} offer={offer} isBest={offer.exchange === bestBuyOffer?.exchange} />
            ))}
            <div className="glass-card p-6 space-y-3 flex flex-col items-center justify-center text-center border-neon-purple/20">
              <div className="flex items-center space-x-2 text-white/40 text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Precio Promedio P2P</span>
              </div>
              {avgBuyPrice !== null ? (
                <p className="text-3xl font-mono font-bold text-neon-purple">{formatBs(avgBuyPrice)}</p>
              ) : (
                <p className="text-sm text-white/40">Sin datos suficientes</p>
              )}
              <p className="text-[10px] text-white/30">Promedio compra Binance + Bybit</p>
            </div>
          </div>
        )}
      </div>

      {/* Historical chart */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-white/80">Evolución TCO Oficial</h3>
          <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setChartRange('all')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                chartRange === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setChartRange('30d')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                chartRange === '30d' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              30d
            </button>
          </div>
        </div>

        {history.status === 'loading' && (
          <div className="h-[240px] flex items-center justify-center text-white/30">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        {history.status === 'error' && (
          <div className="h-[240px] flex items-center justify-center space-x-2 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>No se pudo cargar el histórico del TCO</span>
          </div>
        )}
        <div ref={chartContainerRef} className={history.status === 'success' ? 'w-full' : 'hidden'} />

        <p className="text-xs text-white/30">
          Serie completa desde el inicio de la flotación administrada ({FLOAT_START_DATE}). El rango de 90 días
          estará disponible recién a partir del 27-sep-2026.
        </p>
      </div>

      {/* Calculator */}
      <div className="glass-card p-6 space-y-6 max-w-xl mx-auto w-full">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-white/80">Calculadora BOB ⇄ USDT</h3>
          <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setCalcMode('buy')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                calcMode === 'buy' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Comprar
            </button>
            <button
              onClick={() => setCalcMode('sell')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                calcMode === 'sell' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Vender
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-wider ml-1">BOB</label>
          <input
            type="number"
            value={bobAmount}
            onChange={(e) => handleBobChange(e.target.value)}
            className="glass-input w-full text-xl font-mono"
          />
        </div>

        <div className="flex justify-center text-white/30">
          <ArrowLeftRight className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-wider ml-1">USDT</label>
          <input
            type="number"
            value={usdtAmount}
            onChange={(e) => handleUsdtChange(e.target.value)}
            className="glass-input w-full text-xl font-mono"
          />
        </div>

        {activePrice !== null ? (
          <p className="text-xs text-white/40 text-center">
            1 USDT = {formatBs(activePrice)} · {activeOffer?.exchange} ({calcMode === 'buy' ? 'compra' : 'venta'})
          </p>
        ) : (
          <p className="text-xs text-amber-400 text-center">No hay precio disponible para calcular ahora mismo.</p>
        )}
      </div>

      {/* Status bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <RefreshCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{lastUpdated ? `Actualizado ${formatSecondsAgo(secondsAgo)}` : 'Cargando...'}</span>
          </div>
          <button onClick={() => fetchAll(true)} className="underline hover:text-white/70 transition-colors">
            Actualizar ahora
          </button>
        </div>
        <p className="text-center sm:text-right">
          Fuentes: BCB · Binance P2P · Bybit P2P. Datos informativos, no constituye asesoría financiera.
        </p>
      </div>
    </div>
  );
}
