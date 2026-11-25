# RS Digital Sehat — Sistem Informasi & Digitalisasi Rumah Sakit

Aplikasi web manajemen layanan rumah sakit terpadu berbasis **Next.js (App Router)**, **Tailwind CSS**, dan **PostgreSQL** menggunakan query SQL mentah (**Raw SQL** melalui library `pg`, tanpa ORM), dilengkapi autentikasi sesi berbasis cookie `httpOnly` dan hashing password `bcryptjs`.

---

## Teknologi Utama

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling & Animasi**: Tailwind CSS v4, Framer Motion, Lucide Icons, WebGL Shader & SVG EKG Background
- **Database**: PostgreSQL 13+ (`gen_random_uuid()`, View, Constraint, & PL/pgSQL Triggers) dengan koneksi `pg` Pool
- **Keamanan & Sesi**: Cookie `httpOnly` terenkripsi/bertanda tangan (`SESSION_SECRET`), hashing password `bcryptjs`, validasi input anti-HTML/XSS, dan proteksi akses berbasis peran (*Role-Based Access Control*)

---

## Fitur Berdasarkan Peran Pengguna

### 1. Guest (Publik / Tamu)
- Mengakses beranda informasi layanan RS Digital Sehat.
- Melihat daftar poliklinik spesialis beserta deskripsi layanan (`/poli`).
- Melihat daftar dokter beserta jadwal praktik mingguan berdurasi 30 menit (`/doctors`).

### 2. Pasien
- **Registrasi mandiri** khusus akun pasien (`/register`) & pengelolaan profil pribadi (`/profile`).
- **Reservasi janji temu 3 langkah** (`/appointments/new`): Pilih Poliklinik → Pilih Dokter → Pilih Slot 30 Menit & Tanggal Kunjungan.
  - Deteksi otomatis slot yang **Sudah Dipesan** pada tanggal terpilih sebelum pengiriman form.
  - Validasi kecocokan hari praktik dokter dan penolakan tanggal masa lampau.
- **Pembatalan mandiri** untuk janji temu yang masih berstatus `Pending`.
- **Riwayat medis & pelacakan resep** (`/medical-records`, `/pharmacy`): memantau diagnosis, tindakan medis, dan status penyiapan obat secara langsung.
- **Ulasan & Rating (1–5 Bintang)** pada janji temu yang telah `Selesai`.
- **Notifikasi in-app** (`/notifications`) saat janji disetujui/ditolak dan saat resep obat siap diambil di loket farmasi.

### 3. Dokter
- **Manajemen jadwal praktik mandiri** (`/schedules`):
  - Durasi wajib tepat **30 menit** pada kelipatan menit `:00` atau `:30`.
  - Pencegahan otomatis jadwal bentrok di hari dan jam yang sama.
- **Verifikasi permohonan janji temu** (`/appointments`): menyetujui (`Approved`) atau menolak (`Rejected` dengan alasan wajib) janji temu yang ditujukan kepadanya.
- **Pencatatan Rekam Medis & Resep Obat** (`/medical-records`):
  - Tersimpan dalam satu transaksi database (`BEGIN ... COMMIT`).
  - Hanya menampilkan obat yang stoknya tersedia dan belum kadaluarsa.
  - Rekam medis bersifat **permanen** (tidak dapat diubah maupun dihapus).

### 4. Admin
- **Dashboard Operasional** (`/dashboard`): ringkasan janji `Pending`, antrean farmasi aktif, jadwal dokter hari ini, dan statistik pengguna per peran.
- **Manajemen Pengguna** (`/users`): CRUD akun Admin, Dokter (terhubung ke Poliklinik), dan Pasien.
- **Manajemen Poliklinik** (`/polyclinics`): CRUD unit poliklinik beserta pencegahan penghapusan poli yang masih memiliki dokter aktif.
- **Manajemen Gudang Obat** (`/medicines`): CRUD obat (`biasa`/`keras`), pemantauan stok fisik, serta filter **Tersedia**, **Tidak Tersedia**, dan **Kadaluarsa** melalui view `v_status_obat`.
- **Manajemen Antrean Farmasi** (`/pharmacy`): memproses status resep `Menunggu Diproses` → `Siap Diambil` (otomatis memotong stok gudang) → `Sudah Diambil`.

---

## Arsitektur Database & Trigger (`rumah_sakit.sql`)

Seluruh skema menggunakan penamaan tabel Bahasa Inggris dengan Primary Key bertipe `UUID`:

- **Tabel Utama**: `users`, `polyclinics`, `doctors`, `patients`, `doctor_schedules`, `appointments`, `medicines`, `medical_records`, `prescriptions`, `prescription_items`, `notifications`, `feedbacks`.
- **Database View**: `v_status_obat` — mengklasifikasikan status obat secara otomatis menjadi `'kadaluarsa'`, `'tersedia'`, atau `'tidak tersedia'`.
- **PL/pgSQL Triggers & Constraints**:
  1. `trg_doctors_role` & `trg_patients_role` (`fn_check_profile_role`): memastikan konsistensi profil dokter/pasien terhadap `users.role`.
  2. `trg_appointment_before_insert` & `trg_appointment_status_rules`: memvalidasi tanggal, kecocokan hari jadwal, jadwal aktif, dan alur transisi status janji (`Pending` → `Approved`/`Rejected`/`Dibatalkan`; `Approved` → `Selesai`).
  3. `trg_rekam_medis_permanen`: menolak setiap operasi `UPDATE` dan `DELETE` pada tabel `medical_records`.
  4. `trg_medical_record_before_insert` & `trg_medical_record_after_insert`: memastikan rekam medis hanya dibuat dari janji `Approved`, lalu otomatis mengubah status janji menjadi `Selesai` dan membuat header `prescriptions` (`Menunggu Diproses`).
  5. `trg_prescription_item_rules` & `trg_prescription_status_rules`: menolak peresepan obat kadaluarsa dan memotong stok obat secara atomik saat status resep berubah ke `Siap Diambil` (membatalkan transaksi bila stok tidak mencukupi).
  6. `trg_feedback_rules`: memastikan ulasan hanya dapat diberikan pada janji temu berstatus `Selesai`.

---

## Struktur Direktori

```text
hospital-management-system/
├── public/                 # Aset statis & logo rumah sakit
├── src/
│   ├── app/
│   │   ├── (public)/       # Halaman publik (/login, /register, /poli, /doctors)
│   │   ├── (dashboard)/    # Halaman terproteksi per peran (/dashboard, /appointments, dll.)
│   │   ├── api/            # Route Handlers REST API (JSON + helper apiError)
│   │   ├── forbidden/      # Halaman error 403 (Akses Ditolak)
│   │   ├── maintenance/    # Halaman statis 503 (Pemeliharaan Sistem)
│   │   ├── error.js        # Runtime Error Boundary (500)
│   │   ├── global-error.js # Root Layout Error Boundary
│   │   └── not-found.js    # Halaman 404 Kustom
│   ├── components/         # Komponen UI reusable (Navbar, Sidebar, Modal, ErrorState, EKG/Shader)
│   └── lib/                # Koneksi PostgreSQL (db.js), sesi auth, validasi, & apiError
└── rumah_sakit.sql         # Skema lengkap DDL, View, Trigger, & data awal PostgreSQL
```

---

## Cara Menjalankan secara Lokal

### 1. Prasyarat
- **Node.js** 18.18+ (disarankan Node.js 20 LTS)
- **PostgreSQL** 13+

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Persiapan Database PostgreSQL
Buat database `rumah_sakit` (jika belum ada) dan impor skema dari `rumah_sakit.sql`:
```bash
createdb -U postgres rumah_sakit
psql -U postgres -d rumah_sakit -f rumah_sakit.sql
```

### 4. Konfigurasi Environment (`.env.local`)
Buat file `.env.local` di root proyek:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rumah_sakit"
SESSION_SECRET="ganti-dengan-secret-acak-minimal-32-karakter"
```

### 5. Menjalankan Aplikasi
```bash
# Mode pengembangan
npm run dev

# Build & jalankan mode produksi
npm run build
npm start
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## Akun Bawaan (Seed Accounts)

| Peran | Email / Username | Password | Nama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@rumahsakit.local` / `admin` | `admin123` | Administrator |
| **Dokter** | `dr.sarah@rumahsakit.local` / `dr_sarah` | `dokter123` | Dr. Sarah Wijaya, Sp.PD |
| **Dokter** | `dr.budi@rumahsakit.local` / `dr_budi` | `dokter123` | Drg. Budi Santoso, Sp.KG |
| **Dokter** | `dr.rina@rumahsakit.local` | `dokter123` | Dr. Rina Maharani, Sp.JP |
| **Pasien** | `john@email.com` / `johndoe` | `pasien123` | John Doe |
| **Pasien** | `jane@email.com` | `pasien123` | Jane Smith |
