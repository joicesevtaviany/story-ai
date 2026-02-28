import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Loader2, Wand2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useBookStore, Book, Page } from '../store/useBookStore';
import { generateStory, generateImage } from '../services/geminiService';

interface WizardProps {
  onComplete: () => void;
}

export function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    theme: '',
    mainCharacter: '',
    targetAge: '3-5',
    moralValue: '',
    genre: 'Adventure',
    illustrationStyle: 'Cartoon',
    characterType: 'Human',
    language: 'Indonesian',
    referenceImage: '' as string
  });
  const { setIsGenerating, isGenerating, setCurrentBook, addBook } = useBookStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, referenceImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateStory(formData);

      const book: Book = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title,
        theme: formData.theme,
        targetAge: formData.targetAge,
        moralValue: formData.moralValue,
        pages: data.pages
      };

      setCurrentBook(book);
      
      // Generate images for each page
      let hasImageError = false;
      const pagesWithImages = await Promise.all(book.pages.map(async (page) => {
        try {
          const imageUrl = await generateImage(page.imagePrompt);
          return { ...page, imageUrl };
        } catch (e) {
          console.error("Image gen failed for page", page.pageNumber, e);
          hasImageError = true;
          return page;
        }
      }));

      if (hasImageError) {
        alert("Beberapa ilustrasi gagal dibuat. Anda bisa mencoba memperbaruinya nanti di menu Edit.");
      }

      const finalBook = { ...book, pages: pagesWithImages, coverImageUrl: pagesWithImages[0].imageUrl };
      setCurrentBook(finalBook);
      
      await addBook(finalBook);
      onComplete();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Gagal membuat cerita. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
            <Wand2 className="text-yellow-600 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Mode Cerita Cepat</h2>
            <p className="text-slate-500 text-sm">Biarkan AI merajut kisah ajaib untuk si kecil.</p>
          </div>
        </div>

        {isGenerating ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
            <h3 className="text-xl font-bold mb-2">Menciptakan Keajaiban...</h3>
            <p className="text-slate-500 max-w-xs">AI kami sedang menulis cerita dan melukis ilustrasi. Ini memakan waktu sekitar satu menit.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Genre</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                >
                  <option value="Petualangan">Petualangan</option>
                  <option value="Dongeng">Dongeng</option>
                  <option value="Cerita Hewan">Cerita Hewan</option>
                  <option value="Edukasi">Edukasi</option>
                  <option value="Cerita Moral">Cerita Moral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Gaya Ilustrasi</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  value={formData.illustrationStyle}
                  onChange={(e) => setFormData({ ...formData, illustrationStyle: e.target.value })}
                >
                  <option value="Kartun">Kartun</option>
                  <option value="Cat Air">Cat Air</option>
                  <option value="Vektor Flat">Vektor Flat</option>
                  <option value="Anime">Anime</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gambar Referensi (Opsional)</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden group">
                  {formData.referenceImage ? (
                    <>
                      <img src={formData.referenceImage} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setFormData({ ...formData, referenceImage: '' })}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      <Upload className="text-slate-300 w-6 h-6 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Upload</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">
                    Unggah gambar karakter atau gaya yang Anda inginkan. AI akan mencoba mengikuti referensi ini.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tentang apa ceritanya?</label>
              <input 
                type="text"
                placeholder="misal: Kucing pemberani menjelajahi bulan"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Tokoh Utama</label>
                <input 
                  type="text"
                  placeholder="misal: Whiskers"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                  value={formData.mainCharacter}
                  onChange={(e) => setFormData({ ...formData, mainCharacter: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Karakter</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  value={formData.characterType}
                  onChange={(e) => setFormData({ ...formData, characterType: e.target.value })}
                >
                  <option value="Manusia">Manusia</option>
                  <option value="Hewan">Hewan</option>
                  <option value="Robot">Robot</option>
                  <option value="Makhluk Ajaib">Makhluk Ajaib</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Usia</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  value={formData.targetAge}
                  onChange={(e) => setFormData({ ...formData, targetAge: e.target.value })}
                >
                  <option value="3-5">3-5 Tahun</option>
                  <option value="6-9">6-9 Tahun</option>
                  <option value="10+">10+ Tahun</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nilai Moral</label>
                <input 
                  type="text"
                  placeholder="misal: Kejujuran, Keberanian"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                  value={formData.moralValue}
                  onChange={(e) => setFormData({ ...formData, moralValue: e.target.value })}
                />
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!formData.theme || !formData.mainCharacter}
              className="w-full py-4 bg-yellow-400 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-200"
            >
              Buat Cerita
              <Sparkles size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
