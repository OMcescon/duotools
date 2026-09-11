import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, LineChart, Github, Menu, X, LayoutGrid } from 'lucide-react';
import Compressor from './components/Compressor';
import Converter from './components/Converter';
import Methodology from './components/Methodology';
import BobDashboard from './components/BobDashboard';

type Tab = 'compressor' | 'converter' | 'methodology' | 'bob';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('bob');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-lg shadow-neon-purple/20">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Duo<span className="text-neon-cyan">Tools</span>
            </h1>
          </div>

          {/* Desktop Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('bob')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'bob'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                BOB Hoy
              </button>
              <button
                onClick={() => setActiveTab('converter')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'converter'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                Conversor
              </button>
              <button
                onClick={() => setActiveTab('compressor')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'compressor'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                PDF Suite
              </button>
            </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/5"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-card rounded-none border-x-0 border-t-0 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('bob');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                  activeTab === 'bob' ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-white/60'
                }`}
              >
                <LineChart className="w-5 h-5" />
                <span className="font-medium">BOB Hoy</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('converter');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                  activeTab === 'converter' ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-white/60'
                }`}
              >
                <LineChart className="w-5 h-5" />
                <span className="font-medium">Conversor</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('compressor');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                  activeTab === 'compressor' ? 'bg-neon-purple/10 text-neon-purple' : 'text-white/60'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">PDF Suite</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {activeTab === 'bob' ? (
            <BobDashboard />
          ) : activeTab === 'compressor' ? (
            <Compressor />
          ) : activeTab === 'converter' ? (
            <Converter onTabChange={setActiveTab} />
          ) : (
            <Methodology />
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center space-y-3">
        <button
          onClick={() => setActiveTab('methodology')}
          className="text-xs font-medium uppercase tracking-wider text-white/40 hover:text-neon-cyan transition-colors"
        >
          Metodología
        </button>
        <p className="text-sm text-white/20">
          &copy; 2024 DuoTools Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
