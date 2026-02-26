import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  LayoutDashboard, 
  Sparkles, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  Languages,
  Volume2,
  Image as ImageIcon,
  Type as TypeIcon,
  Upload,
  Settings as SettingsIcon,
  Check
} from 'lucide-react';
import { useBookStore, Book, Page } from './store/useBookStore';
import { validateGeminiKey, generateImage, testConnection } from './services/geminiService';
import { isSupabaseConfigured } from './services/supabase';
import { Wizard } from './components/Wizard';
import { Dashboard } from './components/Dashboard';
import { BookPreview } from './components/BookPreview';
import { PageEditor } from './components/PageEditor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [view, setView] = useState<'dashboard' | 'wizard' | 'preview' | 'editor' | 'settings'>('dashboard');
  const { 
    currentBook, setCurrentBook, setBooks, 
    brandName, brandLogo, brandLogoUrl, setBrandSettings,
    imageEngine, freepikApiKey, setImageSettings,
    fetchBooks, fetchBookById, fetchSettings
  } = useBookStore();

  useEffect(() => {
    fetchBooks();
    fetchSettings();
  }, []);

  const handleCreateNew = () => {
    setCurrentBook(null);
    setView('wizard');
  };

  const handleOpenBook = async (book: Book) => {
    const fullBook = await fetchBookById(book.id);
    if (fullBook) {
      setCurrentBook(fullBook);
      setView('preview');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandSettings(brandName, brandLogo, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-slate-900 font-sans selection:bg-yellow-200">
      {/* Sidebar */}
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-[100] text-xs font-bold shadow-lg">
          ⚠️ Supabase belum dikonfigurasi. Data tidak akan tersimpan secara permanen. Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.
        </div>
      )}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 p-6 z-50 hidden md:block">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="text-white w-6 h-6" />
            )}
          </div>
          <h1 className="font-bold text-xl tracking-tight">{brandName}</h1>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              view === 'dashboard' ? "bg-yellow-50 text-yellow-700 font-medium" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard size={20} />
            Beranda
          </button>
          <button 
            onClick={handleCreateNew}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              view === 'wizard' ? "bg-yellow-50 text-yellow-700 font-medium" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Plus size={20} />
            Buat Baru
          </button>
          <button 
            onClick={() => setView('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              view === 'settings' ? "bg-yellow-50 text-yellow-700 font-medium" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <SettingsIcon size={20} />
            Pengaturan
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard onOpenBook={handleOpenBook} onCreateNew={handleCreateNew} />
            </motion.div>
          )}

          {view === 'wizard' && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Wizard onComplete={() => setView('preview')} />
            </motion.div>
          )}

          {view === 'preview' && currentBook && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BookPreview onEdit={() => setView('editor')} onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'editor' && currentBook && (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PageEditor onBack={() => setView('preview')} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <SettingsView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SettingsView() {
  const { 
    brandName, brandLogo, brandLogoUrl, setBrandSettings,
    imageEngine, freepikApiKey, setImageSettings,
    geminiApiKey, setGeminiApiKey
  } = useBookStore();

  const [localBrandName, setLocalBrandName] = useState(brandName);
  const [localLogoUrl, setLocalLogoUrl] = useState(brandLogoUrl);
  const [localFreepikKey, setLocalFreepikKey] = useState(freepikApiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: boolean }>({});
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const [lastErrorLog, setLastErrorLog] = useState<string>("");

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setLastErrorLog("");
    try {
      const success = await testConnection();
      if (success) {
        alert("Koneksi Berhasil! API Key Anda aktif dan bisa terhubung ke Google AI.");
      }
    } catch (error: any) {
      const log = `${error.name}: ${error.message}\n${error.stack || ''}`;
      setLastErrorLog(log);
      alert(error.message || "Koneksi Gagal. Silakan cek Log Error di bawah.");
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleTestImage = async () => {
    setIsTestingImage(true);
    setLastErrorLog("");
    try {
      const url = await generateImage("A cute small robot playing with a ball, cartoon style, bright colors");
      if (url) {
        alert("Berhasil! Gambar contoh berhasil dibuat.");
      }
    } catch (error: any) {
      const log = `${error.name}: ${error.message}\n${error.stack || ''}`;
      setLastErrorLog(log);
      alert(error.message || "Gagal membuat gambar. Silakan cek Log Error di bawah.");
    } finally {
      setIsTestingImage(false);
    }
  };

  const handleSaveBrand = async () => {
    setBrandSettings(localBrandName, brandLogo, localLogoUrl);
    triggerFeedback('brand');
  };

  const handleSaveAI = () => {
    setImageSettings(imageEngine, localFreepikKey);
    triggerFeedback('ai');
  };

  const handleSaveGemini = () => {
    setGeminiApiKey(localGeminiKey);
    triggerFeedback('gemini');
  };

  const handleCheckGemini = async () => {
    if (!localGeminiKey) {
      setValidationResult({ valid: false, message: "Masukkan API Key terlebih dahulu." });
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    const result = await validateGeminiKey(localGeminiKey);
    setValidationResult(result);
    setIsValidating(false);
  };

  const triggerFeedback = (key: string) => {
    setSaveStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm space-y-10">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="text-yellow-500" />
            Pengaturan Brand
          </h2>
          <button 
            onClick={handleSaveBrand}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
              saveStatus['brand'] ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {saveStatus['brand'] ? <><Check size={18} /> Tersimpan</> : 'Simpan'}
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Brand</label>
            <input 
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none"
              value={localBrandName}
              onChange={(e) => setLocalBrandName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Logo Brand</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {localLogoUrl ? (
                  <img src={localLogoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="text-slate-300 w-8 h-8" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload className="text-white w-6 h-6" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-2">Unggah logo dari komputer Anda atau masukkan URL di bawah.</p>
                <input 
                  type="text"
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                  value={localLogoUrl}
                  onChange={(e) => setLocalLogoUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-slate-100" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-yellow-500" />
            Mesin Gambar (AI)
          </h2>
          <button 
            onClick={handleSaveAI}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
              saveStatus['ai'] ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {saveStatus['ai'] ? <><Check size={18} /> Tersimpan</> : 'Simpan'}
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Pilih Mesin Gambar</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setImageSettings('gemini', freepikApiKey)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left",
                  imageEngine === 'gemini' ? "border-yellow-400 bg-yellow-50" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <p className="font-bold text-slate-900">Gemini AI</p>
                <p className="text-xs text-slate-500">Bawaan (Gratis)</p>
              </button>
              <button 
                onClick={() => setImageSettings('freepik', freepikApiKey)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left",
                  imageEngine === 'freepik' ? "border-yellow-400 bg-yellow-50" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <p className="font-bold text-slate-900">Freepik AI</p>
                <p className="text-xs text-slate-500">Membutuhkan API Key</p>
              </button>
            </div>
          </div>

          {imageEngine === 'freepik' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Freepik API Key</label>
                <input 
                  type="password"
                  placeholder="Masukkan API Key Freepik Anda"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={localFreepikKey}
                  onChange={(e) => setLocalFreepikKey(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  Dapatkan API Key di <a href="https://developer.freepik.com/" target="_blank" className="underline">Freepik Developer Portal</a>.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <hr className="border-slate-100" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-blue-500" />
            Gemini API Key
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handleCheckGemini}
              disabled={isValidating}
              className="px-4 py-2 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isValidating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Cek Validasi
            </button>
            <button 
              onClick={handleSaveGemini}
              className={cn(
                "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                saveStatus['gemini'] ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {saveStatus['gemini'] ? <><Check size={18} /> Tersimpan</> : 'Simpan'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Gemini API Key</label>
            <input 
              type="password"
              placeholder="Masukkan API Key Gemini Anda (Opsional)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none"
              value={localGeminiKey}
              onChange={(e) => setLocalGeminiKey(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-2 italic">
              Kosongkan untuk menggunakan API Key bawaan sistem. Gunakan ini jika Anda memiliki API Key sendiri atau jika kuota bawaan habis.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Status Sistem:</span>
              {import.meta.env.VITE_GEMINI_API_KEY || geminiApiKey ? (
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <Check size={12} /> API Key Terdeteksi ({geminiApiKey ? "Settings" : "Environment"})
                </span>
              ) : (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  ⚠️ API Key Tidak Ditemukan
                </span>
              )}
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTestingConn}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:border-green-400 hover:text-green-600 transition-all flex items-center justify-center gap-2"
            >
              {isTestingConn ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Tes Koneksi API (Cek Jaringan)
            </button>

            <button
              onClick={handleTestImage}
              disabled={isTestingImage}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
            >
              {isTestingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              Tes Generate Gambar (Debug)
            </button>

            {lastErrorLog && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-[10px] font-mono text-red-600 break-all whitespace-pre-wrap">
                  {lastErrorLog}
                </p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(lastErrorLog);
                    alert("Log disalin!");
                  }}
                  className="mt-2 text-[10px] text-red-700 underline font-bold"
                >
                  Salin Log Error
                </button>
              </div>
            )}
          </div>
          
          {validationResult && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl text-sm font-medium",
                validationResult.valid ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              )}
            >
              {validationResult.message}
            </motion.div>
          )}
        </div>
      </section>

      <hr className="border-slate-100" />

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <Trash2 size={20} />
          Pembersihan Data
        </h2>
        <div className="space-y-4">
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-800 mb-2">Hapus Semua Koleksi Buku</h3>
            <p className="text-sm text-red-700 mb-4">
              Tindakan ini akan menghapus **seluruh** buku cerita yang telah Anda buat dari database secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <button 
              onClick={async () => {
                if (confirm('APAKAH ANDA YAKIN? Semua buku cerita Anda akan dihapus selamanya dari database.')) {
                  const { deleteAllBooks } = useBookStore.getState();
                  await deleteAllBooks();
                  alert('Semua koleksi buku telah dihapus.');
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
            >
              Hapus Semua Buku
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Reset Pengaturan Lokal</h3>
            <p className="text-sm text-slate-600 mb-4">
              Jika Anda mengalami masalah saat menyimpan pengaturan atau aplikasi terasa lambat, Anda dapat menghapus cache lokal. Ini akan mereset pengaturan brand dan API key Anda, **tetapi tidak akan menghapus buku cerita di database**.
            </p>
            <button 
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin menghapus semua pengaturan lokal?')) {
                  localStorage.removeItem('storybook-ai-storage');
                  window.location.reload();
                }
              }}
              className="px-6 py-2 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-100"
            >
              Hapus Cache & Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
