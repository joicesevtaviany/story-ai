import React from 'react';
import { Plus, Book as BookIcon, Clock } from 'lucide-react';
import { useBookStore, Book } from '../store/useBookStore';

interface DashboardProps {
  onOpenBook: (book: Book) => void;
  onCreateNew: () => void;
}

export function Dashboard({ onOpenBook, onCreateNew }: DashboardProps) {
  const { books } = useBookStore();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Perpustakaan Saya</h2>
          <p className="text-slate-500">Koleksi cerita ajaib Anda.</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-slate-900 rounded-2xl font-bold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-200"
        >
          <Plus size={20} />
          Buat Cerita Baru
        </button>
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
          {books.map((book) => (
            <div 
              key={book.id}
              onClick={() => onOpenBook(book)}
              className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 transition-all"
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
              </div>
              <div className="p-5">
                <h4 className="font-bold text-lg mb-1 line-clamp-1">{book.title}</h4>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Clock size={12} />
                  <span>{book.createdAt ? new Date(book.createdAt).toLocaleDateString('id-ID') : 'Baru saja'}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>8 Halaman</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
