import React, { useState, useMemo } from 'react';
import {
  Search, Zap, Layers, ShieldCheck,
  Scissors, FileText, ImageIcon, RotateCw,
  Trash2, FilePlus, Layout, Type,
  ArrowRight, Star, Clock, Shield, Globe, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolInterface from './ToolInterface';

interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'most-used' | 'compress' | 'convert-to' | 'organize' | 'edit';
  isLocal: boolean;
}

const PDF_TOOLS: PDFTool[] = [
  { id: 'compress', name: 'Comprimir PDF', description: 'Optimiza el tamaño sin perder calidad.', icon: Zap, category: 'most-used', isLocal: true },
  { id: 'merge', name: 'Unir PDF', description: 'Combina varios archivos en uno solo.', icon: Layers, category: 'most-used', isLocal: true },
  { id: 'split', name: 'Dividir PDF', description: 'Extrae páginas o separa por rangos.', icon: Scissors, category: 'most-used', isLocal: true },
  { id: 'img-to-pdf', name: 'Imágenes a PDF', description: 'Convierte JPG, PNG a documento PDF.', icon: ImageIcon, category: 'convert-to', isLocal: true },
  { id: 'rotate', name: 'Girar PDF', description: 'Rota páginas en bloque o individualmente.', icon: RotateCw, category: 'organize', isLocal: true },
  { id: 'extract', name: 'Extraer Páginas', description: 'Selecciona y guarda páginas específicas.', icon: FilePlus, category: 'organize', isLocal: true },
  { id: 'delete', name: 'Eliminar Páginas', description: 'Quita páginas innecesarias del archivo.', icon: Trash2, category: 'organize', isLocal: true },
  { id: 'reorder', name: 'Ordenar Páginas', description: 'Cambia el orden de las páginas visualmente.', icon: Layout, category: 'organize', isLocal: true },
  { id: 'watermark', name: 'Marca de Agua', description: 'Añade texto o imagen sobre el PDF.', icon: Type, category: 'edit', isLocal: true },
  { id: 'word-to-pdf', name: 'Word a PDF', description: 'Convierte archivos .docx a PDF.', icon: FileText, category: 'convert-to', isLocal: true },
];

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'most-used', label: 'Más usadas' },
  { id: 'compress', label: 'Optimizar' },
  { id: 'convert-to', label: 'Convertir a PDF' },
  { id: 'organize', label: 'Organizar' },
  { id: 'edit', label: 'Editar' },
];

export default function PDFSuite() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTool, setSelectedTool] = useState<PDFTool | null>(null);

  const filteredTools = useMemo(() => {
    return PDF_TOOLS.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  if (selectedTool) {
    return <ToolInterface tool={selectedTool} onBack={() => setSelectedTool(null)} />;
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neon-purple via-white to-neon-cyan bg-clip-text text-transparent">
            Smart PDF Suite
          </h2>
          <p className="text-lg text-white/60">
            Herramientas profesionales para gestionar tus documentos con privacidad total.
          </p>
        </motion.div>

        {/* Search Bar */}
        <div className="relative group max-w-xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
          <div className="relative flex items-center glass-card border-white/10 group-focus-within:border-neon-cyan/50 transition-all">
            <Search className="w-5 h-5 ml-4 text-white/40" />
            <input
              type="text"
              placeholder="Busca una herramienta (ej. unir, comprimir...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 px-4 py-4 text-white placeholder:text-white/20"
            />
          </div>
        </div>

        <p className="text-[11px] text-white/30 max-w-lg mx-auto leading-relaxed">
          No incluimos "Proteger PDF": el cifrado real de PDFs requiere software especializado, y preferimos no ofrecerte una protección falsa.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
              activeCategory === cat.id 
                ? 'bg-white text-black border-white' 
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool, index) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedTool(tool)}
              className="group relative glass-card p-6 cursor-pointer hover:border-neon-cyan/50 transition-all overflow-hidden"
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-neon-cyan/30 group-hover:bg-neon-cyan/5 transition-all`}>
                    <tool.icon className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-white/20 hover:text-amber-400 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white group-hover:text-neon-cyan transition-colors">{tool.name}</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">{tool.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center space-x-1.5">
                    {tool.isLocal ? (
                      <div className="flex items-center space-x-1 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Local</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                        <Globe className="w-3 h-3" />
                        <span>Cloud</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/0 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Shield className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Privacidad Garantizada</h4>
            <p className="text-xs text-white/40 mt-1">Tus archivos se procesan localmente y nunca salen de tu dispositivo.</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <Zap className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Velocidad Instantánea</h4>
            <p className="text-xs text-white/40 mt-1">Sin colas de espera ni tiempos de subida. Procesamiento en tiempo real.</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Info className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Sin Límites</h4>
            <p className="text-xs text-white/40 mt-1">Usa todas las herramientas gratis y sin marcas de agua intrusivas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
