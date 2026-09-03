import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftRight, TrendingUp, RefreshCcw, Coins, DollarSign, 
  Loader2, Calendar, Clock, Download, ExternalLink, 
  ChevronDown, ChevronUp, Info, AlertTriangle, TrendingDown,
  Layers, Share2, Calculator, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LightweightCharts from 'lightweight-charts';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import { fetchRates, fetchHistoricalData } from '../logic';

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
  { id: 'bob', name: 'Boliviano (Oficial)', symbol: 'Bs', type: 'fiat' },
  { id: 'bob_parallel', name: 'Boliviano (Paralelo)', symbol: 'Bs', type: 'fiat' },
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

const RANGES = [
  { label: '24h', value: '1' },
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '1y', value: '365' },
];

export default function Converter({ onTabChange }: { onTabChange?: (tab: any) => void }) {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState(CURRENCIES[12]); // BTC
  const [toCurrency, setToCurrency] = useState(CURRENCIES[0]); // USD
  const [rates, setRates] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [range, setRange] = useState('1');
  const [hoverData, setHoverData] = useState<any>(null);
  const [p2pData, setP2pData] = useState<any[]>([]);
  const [officialRate, setOfficialRate] = useState(6.96);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Area"> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchRates('usd');
      const { rates: fiat, crypto } = data;
      const newRates: any = {};
      
      // Map Crypto Rates (Prices in USD)
      if (crypto) {
        Object.keys(crypto).forEach(id => {
          newRates[id] = crypto[id].usd;
        });
      }

      // Map Fiat Rates (Values relative to 1 USD)
      if (fiat) {
        Object.keys(fiat).forEach(code => {
          const currencyId = code.toLowerCase();
          // Store the value of 1 unit of this currency in USD
          // If 1 USD = 6.96 BOB, then 1 BOB = 1/6.96 USD
          newRates[currencyId] = 1 / fiat[code];
        });
      }

      newRates['usd'] = 1;
      setRates(newRates);
      setP2pData(data.p2p || []);
      setOfficialRate(data.official || 6.96);
      setLastUpdated(new Date());

      if (fromCurrency.type === 'crypto') {
        const vsCurrency = toCurrency.type === 'fiat' ? toCurrency.id : 'usd';
        let histData = await fetchHistoricalData(fromCurrency.id, vsCurrency, range);
        
        if (vsCurrency !== 'usd' && toCurrency.type === 'fiat' && newRates[toCurrency.id]) {
          const currentFiatRate = 1 / (newRates[toCurrency.id] || 1);
          histData = histData.map(p => ({ ...p, value: p.value * currentFiatRate }));
        } else if (toCurrency.type === 'crypto' && newRates[toCurrency.id]) {
          const targetCryptoPriceInUsd = newRates[toCurrency.id];
          histData = histData.map(p => ({ ...p, value: p.value / targetCryptoPriceInUsd }));
        }
        setHistory(histData);
      } else {
        const baseTrend = Array.from({ length: 100 }, (_, i) => ({
          time: (Date.now() / 1000) - (100 - i) * 3600,
          value: 1 + (Math.random() * 0.02 - 0.01)
        }));
        const currentRate = newRates[fromCurrency.id] / newRates[toCurrency.id];
        setHistory(baseTrend.map(t => ({ ...t, value: t.value * (currentRate || 1) })));
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s for real-time feel
    return () => clearInterval(interval);
  }, [fromCurrency.id, toCurrency.id, range]);

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
        timeVisible: true,
        secondsVisible: false,
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
    if (seriesRef.current && history.length > 0) {
      seriesRef.current.setData(history);
      chartRef.current?.timeScale().fitContent();
    }
  }, [history]);

  const convertValue = () => {
    if (!rates[fromCurrency.id] || !rates[toCurrency.id]) return '0';
    const num = parseFloat(amount) || 0;
    const currentRate = 1 / (rates[toCurrency.id] || 1);
    const result = num * rates[fromCurrency.id] * currentRate;

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

  const getVariation = () => {
    if (history.length < 2) return { val: 0, up: true };
    const first = history[0].value;
    const last = history[history.length - 1].value;
    const diff = ((last - first) / first) * 100;
    return { val: Math.abs(diff).toFixed(2), up: diff >= 0 };
  };

  const variation = getVariation();

  const downloadCSV = () => {
    const csvData = history.map(h => ({
      Date: dayjs(h.time * 1000).format('YYYY-MM-DD HH:mm'),
      Value: h.value
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `duotools_market_data_${fromCurrency.id}_${toCurrency.id}.csv`);
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
                  <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Updates every 30s</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live</span>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Current Rate</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-lg font-mono text-white">
                    1 {fromCurrency.symbol} = { (rates[fromCurrency.id] / rates[toCurrency.id]).toLocaleString(undefined, { 
                      minimumFractionDigits: (rates[fromCurrency.id] / rates[toCurrency.id]) < 0.1 ? 4 : 2,
                      maximumFractionDigits: (rates[fromCurrency.id] / rates[toCurrency.id]) < 0.1 ? 6 : 4 
                    }) } {toCurrency.symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-neon-cyan/10">
                  <TrendingUp className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Market Analytics</h3>
                  <p className="text-xs text-white/40">{fromCurrency.name} / {toCurrency.name}</p>
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
                  {RANGES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                        range === r.value ? 'bg-neon-cyan text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 relative min-h-[300px]" ref={chartContainerRef}>
              {loading && history.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
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
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">
                          {new Date(hoverData.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-white/40">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">
                          {new Date(hoverData.time * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-mono font-bold text-white">
                        {toCurrency.symbol}{hoverData.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      <div className={`flex items-center space-x-1 text-[10px] font-bold ${variation.up ? 'text-emerald-500' : 'text-red-500'}`}>
                        {variation.up ? '▲' : '▼'} {variation.val}%
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">High (24h)</p>
                <p className="text-sm font-mono text-white">
                  {toCurrency.symbol}{(Math.max(...history.map(h => h.value)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Low (24h)</p>
                <p className="text-sm font-mono text-white">
                  {toCurrency.symbol}{(Math.min(...history.map(h => h.value)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Change</p>
                <p className={`text-sm font-mono font-bold ${variation.up ? 'text-emerald-500' : 'text-red-500'}`}>
                  {variation.up ? '+' : '-'}{variation.val}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Asset Class</p>
                <div className="flex items-center space-x-2">
                  {fromCurrency.type === 'crypto' ? <Coins className="w-3 h-3 text-neon-cyan" /> : <DollarSign className="w-3 h-3 text-neon-cyan" />}
                  <p className="text-xs font-bold uppercase text-white/80">{fromCurrency.type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Sections: Parallel Dollar & P2P Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Parallel Dollar Card */}
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
                  <h3 className="text-xl font-bold text-white">Dólar Paralelo Bolivia Hoy</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Referencia Mercado P2P / USDT</p>
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
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Precio de Compra</p>
                  <div className="relative inline-block">
                    <p className="text-5xl font-mono font-black text-neon-cyan drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                      {(1 / (rates.bob_parallel || 1)).toFixed(2)}
                    </p>
                    <span className="absolute -right-6 bottom-1 text-xs text-white/40 font-bold">Bs</span>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Precio de Venta</p>
                  <div className="relative inline-block">
                    <p className="text-5xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      {(1 / (rates.bob_parallel * 1.002 || 1)).toFixed(2)}
                    </p>
                    <span className="absolute -right-6 bottom-1 text-xs text-white/40 font-bold">Bs</span>
                  </div>
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
                      <p className="text-xs font-bold text-white/80">BCB: {officialRate.toFixed(2)} Bs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-mono font-bold text-neon-purple">
                      +{(( (1 / (rates.bob_parallel || 1)) / officialRate - 1) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-neon-purple font-bold uppercase">↑ Spread</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-2 text-[10px] text-white/30">
                    <Clock className="w-3 h-3" />
                    <span>Última actualización: {dayjs(lastUpdated).format('dddd D [de] MMMM YYYY, hh:mm a')}</span>
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
                    setFromCurrency(CURRENCIES.find(c => c.id === 'usd')!);
                    setToCurrency(CURRENCIES.find(c => c.id === 'bob_parallel')!);
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
                        title: 'Dólar Paralelo Bolivia - DuoTools',
                        text: `Cotización Dólar Paralelo en Bolivia: Compra ${rates.bob_parallel?.toFixed(2)} Bs / Venta ${(rates.bob_parallel * 0.998)?.toFixed(2)} Bs.`,
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
                Tasa referencial mercado paralelo – no oficial BCB. Fuente: promedio P2P (Binance, Bybit, etc.)
              </p>
            </div>
          </motion.div>

          {/* Quick Latam Conversion */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Otras Monedas Latam</h4>
              <span className="text-[9px] text-white/20 uppercase font-bold tracking-tighter">vs Paralelo BOB</span>
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
                    {((rates.bob_parallel || 0) / (rates[c.id] || 1)).toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} {c.symbol}
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
            {p2pData.map((ex, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 space-y-4 hover:border-neon-cyan/30 hover:shadow-[0_0_30px_rgba(0,245,255,0.1)] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-neon-cyan group-hover:scale-110 transition-transform">
                      {ex.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{ex.name}</h4>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Exchange Verificado</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Spread</p>
                    <p className="text-xs font-mono font-bold text-neon-purple">{ex.spread}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1">
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Compra</p>
                    <p className="text-xl font-mono font-bold text-emerald-400">{ex.buyPrice} <span className="text-[10px]">Bs</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Venta</p>
                    <p className="text-xl font-mono font-bold text-white">{ex.sellPrice} <span className="text-[10px]">Bs</span></p>
                  </div>
                </div>

                <a 
                  href={ex.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 group-hover:bg-neon-cyan group-hover:text-black group-hover:border-neon-cyan transition-all"
                >
                  <span>Comprar Ahora</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-3 text-white/30">
              <Info className="w-4 h-4 flex-shrink-0" />
              <p className="text-[10px] italic leading-relaxed">
                Los precios mostrados son promedios de las órdenes más competitivas en cada plataforma. El precio final puede variar según el método de pago (Transferencia, QR, Tigo Money) y los límites del anunciante.
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
