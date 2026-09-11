import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

/**
 * Image Compression Engine
 */
export async function handleImageCompression(file: File, quality: number) {
  const options = {
    maxSizeMB: file.size / (1024 * 1024), // Don't allow it to grow
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: quality / 100
  };
  try {
    const compressedFile = await imageCompression(file, options);
    // If for some reason it's larger, return the original
    if (compressedFile.size >= file.size) {
      return file;
    }
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    return file; // Return original on error
  }
}

/**
 * PDF Compression Engine (Resource Optimization)
 */
export async function compressPDF(file: File, _quality: number = 80) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Optimization: Use object streams and compress the structure
    const compressedBytes = await pdfDoc.save({ 
      useObjectStreams: true,
      addDefaultPage: false
    });
    
    const resultBlob = new Blob([compressedBytes], { type: 'application/pdf' });
    
    // If larger, return original
    if (resultBlob.size >= file.size) {
      return file;
    }
    
    return resultBlob;
  } catch (error) {
    console.error("Error compressing PDF:", error);
    return file;
  }
}

/**
 * Live Exchange Rates Engine (Fiat + Crypto)
 */
export const fetchRates = async (baseCurrency: string = 'usd') => {
  try {
    // Fetch both Fiat and Crypto rates from our backend proxy
    const res = await axios.get(`/api/exchange-rates?base=${baseCurrency.toUpperCase()}`);
    
    return res.data;
  } catch (error) {
    console.error("Error fetching rates:", error);
    throw error;
  }
};

/**
 * Crypto Rates Engine (CoinGecko USD + BOB derivado del TCO BCB)
 */
export const fetchCryptoRates = async (ids: string) => {
  try {
    const res = await axios.get(`/api/crypto-rates?ids=${ids}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching crypto rates:', error);
    throw error;
  }
};

/**
 * BOB Dashboard Engine (TCO oficial, histórico y P2P)
 */
export const fetchBcbRate = async () => {
  try {
    const res = await axios.get('/api/bcb-rate');
    return res.data;
  } catch (error) {
    console.error('Error fetching BCB rate:', error);
    throw error;
  }
};

export const fetchBcbHistory = async () => {
  try {
    const res = await axios.get('/api/bcb-history');
    return res.data;
  } catch (error) {
    console.error('Error fetching BCB history:', error);
    throw error;
  }
};

export const fetchP2pRates = async () => {
  try {
    const res = await axios.get('/api/p2p-rates');
    return res.data;
  } catch (error) {
    console.error('Error fetching P2P rates:', error);
    throw error;
  }
};

/**
 * PDF Manipulation Engine (Client-Side)
 */
export async function convertImageToPDF(files: File[]) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      continue;
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function mergePDFs(files: File[]) {
  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function splitPDF(file: File) {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const blobs: Blob[] = [];
  
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(copiedPage);
    const bytes = await newPdf.save();
    blobs.push(new Blob([bytes], { type: 'application/pdf' }));
  }
  
  return blobs;
}

export async function rotatePDF(file: File, degrees: number = 90) {
  const { PDFDocument, degrees: pdfDegrees } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(pdfDegrees(currentRotation + degrees));
  });
  
  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function extractPages(file: File, range: string) {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  // Simple range parser: "1,2,5-8"
  const indices: number[] = [];
  const parts = range.split(',');
  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()) - 1);
      for (let i = start; i <= end; i++) {
        if (i >= 0 && i < pdf.getPageCount()) indices.push(i);
      }
    } else {
      const idx = parseInt(part.trim()) - 1;
      if (idx >= 0 && idx < pdf.getPageCount()) indices.push(idx);
    }
  });

  if (indices.length === 0) return file;

  const copiedPages = await newPdf.copyPages(pdf, indices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const bytes = await newPdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function deletePages(file: File, range: string) {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const indicesToRemove: number[] = [];
  const parts = range.split(',');
  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()) - 1);
      for (let i = start; i <= end; i++) {
        if (i >= 0 && i < pdf.getPageCount()) indicesToRemove.push(i);
      }
    } else {
      const idx = parseInt(part.trim()) - 1;
      if (idx >= 0 && idx < pdf.getPageCount()) indicesToRemove.push(idx);
    }
  });

  const allIndices = Array.from({ length: pdf.getPageCount() }, (_, i) => i);
  const remainingIndices = allIndices.filter(i => !indicesToRemove.includes(i));

  if (remainingIndices.length === 0) return file;

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, remainingIndices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const bytes = await newPdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function addWatermark(file: File, text: string) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  
  const pages = pdf.getPages();
  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: { angle: 45, type: 'degrees' as any }
    });
  });
  
  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function reorderPages(file: File, newOrder: string) {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  const indices = newOrder.split(',').map(n => parseInt(n.trim()) - 1).filter(n => n >= 0 && n < pdf.getPageCount());
  
  if (indices.length === 0) return file;

  const copiedPages = await newPdf.copyPages(pdf, indices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const bytes = await newPdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function convertWordToPDF(file: File) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const text = result.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89; // A4
  const maxLineWidth = pageWidth - margin * 2;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Word-wrap el texto completo (sin truncar) a líneas que caben en el ancho de página
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 0) lines.push('');

  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    lines.slice(i, i + linesPerPage).forEach((line, idx) => {
      page.drawText(line, {
        x: margin,
        y: pageHeight - margin - idx * lineHeight,
        size: fontSize,
        font,
      });
    });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

