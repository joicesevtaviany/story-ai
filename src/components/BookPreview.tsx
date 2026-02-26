import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit3, ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
import { useBookStore } from '../store/useBookStore';
import { jsPDF } from 'jspdf';

interface BookPreviewProps {
  onEdit: () => void;
  onBack: () => void;
}

export function BookPreview({ onEdit, onBack }: BookPreviewProps) {
  const { currentBook, brandName, deleteBook } = useBookStore();
  const [currentPage, setCurrentPage] = useState(0);

  if (!currentBook) return null;

  const handleDelete = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus buku ini?')) {
      await deleteBook(currentBook.id);
      onBack();
    }
  };

  const pages = currentBook.pages || [];
  const totalPages = pages.length;

  const handleExportPDF = () => {
    // Use landscape for a spread-like PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    pages.forEach((page, index) => {
      if (index > 0) doc.addPage('landscape');
      
      // Page Background
      doc.setFillColor(253, 252, 240); // #FDFCF0
      doc.rect(0, 0, 297, 210, 'F');

      // Left side: Image (Illustration)
      if (page.imageUrl) {
        try {
          // Add image to the left half
          doc.addImage(page.imageUrl, 'PNG', 10, 10, 135, 190);
        } catch (e) {
          console.error("PDF Image add failed", e);
          doc.rect(10, 10, 135, 190);
          doc.text("Illustration Placeholder", 40, 100);
        }
      } else {
        doc.setDrawColor(200);
        doc.rect(10, 10, 135, 190);
        doc.text("No Illustration", 50, 100);
      }
      
      // Right side: Text Content
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(24);
      doc.text(currentBook.title, 155, 40);
      
      doc.setDrawColor(250, 204, 21); // yellow-400
      doc.setLineWidth(1);
      doc.line(155, 45, 175, 45);

      doc.setFontSize(16);
      const splitText = doc.splitTextToSize(page.content || "", 120);
      doc.text(splitText, 155, 65);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Page ${page.pageNumber} of ${totalPages}`, 155, 195);
    });

    doc.save(`${currentBook.title}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Kembali ke Perpustakaan
        </button>
        <div className="flex gap-3">
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium"
          >
            <Edit3 size={18} />
            Edit Cerita
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium"
          >
            <Trash2 size={18} />
            Hapus
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium"
          >
            <Download size={18} />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Book Spread Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-200 mb-10 min-h-[600px]">
        {/* Left Side: Illustration */}
        <div className="relative overflow-hidden bg-slate-50 border-r border-slate-100 flex items-center justify-center">
          {pages[currentPage]?.imageUrl ? (
            <img 
              src={pages[currentPage].imageUrl} 
              alt={`Page ${currentPage + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-slate-300 font-medium">Tidak ada ilustrasi</span>
            </div>
          )}
          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">
            Ilustrasi
          </div>
        </div>

        {/* Right Side: Story Text */}
        <div className="p-12 md:p-16 flex flex-col justify-center bg-[#FFFEFA] relative">
          <div className="absolute top-6 right-6 text-slate-300 font-bold text-4xl opacity-20">
            {currentPage + 1}
          </div>
          
          <div className="max-w-md mx-auto w-full">
            <span className="text-yellow-600 font-bold text-xs uppercase tracking-[0.3em] mb-6 block">Halaman {currentPage + 1}</span>
            <h3 className="text-3xl font-bold text-slate-800 leading-tight mb-8 font-serif">{currentBook.title}</h3>
            
            <div className="space-y-6">
              <p className="text-2xl text-slate-700 leading-relaxed font-medium italic font-serif">
                "{pages[currentPage]?.content}"
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Sparkles className="text-yellow-600 w-5 h-5" />
              </div>
              <p className="text-sm text-slate-400 italic">
                Kisah ajaib yang dibuat oleh {brandName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Info */}
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-center min-w-[80px]">
              <span className="text-2xl font-bold text-slate-800">{currentPage + 1}</span>
              <span className="text-slate-300 mx-2">/</span>
              <span className="text-slate-400">{totalPages}</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Halaman</p>
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{currentBook.theme}</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Age {currentBook.targetAge}</span>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                currentPage === i ? "bg-yellow-400 w-full" : "bg-slate-200 w-full hover:bg-slate-300"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
