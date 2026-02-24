# Panduan Deployment: Remix Kids Storybook Creator AI

Aplikasi ini adalah aplikasi Full-Stack (Express + Vite) yang menggunakan **SQLite** sebagai database.

## Penting: Batasan Netlify
Netlify adalah platform untuk situs statis dan fungsi serverless. Aplikasi ini menggunakan **SQLite (`better-sqlite3`)** yang menyimpan data dalam file lokal (`storybook.db`).
- **Masalah:** Di Netlify, file sistem bersifat *read-only* dan *ephemeral* (sementara). Data yang Anda simpan akan hilang setiap kali fungsi dijalankan ulang atau dideploy.
- **Rekomendasi:** Untuk aplikasi Full-Stack dengan SQLite, sangat disarankan menggunakan platform seperti **Render.com**, **Railway.app**, atau **Fly.io** yang mendukung *Persistent Disk*.

---

## Opsi 1: Deploy ke Netlify (Hanya Frontend)
Jika Anda hanya ingin mendeploy frontend ke Netlify:
1. Hubungkan repositori GitHub Anda ke Netlify.
2. Gunakan pengaturan berikut:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
3. Tambahkan Environment Variable di Netlify:
   - `GEMINI_API_KEY`: (Kunci API Gemini Anda)

*Catatan: Fitur simpan buku ke database tidak akan berfungsi dengan benar di Netlify tanpa refactoring ke database cloud (seperti Supabase atau MongoDB).*

---

## Opsi 2: Deploy ke Render/Railway (Direkomendasikan)
Platform ini mendukung server Express dan database SQLite secara penuh.
1. Hubungkan GitHub ke Render/Railway.
2. Pilih tipe layanan: **Web Service**.
3. Pengaturan:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.ts`
4. Tambahkan Environment Variable:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: (Kunci API Gemini Anda)
5. (Khusus Render) Tambahkan **Disk** untuk menyimpan file `storybook.db` agar data tidak hilang.

---

## Langkah-langkah GitHub
1. Buat repositori baru di GitHub.
2. Inisialisasi git di folder lokal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```
