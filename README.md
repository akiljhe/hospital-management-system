# Aplikasi Web Digitalisasi Rumah Sakit (RS Digital Sehat)
**Tugas Final Praktikum Pemrograman Web 2026**

Aplikasi web modern berbasis **Next.js (App Router)** dengan **PostgreSQL (raw SQL library `pg`)**, **Tailwind CSS**, dan autentikasi berbasis cookie `httpOnly` dengan hashing password `bcrypt`.

---

## 🚀 Fitur dan Hak Akses Pengguna

### 1. **Guest (Tamu / Publik)**
- Melihat Beranda Publik Rumah Sakit.
- Melihat daftar poliklinik beserta deskripsinya.
- Melihat daftar dokter spesialis beserta jadwal praktik mingguan (30 menit/slot).
- Tombol **"Lanjutkan sebagai Tamu"** di halaman login untuk kembali ke beranda.

### 2. **Pasien**
- Pendaftaran akun baru (Register khusus pasien).
- Pembuatan janji temu bertahap (**Wizard: Pilih Poli → Pilih Dokter & Jadwal → Tanggal & Konfirmasi**).
- Validasi ketat slot jadwal:
  - Satu slot tidak dapat dipesan ganda pada tanggal yang sama.
  - Tanggal booking wajib cocok dengan hari praktik dokter.
- Pembatalan janji temu mandiri (hanya saat status masih `Pending`).
- Riwayat janji temu dengan badge status warna responsif.
- Riwayat rekam medis permanen dan status resep obat farmasi.
- Halaman profil pasien yang dapat diedit.
- Notifikasi in-app ketika janji disetujui/ditolak dan saat resep siap diambil.

### 3. **Dokter**
- Atur jadwal praktik sendiri:
  - Durasi slot tepat 30 menit.
  - Waktu mulai slot pada menit `:00` atau `:30`.
  - Validasi pencegahan jadwal bentrok.
- Verifikasi janji temu pasien (Setujui / Tolak dengan alasan wajib).
- Antrean janji `Approved` hari ini.
- Pencatatan rekam medis & resep obat dalam satu transaksi database (`BEGIN ... COMMIT`):
  - Terintegrasi dengan trigger database (otomatis update status janji ke `Selesai` dan buat antrean `resep`).
  - Rekam medis bersifat permanen (tidak ada fitur edit atau hapus).
- Riwayat pasien yang pernah ditangani.
- Notifikasi in-app ketika ada permohonan janji temu baru dari pasien.

### 4. **Admin**
- Dashboard operasional terintegrasi:
  - Jumlah janji `Pending` menunggu verifikasi.
  - Antrean farmasi (`Menunggu Diproses` & `Siap Diambil`).
  - Daftar dokter yang bertugas pada hari ini.
  - Total pengguna per peran (Admin, Dokter, Pasien).
- Manajemen Pengguna (CRUD dokter & pasien):
  - Tambah dokter lengkap dengan relasi ke poliklinik.
  - Reset / ubah profil pengguna.
- Manajemen Poliklinik (CRUD nama, deskripsi, ikon emoji).
- Manajemen Stok Obat:
  - Filter obat: **Tersedia**, **Tidak Tersedia (Habis)**, dan **Kadaluarsa**.
  - Deteksi dan peringatan stok habis / kadaluarsa.
- Verifikasi Janji Temu (Setujui / Tolak).
- Manajemen Farmasi:
  - Mengubah status resep: `Menunggu Diproses` → `Siap Diambil` → `Sudah Diambil`.
  - Saat diubah ke `Siap Diambil`, trigger database secara otomatis memotong stok obat di gudang farmasi.

---

## 🗄️ Database & Trigger

- Menggunakan PostgreSQL dengan query SQL mentah (**Raw SQL**) melalui library `pg` (tanpa ORM seperti Prisma/Sequelize).
- File skema database tersimpan di luar folder `/app`: `hospital.sql`.
- Menggunakan trigger otomatis:
  1. `fn_arsip_permanen`: Melindungi tabel `rekam_medis` dan `resep_item` dari aksi `UPDATE` dan `DELETE`.
  2. `fn_rekam_medis_baru`: Memvalidasi bahwa janji temu berstatus `Approved` sebelum rekam medis dibuat.
  3. `fn_rekam_medis_setelah_insert`: Mengubah status janji temu menjadi `Selesai` dan membuat antrean di tabel `resep` dengan status `Menunggu Diproses`.
  4. `fn_resep_status`: Memvalidasi urutan status resep, otomatis mengisi `tanggal_siap` dan `tanggal_diambil`, serta memotong stok obat secara otomatis pada saat status `Siap Diambil`.

---

## 🔑 Akun Uji Coba (Demo Accounts)

Untuk mempermudah penilaian dan pengujian, akun-akun berikut sudah siap digunakan dengan tombol cepat (Quick Fill) di halaman login:

| Peran | Email / Username | Password | Keterangan |
|---|---|---|---|
| **Admin** | `admin` atau `admin@rumahsakit.local` | `admin123` | Akses penuh dashboard, user, obat, farmasi |
| **Dokter** | `dr_sarah` atau `dr.sarah@rumahsakit.local` | `dokter123` | Dokter Spesialis Penyakit Dalam (Poli Umum) |
| **Dokter** | `dr_budi` atau `dr.budi@rumahsakit.local` | `dokter123` | Dokter Gigi (Poli Gigi) |
| **Pasien** | `johndoe` atau `john@email.com` | `pasien123` | Akun pasien bawaan |
| **Pasien** | `sitiaminah` atau `siti@email.com` | `pasien123` | Akun pasien tambahan |

> Anda juga dapat mendaftarkan akun pasien baru langsung melalui menu **Daftar Akun**.

---

## 🛠️ Cara Menjalankan Aplikasi

### 1. Clone & Masuk ke Folder Proyek
\`\`\`bash
cd "hospital-app"
\`\`\`

### 2. Install Dependensi
\`\`\`bash
npm install
\`\`\`

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`
Sesuaikan `DATABASE_URL` jika kredensial PostgreSQL Anda berbeda:
\`\`\`env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rumah_sakit"
SESSION_SECRET="hospital-secret-key-2026-very-secure-and-long"
\`\`\`

### 4. Import Database `hospital.sql`
Jalankan file `hospital.sql` (berada di luar folder `/app`) ke PostgreSQL:
\`\`\`bash
psql -U postgres -d rumah_sakit -f "../hospital.sql"
\`\`\`

### 5. Jalankan Server Development
\`\`\`bash
npm run dev
\`\`\`
Buka peramban di [http://localhost:3000](http://localhost:3000).
