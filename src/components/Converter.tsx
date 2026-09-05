import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftRight, TrendingUp, RefreshCcw,
  Loader2, Calendar, Clock, Download, ExternalLink,
  ChevronDown, ChevronUp, Info, AlertTriangle,
  Share2, Calculator, Zap, Trophy, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LightweightCharts from 'lightweight-charts';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import { fetchRates, fetchCryptoRates, fetchBcbRate, fetchP2pRates, fetchBcbHistory } from '../logic';

const CURRENCIES = [
  { id: 'usd', name: 'US Dollar', symbol: '$', type: 'fiat' },
  { id: 'eur', name: 'Euro', symbol: '€', type: 'fiat' },
  { id: 'gbp', name: 'British Pound', symbol: '£', type: 'fiat' },
  { id: 'jpy', name: 'Japanese Yen', symbol: '¥', type: 'fiat' },
  { id: 'ars', name: 'Argentine Peso', symbol: '$', type: 'fiat' },
  { id: 'brl', name: 'Brazilian Real', symbol: 'R$', type: 'fiat' },
  { id: 'clp', name: 'Chilean Peso', symbol: '$', type: 'fiat' },
  { id: 'cop', name: 'Colombian Peso', symbol: '$', type: 'fiat' },
  { id: 'pen', name: 'Peruvian Sol', symbol: 'S/', type: 'fiat' },
  { id: 'ves', name: 'Venezuelan Bolívar', symbol: 'Bs.', type: 'fiat' },
  { id: 'mxn', name: 'Mexican Peso', symbol: '$', type: 'fiat' },
  { id: 'uyu', name: 'Uruguayan Peso', symbol: '$U', type: 'fiat' },
  { id: 'pyg', name: 'Paraguayan Guarani', symbol: '₲', type: 'fiat' },
  { id: 'bob', name: 'Boliviano (TCO Oficial BCB)', symbol: 'Bs', type: 'fiat' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', type: 'crypto' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', type: 'crypto' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', type: 'crypto' },
  { id: 'tether', name: 'Tether', symbol: 'USDT', type: 'crypto' },
  { id: 'usd-coin', name: 'USD Coin', symbol: 'USDC', type: 'crypto' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', type: 'crypto' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', type: 'crypto' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', type: 'crypto' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', type: 'crypto' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', type: 'crypto' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', type: 'crypto' },
  { id: 'tron', name: 'TRON', symbol: 'TRX', type: 'crypto' },
];

const CRYPTO_IDS = CURRENCIES.filter(c => c.type === 'crypto').map(c => c.id).join(',');

// Pares prioritarios Bolivia — accesos rápidos a las conversiones que más se usan hoy
const PRIORITY_PAIRS = [
  { label: 'USDT/BOB', from: 'tether', to: 'bob' },
  { label: 'BTC/BOB', from: 'bitcoin', to: 'bob' },
  { label: 'ETH/BOB', from: 'ethereum', to: 'bob' },
  { label: 'BNB/BOB', from: 'binancecoin', to: 'bob' },
  { label: 'SOL/BOB', from: 'solana', to: 'bob' },
];

const EXCHANGE_LINKS: Record<string, string> = {
  'Binance P2P': 'https://p2p.binance.com',
  'Bybit P2P': 'https://www.bybit.com/fiat/trade/otc',
  'OKX P2P': 'https://www.okx.com/p2p-markets',
};

const REFRESH_INTERVAL_MS = 60_000;
// Diferencia vs. TCO oficial por encima de la cual un precio P2P se considera
// no confiable (poca liquidez real / anuncio fuera de mercado) y se oculta.
const ANOMALY_THRESHOLD = 0.3;

// --- Tipos: reflejan la forma exacta de las respuestas de /api/exchange-rates,
// /api/crypto-rates, /api/bcb-rate, /api/bcb-history y /api/p2p-rates. ---

type FiatRateData = { source: string; base: string; rates: Record<string, number>; officialDate: string; timestamp: string };
type CryptoRateData = { source: string; prices: Record<string, { usd: number; bob: number | null }>; usdBobRate: number | null; timestamp: string };
type BcbRateData = { source: string; tco: number; cutoffDate: string | null; effectiveDate: string | null; timestamp: string };
type HistoryPoint = { date: string; value: number };
type P2POffer = { exchange: string; buyPrice: number | null; sellPrice: number | null; paymentMethods: string[]; status: 'ok' | 'error'; error?: string };
type P2pRatesData = { asset: string; fiat: string; exchanges: P2POffer[]; bestBuyExchange: string | null; timestamp: string };

// Cada fuente se modela por separado: loading/success/error independientes,
// para que un fallo del BCB no tumbe el resto del conversor.
type FetchState<T> = { status: 'loading' | 'success' | 'error'; data: T | null };

function isAnomalousPrice(price: number | null, tco: number | null): boolean {
  if (price === null || tco === null) return false;
  return Math.abs(price - tco) / tco > ANOMALY_THRESHOLD;
}

function formatBs(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function P2PCard({ offer, isBest, tco }: { offer: P2POffer; isBest: boolean; tco: number | null }) {
  const link = EXCHANGE_LINKS[offer.exchange];
  const anomalous = offer.status === 'ok' && (isAnomalousPrice(offer.buyPrice, tco) || isAnomalousPrice(offer.sellPrice, tco));
  const unavailable = offer.status === 'error' || anomalous;

  const spread = !unavailable && offer.buyPrice && offer.sellPrice
    ? `${(((offer.sellPrice - offer.buyPrice) / offer.buyPrice) * 100).toFixed(2)}%`
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`glass-card p-5 space-y-4 transition-all group relative overflow-hidden ${
        isBest && !unavailable ? 'border-neon-cyan/40' : 'hover:border-neon-cyan/30 hover:shadow-[0_0_30px_rgba(0,245,255,0.1)]'
      }`}
    >
      {isBest && !unavailable && (
        <span className="absolute -top-3 right-4 inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider bg-neon-cyan text-black px-2 py-1 rounded-full">
          <Trophy className="w-3 h-3" />
          <span>Mejor precio</span>
        </span>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-neon-cyan group-hover:scale-110 transition-transform">
            {offer.exchange[0]}
          </div>
          <div>
            <h4 className="font-bold text-white">{offer.exchange}</h4>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Exchange Verificado</p>
          </div>
        </div>
        {!unavailable && (
          <div className="text-right">
            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Spread</p>
            <p className="text-xs font-mono font-bold text-neon-purple">{spread}</p>
          </div>
        )}
      </div>

      {unavailable ? (
        <div className="flex items-center space-x-2 text-amber-400 text-xs py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{offer.status === 'error' ? 'No disponible ahora mismo' : 'No disponible en Bolivia ahora mismo'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Compra</p>
            <p className="text-xl font-mono font-bold text-emerald-400">{offer.buyPrice?.toFixed(2) ?? '—'} <span className="text-[10px]">Bs</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Venta</p>
            <p className="text-xl font-mono font-bold text-white">{offer.sellPrice?.toFixed(2) ?? '—'} <span className="text-[10px]">Bs</span></p>
          </div>
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 group-hover:bg-neon-cyan group-hover:text-black group-hover:border-neon-cyan transition-all"
        >
          <span>Comprar Ahora</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}

export default function Converter({ onTabChange }: { onTabChange?: (tab: any) => void }) {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState(CURRENCIES.find(c => c.id === 'bitcoin')!);
  const [toCurrency, setToCurrency] = useState(CURRENCIES.find(c => c.id === 'usd')!);

  const [fiat, setFiat] = useState<FetchState<FiatRateData>>({ status: 'loading', data: null });
  const [crypto, setCrypto] = useState<FetchState<CryptoRateData>>({ status: 'loading', data: null });
  const [bcb, setBcb] = useState<FetchState<BcbRateData>>({ status: 'loading', data: null });
  const [p2p, setP2p] = useState<FetchState<P2pRatesData>>({ status: 'loading', data: null });
  const [bcbHistory, setBcbHistory] = useState<FetchState<HistoryPoint[]>>({ status: 'loading', data: null });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState<'all' | '30d'>('all');
  const [hoverData, setHoverData] = useState<any>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Area"> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Tasas derivadas: valor de 1 unidad de cada moneda en USD.
  // El BOB SIEMPRE se deriva del TCO oficial BCB, nunca de Frankfurter. ---
  const usdRates: Record<string, number> = { usd: 1 };
  if (fiat.data?.rates) {
    Object.keys(fiat.data.rates).forEach(code => {
      usdRates[code.toLowerCase()] = 1 / fiat.data!.rates[code];
    });
  }
  if (crypto.data?.prices) {
    Object.keys(crypto.data.prices).forEach(id => {
      usdRates[id] = crypto.data!.prices[id].usd;
    });
  }
  if (bcb.data) {
    usdRates['bob'] = 1 / bcb.data.tco;
  }
  const ratesLoading = fiat.status === 'loading' || crypto.status === 'loading' || bcb.status === 'loading';

  // --- Mejor precio P2P (filtrando ofertas anómalas frente al TCO oficial) ---
  const okOffers = (p2p.data?.exchanges ?? []).filter(o => o.status === 'ok');
  const buyOffers = okOffers.filter(o => o.buyPrice !== null && !isAnomalousPrice(o.buyPrice, bcb.data?.tco ?? null));
  const sellOffers = okOffers.filter(o => o.sellPrice !== null && !isAnomalousPrice(o.sellPrice, bcb.data?.tco ?? null));
  const bestBuyOffer = buyOffers.length ? buyOffers.reduce((a, b) => (b.buyPrice! < a.buyPrice! ? b : a)) : null;
  const bestSellOffer = sellOffers.length ? sellOffers.reduce((a, b) => (b.sellPrice! > a.sellPrice! ? b : a)) : null;

  const brechaPct = bcb.data && bestBuyOffer?.buyPrice
    ? ((bestBuyOffer.buyPrice - bcb.data.tco) / bcb.data.tco) * 100
    : null;

  // --- Histórico TCO (rango visible + variación día-anterior) ---
  const filteredHistory = bcbHistory.data && chartRange === '30d'
    ? bcbHistory.data.filter(p => (Date.now() - new Date(p.date).getTime()) / 86_400_000 <= 30)
    : bcbHistory.data;

  const tcoVariation = (() => {
    const data = bcbHistory.data;
    if (!data || data.length < 2) return null;
    const prev = data[data.length - 2].value;
    const curr = data[data.length - 1].value;
    const diffBs = curr - prev;
    const diffPct = prev !== 0 ? (diffBs / prev) * 100 : 0;
    return { diffBs, diffPct, up: diffBs >= 0 };
  })();

  const getSeriesVariation = () => {
    if (!filteredHistory || filteredHistory.length < 2) return { val: '0.00', up: true };
    const first = filteredHistory[0].value;
    const last = filteredHistory[filteredHistory.length - 1].value;
    const diff = first !== 0 ? ((last - first) / first) * 100 : 0;
    return { val: Math.abs(diff).toFixed(2), up: diff >= 0 };
  };
  const seriesVariation = getSeriesVariation();

  // --- Fetchers: cada fuente maneja su propio estado, un fallo no bloquea al resto ---
  const fetchFiat = async () => {
    try {
      const data = await fetchRates('usd');
      setFiat({ status: 'success', data });
    } catch {
      setFiat({ status: 'error', data: null });
    }
  };

  const fetchCrypto = async () => {
    try {
      const data = await fetchCryptoRates(CRYPTO_IDS);
      setCrypto({ status: 'success', data });
    } catch {
      setCrypto({ status: 'error', data: null });
    }
  };

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

  const fetchAll = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    await Promise.allSettled([fetchFiat(), fetchCrypto(), fetchBcb(), fetchP2p()]);
    setLastUpdated(new Date());
    if (isManualRefresh) setIsRefreshing(false);
  };

  const fetchHistoryData = async () => {
    try {
      const res = await fetchBcbHistory();
      setBcbHistory({ status: 'success', data: res.data });
    } catch {
      setBcbHistory({ status: 'error', data: null });
    }
  };

  // Carga inicial: tasas + P2P (auto-refresh cada 60s) e histórico BCB (una sola
  // vez, gana como máximo un punto nuevo por día). Ya no depende del par
  // seleccionado — todas las tasas se cargan de una vez.
  useEffect(() => {
    fetchAll();
    fetchHistoryData();
    refreshIntervalRef.current = setInterval(() => fetchAll(), REFRESH_INTERVAL_MS);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

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
      height: 300,
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
      lineColor: '#00f3ff',
      topColor: 'rgba(0, 243, 255, 0.3)',
      bottomColor: 'rgba(0, 243, 255, 0.0)',
      lineWidth: 2,
    });

    chart.subscribeCrosshairMove(param => {
      if (param.time && param.point) {
        const data = param.seriesData.get(areaSeries);
        if (data) {
          setHoverData({
            time: param.time,
            value: (data as any).value,
            point: param.point
          });
        }
      } else {
        setHoverData(null);
      }
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

  useEffect(() => {
    if (seriesRef.current && filteredHistory && filteredHistory.length > 0) {
      seriesRef.current.setData(filteredHistory.map(p => ({ time: p.date, value: p.value })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [filteredHistory]);

  const convertValue = () => {
    if (!usdRates[fromCurrency.id] || !usdRates[toCurrency.id]) return '0';
    const num = parseFloat(amount) || 0;
    const currentRate = 1 / (usdRates[toCurrency.id] || 1);
    const result = num * usdRates[fromCurrency.id] * currentRate;

    // Dynamic precision based on value
    let precision = 2;
    if (toCurrency.type === 'crypto') precision = 8;
    else if (result < 0.1) precision = 4;
    else if (result < 1) precision = 3;

    return result.toLocaleString(undefined, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision > 2 ? precision : 2
    });
  };

  const downloadCSV = () => {
    if (!bcbHistory.data) return;
    const csvData = bcbHistory.data.map(h => ({
      Fecha: h.date,
      TCO_Oficial_BOB_USD: h.value
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'duotools_tco_bcb_historico.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const GUIDES = [
    {
      id: 'binance',
      title: 'Binance P2P',
      content: 'El método más popular en Bolivia. Requiere cuenta verificada (KYC). Puedes comprar USDT con transferencia bancaria (BNB, Mercantil, etc.) o QR. Es seguro siempre que uses el sistema de depósito de garantía de Binance.',
      link: 'https://p2p.binance.com'
    },
    {
      id: 'bybit',
      title: 'Bybit P2P',
      content: 'Excelente alternativa con comisiones competitivas. El proceso es similar a Binance. Muy útil cuando hay mayor liquidez o mejores precios en esta plataforma.',
      link: 'https://www.bybit.com'
    },
    {
      id: 'airtm',
      title: 'Airtm',
      content: 'Ideal para mover fondos desde PayPal, Payoneer o Skrill hacia tu cuenta bancaria en Bolivia. La tasa suele ser un poco más alta pero ofrece gran flexibilidad.',
      link: 'https://www.airtm.com'
    },
    {
      id: 'virtual-cards',
      title: 'Tarjetas Virtuales (Meru/Wallbit)',
      content: 'Permiten recibir pagos en USD y gastar con tarjetas virtuales en comercios online. Útil para suscripciones y compras internacionales evitando bloqueos locales.',
      link: '#'
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
          Live Exchange
        </h2>
        <p className="text-white/60">Professional real-time market data with advanced analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Converter */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6 overflow-hidden">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">From</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input flex-1 text-xl font-mono min-w-0"
                  />
                  <select
                    value={fromCurrency.id}
                    onChange={(e) => setFromCurrency(CURRENCIES.find(c => c.id === e.target.value)!)}
                    className="glass-input w-full sm:w-32 bg-[#1a1a1e] text-sm shrink-0"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.id} value={c.id}>{c.id.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-2">
                {[10, 50, 100, 500, 1000].map(val => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-neon-cyan/10 hover:border-neon-cyan/30 transition-all"
                  >
                    {val} {fromCurrency.symbol}
                  </button>
                ))}
              </div>

              {/* Priority Pairs Bolivia */}
              <div className="grid grid-cols-5 gap-2">
                {PRIORITY_PAIRS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setFromCurrency(CURRENCIES.find(c => c.id === p.from)!);
                      setToCurrency(CURRENCIES.find(c => c.id === p.to)!);
                    }}
                    className="py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold hover:bg-neon-purple/10 hover:border-neon-purple/30 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const temp = fromCurrency;
                    setFromCurrency(toCurrency);
                    setToCurrency(temp);
                  }}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-neon-cyan transition-all hover:rotate-180"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">To</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="glass-input flex-1 text-xl font-mono flex items-center bg-white/5 overflow-hidden min-w-0">
                    <span className="truncate">{convertValue()}</span>
                  </div>
                  <select
                    value={toCurrency.id}
                    onChange={(e) => setToCurrency(CURRENCIES.find(c => c.id === e.target.value)!)}
                    className="glass-input w-full sm:w-32 bg-[#1a1a1e] text-sm shrink-0"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.id} value={c.id}>{c.id.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white/40">
                  <RefreshCcw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                  <span>Updates every 60s</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Current Rate</p>
                <div className="flex items-baseline space-x-2">
                  {usdRates[fromCurrency.id] && usdRates[toCurrency.id] ? (
                    <p className="text-lg font-mono text-white">
                      1 {fromCurrency.symbol} = { (usdRates[fromCurrency.id] / usdRates[toCurrency.id]).toLocaleString(undefined, {
                        minimumFractionDigits: (usdRates[fromCurrency.id] / usdRates[toCurrency.id]) < 0.1 ? 4 : 2,
                        maximumFractionDigits: (usdRates[fromCurrency.id] / usdRates[toCurrency.id]) < 0.1 ? 6 : 4
                      }) } {toCurrency.symbol}
                    </p>
                  ) : (
                    <p className="text-sm text-white/40">Cargando tasas...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: BCB TCO Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-neon-cyan/10">
                  <TrendingUp className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Evolución TCO Oficial</h3>
                  <p className="text-xs text-white/40">Tipo de cambio oficial administrado — BCB</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadCSV}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                  title="Download CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
                  {(['all', '30d'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                        chartRange === r ? 'bg-neon-cyan text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {r === 'all' ? 'Todo' : '30d'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 relative min-h-[300px]" ref={chartContainerRef}>
              {bcbHistory.status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                </div>
              )}
              {bcbHistory.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 space-x-2 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>No se pudo cargar el histórico del TCO</span>
                </div>
              )}

              {/* Custom Tooltip */}
              <AnimatePresence>
                {hoverData && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute z-20 pointer-events-none glass-card p-3 shadow-2xl border-neon-cyan/30 min-w-[160px]"
                    style={{
                      left: Math.min(hoverData.point.x + 10, (chartContainerRef.current?.clientWidth || 0) - 170),
                      top: Math.max(hoverData.point.y - 100, 10)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 text-white/40">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">
                          {dayjs(hoverData.time).format('D MMM YYYY')}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-mono font-bold text-white">
                        Bs{hoverData.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      <div className={`flex items-center space-x-1 text-[10px] font-bold ${seriesVariation.up ? 'text-emerald-500' : 'text-red-500'}`}>
                        {seriesVariation.up ? '▲' : '▼'} {seriesVariation.val}%
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">TCO Oficial Hoy</p>
                <p className="text-2xl font-mono font-bold text-white">
                  {bcb.data ? formatBs(bcb.data.tco) : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Variación vs. Día Anterior</p>
                {tcoVariation ? (
                  <p className={`text-lg font-mono font-bold ${tcoVariation.up ? 'text-emerald-500' : 'text-red-500'}`}>
                    {tcoVariation.up ? '+' : ''}{tcoVariation.diffBs.toFixed(4)} Bs ({tcoVariation.up ? '+' : ''}{tcoVariation.diffPct.toFixed(2)}%)
                  </p>
                ) : (
                  <p className="text-sm text-white/40">Sin datos suficientes</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Fecha de Vigencia</p>
                <p className="text-sm font-mono text-white">{bcb.data?.effectiveDate || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USDT en Bolivia + P2P Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Precio USDT en Bolivia Hoy */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-0 border-none relative overflow-hidden group"
          >
            {/* Header with Gradient Background */}
            <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Precio USDT en Bolivia Hoy</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">TCO Oficial BCB vs. Mejor Precio P2P</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Main Prices Display */}
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Precio de Compra (P2P)</p>
                  <div className="relative inline-block">
                    <p className="text-5xl font-mono font-black text-neon-cyan drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                      {bestBuyOffer ? bestBuyOffer.buyPrice!.toFixed(2) : '—'}
                    </p>
                    <span className="absolute -right-6 bottom-1 text-xs text-white/40 font-bold">Bs</span>
                  </div>
                  {bestBuyOffer && <p className="text-[9px] text-white/30 uppercase font-bold">{bestBuyOffer.exchange}</p>}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Precio de Venta (P2P)</p>
                  <div className="relative inline-block">
                    <p className="text-5xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      {bestSellOffer ? bestSellOffer.sellPrice!.toFixed(2) : '—'}
                    </p>
                    <span className="absolute -right-6 bottom-1 text-xs text-white/40 font-bold">Bs</span>
                  </div>
                  {bestSellOffer && <p className="text-[9px] text-white/30 uppercase font-bold">{bestSellOffer.exchange}</p>}
                </div>
              </div>

              {/* Gap & Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:border-neon-purple/30 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-neon-purple/10">
                      <TrendingUp className="w-4 h-4 text-neon-purple" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Brecha vs Oficial</p>
                      <p className="text-xs font-bold text-white/80">BCB: {bcb.data ? formatBs(bcb.data.tco) : '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {brechaPct !== null ? (
                      <>
                        <p className="text-xl font-mono font-bold text-neon-purple">
                          {brechaPct >= 0 ? '+' : ''}{brechaPct.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-neon-purple font-bold uppercase">{brechaPct >= 0 ? '↑' : '↓'} Spread</p>
                      </>
                    ) : (
                      <p className="text-xs text-white/30">Sin datos</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-2 text-[10px] text-white/30">
                    <Clock className="w-3 h-3" />
                    <span>Última actualización: {lastUpdated ? dayjs(lastUpdated).format('dddd D [de] MMMM YYYY, hh:mm a') : 'Cargando...'}</span>
                  </div>
                  {onTabChange && (
                    <button
                      onClick={() => onTabChange('methodology')}
                      className="text-[10px] text-neon-cyan hover:underline font-bold uppercase tracking-wider transition-all"
                    >
                      Ver metodología
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setAmount('100');
                    setFromCurrency(CURRENCIES.find(c => c.id === 'tether')!);
                    setToCurrency(CURRENCIES.find(c => c.id === 'bob')!);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center space-x-2 p-4 rounded-xl bg-neon-cyan text-black font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,245,255,0.2)]"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Calculadora Rápida</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Precio USDT en Bolivia - DuoTools',
                        text: `Cotización USDT en Bolivia: Compra ${bestBuyOffer?.buyPrice?.toFixed(2) ?? '—'} Bs / Venta ${bestSellOffer?.sellPrice?.toFixed(2) ?? '—'} Bs.`,
                        url: window.location.href
                      });
                    }
                  }}
                  className="flex items-center justify-center space-x-2 p-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir</span>
                </button>
              </div>

              <p className="text-[9px] text-white/20 text-center leading-relaxed">
                TCO oficial: Banco Central de Bolivia. Precio P2P: mejores órdenes entre Binance, Bybit y OKX.
              </p>
            </div>
          </motion.div>

          {/* Quick Latam Conversion */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Otras Monedas Latam</h4>
              <span className="text-[9px] text-white/20 uppercase font-bold tracking-tighter">vs BOB (TCO Oficial)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.filter(c => ['ars', 'pen', 'clp', 'brl'].includes(c.id)).map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:border-neon-cyan/20 transition-all group">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 group-hover:text-neon-cyan transition-colors">
                      {c.id.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-white/80">
                    {usdRates.bob && usdRates[c.id] ? ((usdRates.bob) / (usdRates[c.id])).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : '—'} {c.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P2P Comparison Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-neon-cyan/10">
                <Zap className="w-5 h-5 text-neon-cyan" />
              </div>
              <h3 className="text-xl font-bold text-white">Mejores Tasas P2P en Vivo</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Rates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {p2p.status === 'loading' && (
              [0, 1, 2].map(i => (
                <div key={i} className="glass-card p-5 h-48 bg-white/5 animate-pulse" />
              ))
            )}
            {p2p.status === 'error' && (
              <div className="glass-card p-5 flex items-center space-x-2 text-amber-400 text-sm md:col-span-2">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>No se pudieron cargar los exchanges P2P. Reintentando en el próximo ciclo.</span>
              </div>
            )}
            {p2p.status === 'success' && p2p.data && p2p.data.exchanges.map((offer) => (
              <P2PCard
                key={offer.exchange}
                offer={offer}
                isBest={offer.exchange === bestBuyOffer?.exchange}
                tco={bcb.data?.tco ?? null}
              />
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-3 text-white/30">
              <Info className="w-4 h-4 flex-shrink-0" />
              <p className="text-[10px] italic leading-relaxed">
                Los precios mostrados son las mejores órdenes disponibles en cada plataforma. El precio final puede variar según el método de pago (Transferencia, QR, Tigo Money) y los límites del anunciante.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guides Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Info className="w-5 h-5 text-neon-purple" />
          </div>
          <h3 className="text-xl font-bold">Guías y Recursos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDES.map(guide => (
            <div
              key={guide.id}
              className="glass-card overflow-hidden transition-all border-white/10 hover:border-white/20"
            >
              <button
                onClick={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className="font-bold">{guide.title}</span>
                {expandedGuide === guide.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {expandedGuide === guide.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-4">
                      <p className="text-sm text-white/60 leading-relaxed">
                        {guide.content}
                      </p>
                      <a
                        href={guide.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-xs font-bold text-neon-cyan hover:underline"
                      >
                        <span>Visitar plataforma</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-start space-x-4">
        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest">Aviso Importante</h4>
          <p className="text-xs text-white/60 leading-relaxed">
            La información publicada tiene carácter informativo y referencial. No constituye asesoramiento financiero ni garantía de precios futuros. DuoTools no se responsabiliza por decisiones tomadas en base a estos datos.
          </p>
        </div>
      </div>
    </div>
  );
}
