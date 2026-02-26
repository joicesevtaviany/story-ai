import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Database Setup
const dbPath = process.env.DB_PATH || "storybook.db";
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT,
    theme TEXT,
    targetAge TEXT,
    moralValue TEXT,
    coverImageUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    bookId TEXT,
    pageNumber INTEGER,
    content TEXT,
    imageUrl TEXT,
    imagePrompt TEXT,
    FOREIGN KEY(bookId) REFERENCES books(id)
  );
`);

// API Routes
app.post("/api/proxy/gemini", async (req, res) => {
  const { model, contents, config, type, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API Key not configured on server" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    if (type === 'image') {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });
      
      const candidates = response.candidates || [];
      res.json({ candidates });
    } else {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });
      res.json(response);
    }
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    
    let errorMessage = error.message || "Failed to communicate with Gemini API";
    
    // Check for leaked API key error
    if (errorMessage.includes("leaked") || (error.details && JSON.stringify(error.details).includes("leaked"))) {
      errorMessage = "API Key Gemini terdeteksi bocor dan telah dinonaktifkan oleh Google. Silakan gunakan API Key baru di menu Pengaturan.";
    }

    res.status(error.status || 500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post("/api/proxy/freepik", async (req, res) => {
  const { prompt, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.FREEPIK_API_KEY || process.env.VITE_FREEPIK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Freepik API Key not configured on server" });
  }

  try {
    const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        num_images: 1,
        image: {
          size: 'square_1_1'
        },
        styling: {
          style: 'cartoon'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Freepik Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with Freepik API" });
  }
});

app.post("/api/books", (req, res) => {
  const { id, title, theme, targetAge, moralValue, coverImageUrl, pages } = req.body;

  try {
    const insertBook = db.prepare(`
      INSERT INTO books (id, title, theme, targetAge, moralValue, coverImageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertBook.run(id, title, theme, targetAge, moralValue, coverImageUrl);

    const insertPage = db.prepare(`
      INSERT INTO pages (id, bookId, pageNumber, content, imageUrl, imagePrompt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((pages, bookId) => {
      for (const page of pages) {
        insertPage.run(
          `${bookId}-${page.pageNumber}`,
          bookId,
          page.pageNumber,
          page.content,
          page.imageUrl,
          page.imagePrompt
        );
      }
    });

    transaction(pages, id);
    res.json({ success: true });
  } catch (error) {
    console.error("Save book error:", error);
    res.status(500).json({ error: "Failed to save book" });
  }
});

app.get("/api/books", (req, res) => {
  const { sortBy = 'createdAt', order = 'DESC' } = req.query;
  const validColumns = ['title', 'createdAt', 'theme'];
  const column = validColumns.includes(sortBy as string) ? sortBy : 'createdAt';
  const direction = order === 'ASC' ? 'ASC' : 'DESC';

  const books = db.prepare(`SELECT * FROM books ORDER BY ${column} ${direction}`).all();
  res.json(books || []);
});

app.put("/api/books/:id", (req, res) => {
  const { title, theme, targetAge, moralValue } = req.body;
  const { id } = req.params;

  try {
    const updateBook = db.prepare(`
      UPDATE books 
      SET title = ?, theme = ?, targetAge = ?, moralValue = ?
      WHERE id = ?
    `);
    const result = updateBook.run(title, theme, targetAge, moralValue, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

app.delete("/api/books/:id", (req, res) => {
  const { id } = req.params;

  try {
    // Delete pages first due to foreign key (though sqlite might need PRAGMA foreign_keys = ON)
    const deletePages = db.prepare("DELETE FROM pages WHERE bookId = ?");
    deletePages.run(id);

    const deleteBook = db.prepare("DELETE FROM books WHERE id = ?");
    const result = deleteBook.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

app.get("/api/books/:id", (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const pages = db.prepare("SELECT * FROM pages WHERE bookId = ? ORDER BY pageNumber ASC").all(req.params.id);
  res.json({ ...book, pages: pages || [] });
});

app.delete("/api/books/:id", (req, res) => {
  try {
    const deletePages = db.prepare("DELETE FROM pages WHERE bookId = ?");
    deletePages.run(req.params.id);

    const deleteBook = db.prepare("DELETE FROM books WHERE id = ?");
    deleteBook.run(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

app.patch("/api/books/:id", (req, res) => {
  const { title, theme, targetAge, moralValue, coverImageUrl } = req.body;
  try {
    const updateBook = db.prepare(`
      UPDATE books 
      SET title = COALESCE(?, title),
          theme = COALESCE(?, theme),
          targetAge = COALESCE(?, targetAge),
          moralValue = COALESCE(?, moralValue),
          coverImageUrl = COALESCE(?, coverImageUrl)
      WHERE id = ?
    `);
    updateBook.run(title, theme, targetAge, moralValue, coverImageUrl, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
