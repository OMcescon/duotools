import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Download, Settings, Loader2, 
  ArrowLeft, ShieldCheck, Zap, Layers,
  FileText, FileCode, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  handleImageCompression, compressPDF, convertImageToPDF,
  mergePDFs, splitPDF, rotatePDF, protectPDF,
  extractPages, deletePages, addWatermark,
  convertWordToPDF, pdfToImages, reorderPages
} from '../logic';

interface FileStatus {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  resultBlob?: Blob;
  originalSize: number;
  resultSize?: number;
  preview?: string;
}

interface ToolInterfaceProps {
  tool: {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    isLocal: boolean;
  };
  onBack: () => void;
}

export default function ToolInterface({ tool, onBack }: ToolInterfaceProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [quality, setQuality] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [password, setPassword] = useState('');
  const [rotation, setRotation] = useState(90);
  const [range, setRange] = useState('1-2');
  const [watermarkText, setWatermarkText] = useState('DuoTools');
  const [newOrder, setNewOrder] = useState('1,2,3');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileStatus[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      originalSize: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    // For tools that only support single file, replace. Others, append.
    if (['compress', 'split', 'rotate', 'protect'].includes(tool.id)) {
      setFiles(newFiles.slice(0, 1));
    } else {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [tool.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  } as any);

  const handleAction = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    try {
      let resultBlob: Blob | Blob[];
      
      switch (tool.id) {
        case 'compress':
          const file = files[0].file;
          resultBlob = file.type.startsWith('image/') 
            ? await handleImageCompression(file, quality)
            : await compressPDF(file, quality);
          break;
        case 'merge':
          resultBlob = await mergePDFs(files.map(f => f.file));
          break;
        case 'split':
          resultBlob = await splitPDF(files[0].file);
          break;
        case 'img-to-pdf':
          resultBlob = await convertImageToPDF(files.map(f => f.file));
          break;
        case 'pdf-to-img':
          resultBlob = await pdfToImages(files[0].file);
          break;
        case 'rotate':
          resultBlob = await rotatePDF(files[0].file, rotation);
          break;
        case 'protect':
          resultBlob = await protectPDF(files[0].file, password);
          break;
        case 'extract':
          resultBlob = await extractPages(files[0].file, range);
          break;
        case 'delete':
          resultBlob = await deletePages(files[0].file, range);
          break;
        case 'reorder':
          resultBlob = await reorderPages(files[0].file, newOrder);
          break;
        case 'watermark':
          resultBlob = await addWatermark(files[0].file, watermarkText);
          break;
        case 'word-to-pdf':
          resultBlob = await convertWordToPDF(files[0].file);
          break;
        case 'ocr':
        case 'pdf-to-word':
          alert("Esta herramienta requiere una suscripción Premium y procesamiento en la nube.");
          setIsProcessing(false);
          return;
        default:
          throw new Error('Tool not implemented yet');
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f3ff', '#bc13fe']
      });

      if (Array.isArray(resultBlob)) {
        // Handle split PDF (multiple files)
        const newFiles = resultBlob.map((blob, i) => ({
          file: new File([blob], `page-${i+1}.pdf`, { type: 'application/pdf' }),
          id: `split-${i}`,
          status: 'success' as const,
          resultBlob: blob,
          originalSize: 0,
          resultSize: blob.size
        }));
        setFiles(newFiles);
      } else {
        const resultFile: FileStatus = {
          file: new File([resultBlob], `duotools-${tool.id}-${Date.now()}.pdf`, { type: resultBlob.type }),
          id: 'result',
          status: 'success',
          resultBlob: resultBlob,
          originalSize: files.reduce((acc, f) => acc + f.originalSize, 0),
          resultSize: resultBlob.size
        };
        setFiles([resultFile]);
      }
    } catch (error) {
      console.error('Action failed:', error);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (fileObj: FileStatus) => {
    if (!fileObj.resultBlob) return;
    const url = URL.createObjectURL(fileObj.resultBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileObj.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Volver al Hub</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-8 border-l-4 border-neon-cyan">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
                <tool.icon className="w-8 h-8 text-neon-cyan" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{tool.name}</h2>
                <p className="text-sm text-white/40">{tool.description}</p>
              </div>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`glass-card p-12 border-dashed border-2 transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 min-h-[300px] ${
              isDragActive ? 'border-neon-cyan bg-neon-cyan/5' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <input {...getInputProps()} />
            <div className="p-6 rounded-full bg-white/5 border border-white/10">
              <Upload className="w-10 h-10 text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">Selecciona o arrastra tus archivos</p>
              <p className="text-sm text-white/40 mt-1">Soporte para PDF, JPG, PNG (Máx 10MB)</p>
            </div>
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {files.map((fileObj) => (
                  <div key={fileObj.id} className="glass-card p-4 flex items-center space-x-4 border-l-4 border-neon-purple group">
                    <div className="w-16 h-16 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10">
                      {fileObj.preview ? (
                        <img src={fileObj.preview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-8 h-8 text-neon-cyan" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{fileObj.file.name}</p>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{formatSize(fileObj.originalSize || fileObj.resultSize || 0)}</p>
                      
                      {fileObj.status === 'success' && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Listo</span>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className="text-[10px] font-mono text-white/60">{formatSize(fileObj.resultSize!)}</span>
                        </div>
                      )}
                    </div>

                    {fileObj.status === 'success' && (
                      <button
                        onClick={() => downloadFile(fileObj)}
                        className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-neon-cyan/20 hover:text-neon-cyan transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {files.length > 0 && files[0].status !== 'success' && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleAction}
                disabled={isProcessing}
                className="btn-primary px-12 py-4 text-lg flex items-center space-x-3 group disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Ejecutar {tool.name}</span>
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-neon-purple" />
                <h3 className="font-bold uppercase tracking-widest text-xs">Ajustes</h3>
              </div>
            </div>

            <div className="space-y-6">
              {tool.id === 'compress' && (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <label className="text-white/40">Calidad</label>
                    <span className="text-neon-purple">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                  />
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'extreme', label: 'Extrema', q: 30, desc: 'Máximo ahorro' },
                      { id: 'recommended', label: 'Recomendada', q: 70, desc: 'Equilibrio ideal' },
                      { id: 'low', label: 'Baja', q: 90, desc: 'Máxima calidad' }
                    ].map(level => (
                      <button
                        key={level.id}
                        onClick={() => setQuality(level.q)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          quality === level.q ? 'bg-neon-purple/10 border-neon-purple/40' : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-bold text-white mb-0.5">{level.label}</p>
                        <p className="text-[10px] text-white/40">{level.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tool.id === 'rotate' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Ángulo de Rotación</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[90, 180, 270].map(deg => (
                      <button
                        key={deg}
                        onClick={() => setRotation(deg)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          rotation === deg ? 'bg-neon-cyan/10 border-neon-cyan/40' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <span className="text-xs font-bold">{deg}°</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tool.id === 'protect' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Escribe la contraseña..."
                    className="glass-input w-full"
                  />
                </div>
              )}

              {(tool.id === 'extract' || tool.id === 'delete') && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Rango de Páginas</label>
                  <input
                    type="text"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    placeholder="Ej: 1,2,5-8"
                    className="glass-input w-full"
                  />
                  <p className="text-[10px] text-white/20 italic">Usa comas para páginas sueltas y guiones para rangos.</p>
                </div>
              )}

              {tool.id === 'reorder' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Nuevo Orden</label>
                  <input
                    type="text"
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    placeholder="Ej: 3,1,2"
                    className="glass-input w-full"
                  />
                </div>
              )}

              {tool.id === 'watermark' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Texto de Marca</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Ej: CONFIDENCIAL"
                    className="glass-input w-full"
                  />
                </div>
              )}

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/60 leading-relaxed">
                  Procesamiento local: Tu archivo no se sube a ningún servidor. Privacidad 100% garantizada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
