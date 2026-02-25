import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';

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
  setBrandSettings: (name: string, logo: string, logoUrl: string) => void;
  setImageSettings: (engine: 'gemini' | 'freepik', apiKey: string) => void;
  setGeminiApiKey: (key: string) => void;
  addBook: (book: Book) => Promise<void>;
  fetchBooks: () => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | null>;
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
      setBrandSettings: (brandName, brandLogo, brandLogoUrl) => set({ brandName, brandLogo, brandLogoUrl }),
      setImageSettings: (imageEngine, freepikApiKey) => set({ imageEngine, freepikApiKey }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      addBook: async (book) => {
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .insert([{
            id: book.id,
            title: book.title,
            theme: book.theme,
            target_age: book.targetAge,
            moral_value: book.moralValue,
            cover_image_url: book.coverImageUrl
          }]);

        if (bookError) {
          console.error('Error saving book:', bookError);
          return;
        }

        const pagesToInsert = book.pages.map(p => ({
          id: `${book.id}-${p.pageNumber}`,
          book_id: book.id,
          page_number: p.pageNumber,
          content: p.content,
          image_url: p.imageUrl,
          image_prompt: p.imagePrompt
        }));

        const { error: pagesError } = await supabase
          .from('pages')
          .insert(pagesToInsert);

        if (pagesError) {
          console.error('Error saving pages:', pagesError);
          return;
        }

        set((state) => ({ books: [book, ...state.books] }));
      },
      fetchBooks: async () => {
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
