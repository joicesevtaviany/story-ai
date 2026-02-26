import React, { useState, useMemo } from 'react';
import { Plus, Book as BookIcon, Clock, Trash2, Edit2, SortAsc, SortDesc, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { useBookStore, Book } from '../store/useBookStore';

interface DashboardProps {
  onOpenBook: (book: Book) => void;
  onCreateNew: () => void;
}

type SortField = 'createdAt' | 'title' | 'theme' | 'manual';
type SortOrder = 'asc' | 'desc';

export function Dashboard({ onOpenBook, onCreateNew }: DashboardProps) {
  const { books, deleteBook, updateBook, setBooks } = useBookStore();
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const sortedBooks = useMemo(() => {
    if (sortBy === 'manual') return books;

    return [...books].sort((a, b) => {
      if (sortBy === 'createdAt') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      const valA = String((a as any)[sortBy] || '').toLowerCase();
      const valB = String((b as any)[sortBy] || '').toLowerCase();
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, sortBy, sortOrder]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus buku ini?')) {
      await deleteBook(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    setEditingBook(book);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBook) {
      await updateBook(editingBook.id, editingBook);
      setEditingBook(null);
    }
  };

  const moveBook = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const newBooks = [...books];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBooks.length) return;
    
    const [movedBook] = newBooks.splice(index, 1);
    newBooks.splice(targetIndex, 0, movedBook);
    setBooks(newBooks);
    setSortBy('manual');
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Perpustakaan Saya</h2>
          <p className="text-slate-500">Koleksi cerita ajaib Anda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {books.length > 0 && (
            <button 
              onClick={async () => {
                if (confirm('Hapus SEMUA buku di perpustakaan? Tindakan ini permanen.')) {
                  const { deleteAllBooks } = useBookStore.getState();
                  await deleteAllBooks();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl font-bold transition-all"
            >
              <Trash2 size={18} />
              Hapus Semua
            </button>
          )}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm shadow-sm">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-transparent border-none focus:ring-0 font-medium cursor-pointer"
            >
              <option value="createdAt">Tanggal</option>
              <option value="title">Judul</option>
              <option value="theme">Tema</option>
              <option value="manual">Manual</option>
            </select>
            {sortBy !== 'manual' && (
              <button 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
            )}
          </div>
          <button 
            onClick={onCreateNew}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-slate-900 rounded-2xl font-bold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-200"
          >
            <Plus size={20} />
            Buat Cerita Baru
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookIcon className="text-slate-300 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">Belum ada cerita</h3>
          <p className="text-slate-500 mb-8">Mulai perjalanan Anda dengan membuat buku cerita AI pertama Anda.</p>
          <button 
            onClick={onCreateNew}
            className="text-yellow-600 font-bold hover:underline"
          >
            Buat cerita pertama Anda →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBooks.map((book, index) => (
            <div 
              key={book.id}
              onClick={() => onOpenBook(book)}
              className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 transition-all relative"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                {book.coverImageUrl ? (
                  <img 
                    src={book.coverImageUrl} 
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookIcon className="text-slate-300 w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <span className="text-white font-bold">Baca Sekarang →</span>
                </div>
                
                {/* Actions */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => handleEdit(e, book)}
                      className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl hover:bg-white transition-colors shadow-lg"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, book.id)}
                      className="p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-xl hover:bg-red-500 transition-colors shadow-lg"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {sortBy === 'manual' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => moveBook(e, index, 'up')}
                        disabled={index === 0}
                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl hover:bg-white disabled:opacity-30 transition-colors shadow-lg"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button 
                        onClick={(e) => moveBook(e, index, 'down')}
                        disabled={index === books.length - 1}
                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl hover:bg-white disabled:opacity-30 transition-colors shadow-lg"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-lg mb-1 line-clamp-1">{book.title}</h4>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Clock size={12} />
                  <span>{book.createdAt ? new Date(book.createdAt).toLocaleDateString('id-ID') : 'Baru saja'}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{book.theme}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold">Edit Buku Cerita</h3>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Buku</label>
                <input 
                  type="text"
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({...editingBook, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tema</label>
                <input 
                  type="text"
                  value={editingBook.theme}
                  onChange={(e) => setEditingBook({...editingBook, theme: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Usia</label>
                <input 
                  type="text"
                  value={editingBook.targetAge}
                  onChange={(e) => setEditingBook({...editingBook, targetAge: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nilai Moral</label>
                <input 
                  type="text"
                  value={editingBook.moralValue}
                  onChange={(e) => setEditingBook({...editingBook, moralValue: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-yellow-400 text-slate-900 rounded-2xl font-bold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-200"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
