import React, { useState } from 'react';
import { Save, ArrowLeft, RefreshCw, Type, Image as ImageIcon } from 'lucide-react';
import { useBookStore } from '../store/useBookStore';
import { generateImage } from '../services/geminiService';

interface PageEditorProps {
  onBack: () => void;
}

export function PageEditor({ onBack }: PageEditorProps) {
  const { currentBook, updatePage } = useBookStore();
  const [editingPage, setEditingPage] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!currentBook) return null;

  const page = currentBook.pages[editingPage];

  const handleRegenerateImage = async () => {
    setIsRegenerating(true);
    try {
      const imageUrl = await generateImage(page.imagePrompt);
      updatePage(page.pageNumber, { imageUrl });
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Kembali ke Pratinjau
        </button>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
        >
          <Save size={20} />
          Simpan Perubahan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Thumbnails */}
        <div className="lg:col-span-3 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {currentBook.pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setEditingPage(i)}
              className={cn(
                "w-full p-3 rounded-2xl border transition-all flex items-center gap-3 text-left",
                editingPage === i ? "bg-white border-yellow-400 shadow-md" : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200"
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Halaman {p.pageNumber}</p>
                <p className="text-sm font-medium line-clamp-1">{p.content}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <Type size={16} />
                    Teks Cerita
                  </label>
                  <textarea 
                    className="w-full h-48 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none text-lg leading-relaxed"
                    value={page.content}
                    onChange={(e) => updatePage(page.pageNumber, { content: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <ImageIcon size={16} />
                    Prompt Ilustrasi
                  </label>
                  <textarea 
                    className="w-full h-32 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none text-sm text-slate-500"
                    value={page.imagePrompt}
                    onChange={(e) => updatePage(page.pageNumber, { imagePrompt: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="aspect-square rounded-3xl bg-slate-100 overflow-hidden relative group border border-slate-100">
                  {page.imageUrl ? (
                    <img src={page.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">Tidak ada Gambar</div>
                  )}
                  {isRegenerating && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
                      <span className="font-bold text-sm">Melukis...</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleRegenerateImage}
                  disabled={isRegenerating}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 font-bold text-slate-500 hover:border-yellow-400 hover:text-yellow-600 transition-all"
                >
                  <RefreshCw size={20} className={isRegenerating ? "animate-spin" : ""} />
                  Perbarui Ilustrasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
