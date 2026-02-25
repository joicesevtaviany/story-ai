# Panduan Deployment: Remix Kids Storybook Creator AI (Supabase + Netlify)

Aplikasi ini telah dimigrasikan untuk menggunakan **Supabase** sebagai database, sehingga Anda dapat mendeploynya ke **Netlify** atau platform statis lainnya tanpa kehilangan data.

## 1. Persiapan Supabase
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Buka **SQL Editor** di dashboard Supabase.
3. Jalankan perintah SQL berikut untuk membuat tabel yang diperlukan:

```sql
-- Tabel Books
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  target_age TEXT,
  moral_value TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Pages
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT,
  image_url TEXT,
  image_prompt TEXT
);

-- Aktifkan RLS (Row Level Security) jika diperlukan, 
-- atau buat kebijakan akses publik untuk demo:
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON books FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON books FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read" ON pages FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON pages FOR INSERT WITH CHECK (true);
```

4. Dapatkan **Project URL** dan **Anon Key** dari menu **Project Settings > API**.

---

## 2. Deploy ke Netlify
1. Hubungkan repositori GitHub Anda ke Netlify.
2. Tambahkan **Environment Variables** di Netlify:
   - `VITE_SUPABASE_URL`: (URL Proyek Supabase Anda)
   - `VITE_SUPABASE_ANON_KEY`: (Anon Key Supabase Anda)
   - `VITE_GEMINI_API_KEY`: (Kunci API Gemini Anda - Gunakan awalan VITE_)
   - `GEMINI_API_KEY`: (Opsional, untuk kompatibilitas tambahan)
3. Gunakan pengaturan build:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`

---

## 3. Kenapa Gambar Tidak Muncul di Netlify?
Jika Anda mendeploy ke Netlify dan gambar tidak muncul, pastikan:
1. **Gemini API Key** sudah diset di environment variables Netlify.
2. Gambar yang dihasilkan oleh Gemini adalah dalam format **Base64** (data URI), yang seharusnya aman ditampilkan di browser mana pun.
3. Jika menggunakan **Freepik AI**, pastikan API Key Freepik juga sudah diset di pengaturan aplikasi.
