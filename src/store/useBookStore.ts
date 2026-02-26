import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, uploadImage, isSupabaseConfigured } from '../services/supabase';

export interface Page {
  pageNumber: number;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  theme: string;
  targetAge: string;
  moralValue: string;
  coverImageUrl?: string;
  pages: Page[];
  createdAt?: string;
}

interface BookStore {
  books: Book[];
  currentBook: Book | null;
  isGenerating: boolean;
  brandName: string;
  brandLogo: string;
  brandLogoUrl: string;
  freepikApiKey: string;
  geminiApiKey: string;
  imageEngine: 'gemini' | 'freepik';
  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;
  setIsGenerating: (is: boolean) => void;
  fetchSettings: () => Promise<void>;
  setBrandSettings: (name: string, logo: string, logoUrl: string) => Promise<void>;
  setImageSettings: (engine: 'gemini' | 'freepik', apiKey: string) => Promise<void>;
  setGeminiApiKey: (key: string) => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  fetchBooks: () => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | null>;
  deleteBook: (id: string) => Promise<void>;
  deleteAllBooks: () => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  updatePage: (pageNumber: number, updates: Partial<Page>) => void;
}

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      books: [],
      currentBook: null,
      isGenerating: false,
      brandName: 'StoryAI',
      brandLogo: 'BookOpen',
      brandLogoUrl: '',
      freepikApiKey: '',
      geminiApiKey: '',
      imageEngine: 'gemini',
      setBooks: (books) => set({ books }),
      setCurrentBook: (currentBook) => set({ currentBook }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      fetchSettings: async () => {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 'global')
          .single();
        
        if (data && !error) {
          set({
            brandName: data.brand_name || 'StoryAI',
            brandLogo: data.brand_logo || 'BookOpen',
            brandLogoUrl: data.brand_logo_url || '',
            freepikApiKey: data.freepik_api_key || '',
            geminiApiKey: data.gemini_api_key || '',
            imageEngine: data.image_engine || 'gemini'
          });
        }
      },
      setBrandSettings: async (brandName, brandLogo, brandLogoUrl) => {
        set({ brandName, brandLogo, brandLogoUrl });
        await supabase.from('settings').upsert({
          id: 'global',
          brand_name: brandName,
          brand_logo: brandLogo,
          brand_logo_url: brandLogoUrl
        });
      },
      setImageSettings: async (imageEngine, freepikApiKey) => {
        set({ imageEngine, freepikApiKey });
        await supabase.from('settings').upsert({
          id: 'global',
          image_engine: imageEngine,
          freepik_api_key: freepikApiKey
        });
      },
      setGeminiApiKey: async (geminiApiKey) => {
        set({ geminiApiKey });
        await supabase.from('settings').upsert({
          id: 'global',
          gemini_api_key: geminiApiKey
        });
      },
      addBook: async (book) => {
        // Upload images to Supabase Storage first
        const pagesWithUrls = await Promise.all(book.pages.map(async (page) => {
          if (page.imageUrl && page.imageUrl.startsWith('data:')) {
            const publicUrl = await uploadImage(page.imageUrl, `page-${page.pageNumber}`);
            return { ...page, imageUrl: publicUrl };
          }
          return page;
        }));

        const coverImageUrl = pagesWithUrls[0]?.imageUrl || book.coverImageUrl;
        const finalBook = { ...book, pages: pagesWithUrls, coverImageUrl };

        if (isSupabaseConfigured) {
          try {
            const { error: bookError } = await supabase
              .from('books')
              .insert([{
                id: finalBook.id,
                title: finalBook.title,
                theme: finalBook.theme,
                target_age: finalBook.targetAge,
                moral_value: finalBook.moralValue,
                cover_image_url: finalBook.coverImageUrl
              }]);

            if (bookError) {
              console.error('Error saving book:', bookError);
            } else {
              const pagesToInsert = finalBook.pages.map(p => ({
                id: `${finalBook.id}-${p.pageNumber}`,
                book_id: finalBook.id,
                page_number: p.pageNumber,
                content: p.content,
                image_url: p.imageUrl,
                image_prompt: p.imagePrompt
              }));

              const { error: pagesError } = await supabase
                .from('pages')
                .insert(pagesToInsert);

              if (pagesError) console.error('Error saving pages:', pagesError);
            }
          } catch (err) {
            console.error('Supabase save failed:', err);
          }
        }

        // Always update local state for immediate feedback
        set((state) => ({ books: [finalBook, ...state.books] }));
      },
      fetchBooks: async () => {
        if (!isSupabaseConfigured) return;

        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching books:', error);
          return;
        }

        const formattedBooks: Book[] = data.map(b => ({
          id: b.id,
          title: b.title,
          theme: b.theme,
          targetAge: b.target_age,
          moralValue: b.moral_value,
          coverImageUrl: b.cover_image_url,
          createdAt: b.created_at,
          pages: [] // Pages are fetched on demand
        }));

        set({ books: formattedBooks });
      },
      fetchBookById: async (id) => {
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();

        if (bookError || !bookData) {
          console.error('Error fetching book:', bookError);
          return null;
        }

        const { data: pagesData, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .eq('book_id', id)
          .order('page_number', { ascending: true });

        if (pagesError) {
          console.error('Error fetching pages:', pagesError);
          return null;
        }

        const book: Book = {
          id: bookData.id,
          title: bookData.title,
          theme: bookData.theme,
          targetAge: bookData.target_age,
          moralValue: bookData.moral_value,
          coverImageUrl: bookData.cover_image_url,
          createdAt: bookData.created_at,
          pages: pagesData.map(p => ({
            pageNumber: p.page_number,
            content: p.content,
            imagePrompt: p.image_prompt,
            imageUrl: p.image_url
          }))
        };

        return book;
      },
      deleteBook: async (id) => {
        // Optimistic update - clear from UI immediately
        set((state) => ({
          books: state.books.filter(b => b.id !== id),
          currentBook: state.currentBook?.id === id ? null : state.currentBook
        }));

        if (!isSupabaseConfigured) return;

        try {
          const { error: pagesError } = await supabase
            .from('pages')
            .delete()
            .eq('book_id', id);
          
          if (pagesError) console.error('Error deleting pages:', pagesError);

          const { error: bookError } = await supabase
            .from('books')
            .delete()
            .eq('id', id);

          if (bookError) console.error('Error deleting book:', bookError);
        } catch (err) {
          console.error('Delete failed:', err);
        }
      },
      deleteAllBooks: async () => {
        // Clear local state immediately for better UX
        set({ books: [], currentBook: null });

        if (!isSupabaseConfigured) return;

        try {
          // Delete all pages first (foreign key constraint)
          const { error: pagesError } = await supabase
            .from('pages')
            .delete()
            .not('id', 'is', null); // More robust "delete all" filter
          
          if (pagesError) console.error('Error deleting all pages:', pagesError);

          // Delete all books
          const { error: bookError } = await supabase
            .from('books')
            .delete()
            .not('id', 'is', null);

          if (bookError) {
            console.error('Error deleting all books:', bookError);
            // If it failed on server, we might want to re-fetch to show reality
            // but for now we trust the user's intent to clear.
          }
        } catch (err) {
          console.error('Delete all failed:', err);
        }
      },
      updateBook: async (id, updates) => {
        const { error } = await supabase
          .from('books')
          .update({
            title: updates.title,
            theme: updates.theme,
            target_age: updates.targetAge,
            moral_value: updates.moralValue,
            cover_image_url: updates.coverImageUrl
          })
          .eq('id', id);

        if (error) {
          console.error('Error updating book:', error);
          return;
        }

        set((state) => ({
          books: state.books.map(b => b.id === id ? { ...b, ...updates } : b),
          currentBook: state.currentBook?.id === id ? { ...state.currentBook, ...updates } : state.currentBook
        }));
      },
      updatePage: (pageNumber, updates) => set((state) => {
        if (!state.currentBook) return state;
        const newPages = state.currentBook.pages.map(p => 
          p.pageNumber === pageNumber ? { ...p, ...updates } : p
        );
        return {
          currentBook: { ...state.currentBook, pages: newPages }
        };
      }),
    }),
    {
      name: 'storybook-ai-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            return JSON.parse(str);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
              console.warn('Storage quota exceeded. Clearing large items...');
              // Try to save without the logo URL if it's too big
              const state = value.state;
              if (state && state.brandLogoUrl && state.brandLogoUrl.length > 100000) {
                const newState = { ...value, state: { ...state, brandLogoUrl: '' } };
                try {
                  localStorage.setItem(name, JSON.stringify(newState));
                  return;
                } catch (e2) {
                  // Still failing, clear everything
                }
              }
              localStorage.removeItem(name);
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        brandName: state.brandName,
        brandLogo: state.brandLogo,
        brandLogoUrl: state.brandLogoUrl,
        freepikApiKey: state.freepikApiKey,
        geminiApiKey: state.geminiApiKey,
        imageEngine: state.imageEngine,
      } as any),
    }
  )
);
