import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addBook: (book: Book) => void;
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
      addBook: (book) => set((state) => ({ books: [book, ...state.books] })),
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
