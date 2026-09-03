import React from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Cpu, RefreshCw, ShieldCheck, 
  AlertCircle, Globe, Zap, CheckCircle2,
  BarChart3, Search, Clock
} from 'lucide-react';

export default function Methodology() {
  const sections = [
    {
      id: 1,
      title: "1. Fuentes de datos",
      description: "Recolectamos cotizaciones directamente de plataformas de intercambio P2P y mercados públicos reconocidos. Nos aseguramos de utilizar fuentes abiertas, verificables y ampliamente utilizadas por la comunidad.",
      items: [
        {
          label: "Plataformas P2P",
          content: "Binance P2P, Bybit P2P y otras plataformas de acceso abierto.",
          icon: <Globe className="w-5 h-5 text-neon-cyan" />
        },
        {
          label: "Mercados paralelos",
          content: "Precios informales que sirven como referencia en la región.",
          icon: <BarChart3 className="w-5 h-5 text-emerald-500" />
        }
      ]
    },
    {
      id: 2,
      title: "2. Proceso de cálculo",
      description: "Nuestro motor de procesamiento analiza miles de puntos de datos para entregar una cifra confiable.",
      steps: [
        "Recolectamos múltiples ofertas de compra y venta en tiempo real.",
        "Calculamos un promedio representativo, eliminando valores extremos (outliers).",
        "Convertimos entre monedas locales e internacionales cuando es necesario.",
        "Mostramos un precio de referencia de compra y venta."
      ]
    },
    {
      id: 3,
      title: "3. Actualización de datos",
      description: "Los precios se actualizan varias veces al día, dependiendo de la disponibilidad de datos en las plataformas de origen. Nuestro objetivo es reflejar un valor representativo y actualizado en todo momento.",
      stats: [
        { label: "Cada 30 segundos", sub: "Verificación de fuentes", icon: <Clock className="w-5 h-5 text-neon-cyan" /> },
        { label: "+100", sub: "Ofertas revisadas", icon: <Search className="w-5 h-5 text-emerald-500" /> },
        { label: "24/7", sub: "Disponibilidad de acceso", icon: <Zap className="w-5 h-5 text-amber-500" /> }
      ]
    },
    {
      id: 4,
      title: "4. Enfoque en transparencia",
      description: "La confianza es nuestra prioridad. Explicamos cómo llegamos a cada número.",
      grid: [
        { title: "Datos claros", desc: "No manipulamos precios; los valores reflejan datos públicos.", icon: <CheckCircle2 className="w-4 h-4 text-neon-cyan" /> },
        { title: "Metodología abierta", desc: "Explicamos el proceso de forma sencilla y verificable.", icon: <CheckCircle2 className="w-4 h-4 text-neon-cyan" /> },
        { title: "Verificación independiente", desc: "Cualquier persona puede comprobarlo con las mismas fuentes.", icon: <CheckCircle2 className="w-4 h-4 text-neon-cyan" /> }
      ]
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="text-center space-y-4">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold tracking-tight"
        >
          ¿Cómo calculamos los <span className="text-neon-cyan">precios</span>?
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 max-w-2xl mx-auto"
        >
          Transparencia total: te explicamos paso a paso de dónde vienen los datos y cómo se procesan para ofrecerte la mejor referencia del mercado.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section 1 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 space-y-6"
        >
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{sections[0].title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{sections[0].description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sections[0].items?.map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-white/5">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-neon-cyan">{item.label}</p>
                  <p className="text-xs text-white/60">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 2 */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 space-y-6"
        >
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{sections[1].title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{sections[1].description}</p>
          </div>
          <div className="space-y-3">
            {sections[1].steps?.map((step, i) => (
              <div key={i} className="flex items-center space-x-3 text-sm text-white/80">
                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-[10px] font-bold text-neon-cyan shrink-0">
                  {i + 1}
                </div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 glass-card p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">{sections[2].title}</h3>
            <p className="text-sm text-white/40 max-w-3xl mx-auto">{sections[2].description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections[2].stats?.map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2 group hover:border-neon-cyan/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-white">{stat.label}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">{stat.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 glass-card p-8 space-y-8"
        >
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{sections[3].title}</h3>
            <p className="text-sm text-white/40">{sections[3].description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections[3].grid?.map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center space-x-2">
                  {item.icon}
                  <p className="text-sm font-bold text-white">{item.title}</p>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-start space-x-4"
      >
        <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Aviso importante</p>
          <p className="text-xs text-white/60 leading-relaxed">
            La información publicada tiene carácter informativo y referencial. No constituye asesoramiento financiero ni garantía de precios futuros. DuoTools no se responsabiliza por decisiones tomadas en base a estos datos.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
