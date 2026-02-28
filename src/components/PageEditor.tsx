import React, { useState } from 'react';
import { Save, ArrowLeft, RefreshCw, Type, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import { useBookStore } from '../store/useBookStore';
import { generateImage } from '../services/geminiService';

interface PageEditorProps {
  onBack: () => void;
}

export function PageEditor({ onBack }: PageEditorProps) {
  const { currentBook, updatePage, updateBook } = useBookStore();
  const [editingPage, setEditingPage] = useState<number | 'cover'>(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!currentBook) return null;

  const handleRegenerateImage = async () => {
    if (editingPage === 'cover') return;
    setIsRegenerating(true);
    try {
      const page = currentBook.pages[editingPage];
      const imageUrl = await generateImage(page.imagePrompt);
      updatePage(page.pageNumber, { imageUrl });
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBook(currentBook.id, { coverImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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
          <button
            onClick={() => setEditingPage('cover')}
            className={cn(
              "w-full p-3 rounded-2xl border transition-all flex items-center gap-3 text-left",
              editingPage === 'cover' ? "bg-white border-yellow-400 shadow-md" : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200"
            )}
          >
            <div className="w-12 h-12 rounded-lg bg-yellow-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {currentBook.coverImageUrl ? (
                <img src={currentBook.coverImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ImageIcon className="text-yellow-600 w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Cover Buku</p>
              <p className="text-sm font-medium line-clamp-1">{currentBook.title}</p>
            </div>
          </button>

          <div className="h-px bg-slate-100 my-2" />

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
            {editingPage === 'cover' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <Type size={16} />
                      Judul Buku
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-2xl font-bold"
                      value={currentBook.title}
                      onChange={(e) => updateBook(currentBook.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <Sparkles size={16} />
                      Tema & Nilai Moral
                    </label>
                    <div className="space-y-4">
                      <input 
                        type="text"
                        placeholder="Tema"
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                        value={currentBook.theme}
                        onChange={(e) => updateBook(currentBook.id, { theme: e.target.value })}
                      />
                      <input 
                        type="text"
                        placeholder="Nilai Moral"
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                        value={currentBook.moralValue}
                        onChange={(e) => updateBook(currentBook.id, { moralValue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="aspect-[3/4] rounded-3xl bg-slate-100 overflow-hidden relative group border border-slate-100">
                    {currentBook.coverImageUrl ? (
                      <img src={currentBook.coverImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">Tidak ada Cover</div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-2">
                      <Upload size={32} />
                      <span className="font-bold">Ganti Cover</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                    </label>
                  </div>
                  <p className="text-center text-xs text-slate-400 italic">
                    Klik gambar untuk mengunggah cover baru
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <Type size={16} />
                      Teks Cerita
                    </label>
                    <textarea 
                      className="w-full h-48 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none text-lg leading-relaxed"
                      value={currentBook.pages[editingPage].content}
                      onChange={(e) => updatePage(currentBook.pages[editingPage].pageNumber, { content: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <ImageIcon size={16} />
                      Prompt Ilustrasi
                    </label>
                    <textarea 
                      className="w-full h-32 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none text-sm text-slate-500"
                      value={currentBook.pages[editingPage].imagePrompt}
                      onChange={(e) => updatePage(currentBook.pages[editingPage].pageNumber, { imagePrompt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="aspect-square rounded-3xl bg-slate-100 overflow-hidden relative group border border-slate-100">
                    {currentBook.pages[editingPage].imageUrl ? (
                      <img src={currentBook.pages[editingPage].imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
