import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
  const books = db.prepare("SELECT * FROM books ORDER BY createdAt DESC").all();
  res.json(books || []);
});

app.get("/api/books/:id", (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const pages = db.prepare("SELECT * FROM pages WHERE bookId = ? ORDER BY pageNumber ASC").all(req.params.id);
  res.json({ ...book, pages: pages || [] });
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
