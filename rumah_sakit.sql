-- =====================================================================
-- DIGITALISASI RUMAH SAKIT - Skema final
-- Tugas Final Praktikum Pemrograman Web 2026 (Individual Project 3)
--
-- Syarat: PostgreSQL 13 atau lebih baru (memakai gen_random_uuid).
-- Cara menjalankan (dari folder proyek):
--   createdb rumah_sakit_v2
--   psql -U postgres -d rumah_sakit_v2 -f db/hospital_final.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- BERSIH-BERSIH (urutan aman untuk database kosong maupun yang sudah ada)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_status_obat;

DROP TABLE IF EXISTS feedbacks, notifications, prescription_items, prescriptions,
  medical_records, appointments, doctor_schedules, medicines, patients, doctors,
  polyclinics, users CASCADE;

DROP FUNCTION IF EXISTS fn_hari(DATE);
DROP FUNCTION IF EXISTS fn_check_profile_role();
DROP FUNCTION IF EXISTS fn_appointment_before_insert();
DROP FUNCTION IF EXISTS fn_appointment_status_rules();
DROP FUNCTION IF EXISTS fn_notify_appointment();
DROP FUNCTION IF EXISTS fn_rekam_medis_permanen();
DROP FUNCTION IF EXISTS fn_medical_record_before_insert();
DROP FUNCTION IF EXISTS fn_medical_record_after_insert();
DROP FUNCTION IF EXISTS fn_prescription_item_rules();
DROP FUNCTION IF EXISTS fn_prescription_status_rules();
DROP FUNCTION IF EXISTS fn_notify_resep_siap();
DROP FUNCTION IF EXISTS fn_feedback_rules();


-- ---------------------------------------------------------------------
-- 1. USERS (Admin, Dokter, Pasien)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  role        VARCHAR(10)  NOT NULL DEFAULT 'pasien'
              CHECK (role IN ('admin', 'dokter', 'pasien')),
  phone       VARCHAR(20),
  address     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 2. POLI (CRUD oleh Admin, nama harus unik)
-- ---------------------------------------------------------------------
CREATE TABLE polyclinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(255),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 3. DOKTER dan PASIEN (profil yang terhubung ke users)
-- ---------------------------------------------------------------------
CREATE TABLE doctors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  polyclinic_id UUID NOT NULL REFERENCES polyclinics(id) ON DELETE RESTRICT,
  specialization VARCHAR(255),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);

CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender        VARCHAR(20),
  blood_type    VARCHAR(5),
  allergies     TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 4. JADWAL DOKTER
--    Durasi tetap 30 menit. Jam mulai harus kelipatan 30 menit, sehingga
--    dua jadwal bentrok hanya mungkin jika jam mulainya sama, dan itu
--    sudah dicegah oleh UNIQUE. Jadi tidak diperlukan trigger tambahan.
-- ---------------------------------------------------------------------
CREATE TABLE doctor_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day         VARCHAR(10) NOT NULL
              CHECK (day IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_durasi_30_menit CHECK (end_time = start_time + INTERVAL '30 minutes'),
  CONSTRAINT chk_slot_30_menit   CHECK (EXTRACT(MINUTE FROM start_time) IN (0, 30)
                                        AND EXTRACT(SECOND FROM start_time) = 0),
  CONSTRAINT uq_jadwal_slot      UNIQUE (doctor_id, day, start_time),
  CONSTRAINT uq_jadwal_id_dokter UNIQUE (id, doctor_id)
);


-- ---------------------------------------------------------------------
-- 5. JANJI TEMU
--    Status: Pending -> Approved/Rejected; Approved -> Selesai;
--            Pending -> Dibatalkan (oleh pasien)
-- ---------------------------------------------------------------------
CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  schedule_id       UUID NOT NULL,
  appointment_date  DATE NOT NULL,
  complaint         TEXT NOT NULL,
  status            VARCHAR(12) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending','Approved','Rejected','Selesai','Dibatalkan')),
  rejection_reason  TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_janji_jadwal FOREIGN KEY (schedule_id, doctor_id)
      REFERENCES doctor_schedules(id, doctor_id) ON DELETE RESTRICT,
  CONSTRAINT uq_janji_pasien_dokter UNIQUE (id, patient_id, doctor_id),
  CONSTRAINT chk_alasan_tolak CHECK (status <> 'Rejected' OR rejection_reason IS NOT NULL)
);

-- Satu slot hanya boleh dipesan sekali per tanggal, selama belum ditolak atau dibatalkan.
CREATE UNIQUE INDEX uq_janji_slot_aktif
  ON appointments (schedule_id, appointment_date)
  WHERE status IN ('Pending', 'Approved', 'Selesai');

CREATE INDEX idx_janji_dokter_tanggal ON appointments (doctor_id, appointment_date, status);
CREATE INDEX idx_janji_pasien         ON appointments (patient_id, created_at);


-- ---------------------------------------------------------------------
-- 6. OBAT
-- ---------------------------------------------------------------------
CREATE TABLE medicines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  type        VARCHAR(10) NOT NULL DEFAULT 'biasa' CHECK (type IN ('keras', 'biasa')),
  unit        VARCHAR(50) NOT NULL DEFAULT 'tablet',
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image       VARCHAR(255),
  expiry_date DATE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obat_nama ON medicines (name);

-- Status obat untuk filter: kadaluarsa, tidak tersedia, atau tersedia.
CREATE VIEW v_status_obat AS
SELECT m.*,
       CASE
         WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 'kadaluarsa'
         WHEN m.stock > 0 THEN 'tersedia'
         ELSE 'tidak tersedia'
       END AS status_obat
FROM medicines m;


-- ---------------------------------------------------------------------
-- 7. REKAM MEDIS (permanen, dijaga trigger)
-- ---------------------------------------------------------------------
CREATE TABLE medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL UNIQUE,
  patient_id      UUID NOT NULL,
  doctor_id       UUID NOT NULL,
  diagnosis       TEXT NOT NULL,
  treatment       TEXT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rekam_janji FOREIGN KEY (appointment_id, patient_id, doctor_id)
      REFERENCES appointments(id, patient_id, doctor_id) ON DELETE RESTRICT
);

CREATE INDEX idx_rekam_pasien ON medical_records (patient_id, created_at);
CREATE INDEX idx_rekam_dokter ON medical_records (doctor_id, created_at);


-- ---------------------------------------------------------------------
-- 8. RESEP (header, satu per rekam medis)
--    Status: Menunggu Diproses -> Siap Diambil -> Sudah Diambil
-- ---------------------------------------------------------------------
CREATE TABLE prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL UNIQUE REFERENCES medical_records(id) ON DELETE RESTRICT,
  status            VARCHAR(20) NOT NULL DEFAULT 'Menunggu Diproses'
                    CHECK (status IN ('Menunggu Diproses', 'Siap Diambil', 'Sudah Diambil')),
  ready_at          TIMESTAMP,
  collected_at      TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_waktu_resep CHECK (
       (status = 'Menunggu Diproses' AND ready_at IS NULL AND collected_at IS NULL)
    OR (status = 'Siap Diambil'      AND ready_at IS NOT NULL AND collected_at IS NULL)
    OR (status = 'Sudah Diambil'     AND ready_at IS NOT NULL AND collected_at IS NOT NULL)
  )
);

CREATE INDEX idx_resep_status ON prescriptions (status);


-- ---------------------------------------------------------------------
-- 9. ITEM RESEP (obat dan jumlah, bisa lebih dari satu)
-- ---------------------------------------------------------------------
CREATE TABLE prescription_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
  medicine_id     UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  dosage          VARCHAR(255),
  instructions    TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_resep_obat UNIQUE (prescription_id, medicine_id)
);


-- ---------------------------------------------------------------------
-- 10. NOTIFIKASI IN-APP
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(150) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL DEFAULT 'info',
  related_id  UUID,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  link         TEXT
);

CREATE INDEX idx_notifikasi_user ON notifications (user_id, is_read);


-- ---------------------------------------------------------------------
-- 11. ULASAN DAN RATING (fitur opsional, hanya untuk janji Selesai)
-- ---------------------------------------------------------------------
CREATE TABLE feedbacks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- FUNGSI BANTU
-- =====================================================================

-- Mengembalikan nama hari dalam Bahasa Indonesia dari sebuah tanggal.
CREATE FUNCTION fn_hari(p_tanggal DATE) RETURNS VARCHAR AS $$
  SELECT CASE EXTRACT(ISODOW FROM p_tanggal)::INT
    WHEN 1 THEN 'Senin'
    WHEN 2 THEN 'Selasa'
    WHEN 3 THEN 'Rabu'
    WHEN 4 THEN 'Kamis'
    WHEN 5 THEN 'Jumat'
    WHEN 6 THEN 'Sabtu'
    ELSE 'Minggu'
  END;
$$ LANGUAGE SQL IMMUTABLE;


-- =====================================================================
-- TRIGGER
-- =====================================================================

-- A. Profil dokter hanya untuk user ber-role dokter, dan profil pasien hanya untuk role pasien.
CREATE FUNCTION fn_check_profile_role() RETURNS trigger AS $$
DECLARE
  v_role VARCHAR(10);
BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.user_id;

  IF TG_TABLE_NAME = 'doctors' AND v_role <> 'dokter' THEN
    RAISE EXCEPTION 'User % bukan berperan dokter', NEW.user_id;
  END IF;

  IF TG_TABLE_NAME = 'patients' AND v_role <> 'pasien' THEN
    RAISE EXCEPTION 'User % bukan berperan pasien', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doctors_role
  BEFORE INSERT OR UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION fn_check_profile_role();

CREATE TRIGGER trg_patients_role
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION fn_check_profile_role();


-- B. Janji temu baru: status selalu Pending, tanggal tidak boleh lampau,
--    tanggal harus sesuai hari pada jadwal, dan jadwal harus aktif.
CREATE FUNCTION fn_appointment_before_insert() RETURNS trigger AS $$
DECLARE
  v_hari   VARCHAR(10);
  v_aktif  BOOLEAN;
BEGIN
  NEW.status := 'Pending';
  NEW.rejection_reason := NULL;

  IF NEW.appointment_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Tanggal janji temu tidak boleh di masa lalu';
  END IF;

  SELECT day, is_active INTO v_hari, v_aktif
  FROM doctor_schedules WHERE id = NEW.schedule_id;

  IF NOT v_aktif THEN
    RAISE EXCEPTION 'Jadwal dokter tidak aktif';
  END IF;

  IF v_hari IS DISTINCT FROM fn_hari(NEW.appointment_date) THEN
    RAISE EXCEPTION 'Tanggal % jatuh pada hari %, sedangkan jadwal dokter ini pada hari %',
      NEW.appointment_date, fn_hari(NEW.appointment_date), v_hari;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_before_insert
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_appointment_before_insert();


-- C. Perpindahan status janji temu hanya boleh sesuai alur.
CREATE FUNCTION fn_appointment_status_rules() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'Pending'  AND NEW.status IN ('Approved', 'Rejected', 'Dibatalkan'))
    OR (OLD.status = 'Approved' AND NEW.status = 'Selesai')
  ) THEN
    RAISE EXCEPTION 'Perubahan status janji temu dari % ke % tidak diizinkan', OLD.status, NEW.status;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_status_rules
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_appointment_status_rules();


-- D. Notifikasi janji temu.
--    Dokter diberi tahu saat janji baru masuk.
--    Pasien diberi tahu saat janji disetujui atau ditolak.
CREATE FUNCTION fn_notify_appointment() RETURNS trigger AS $$
DECLARE
  v_user_pasien UUID;
  v_nama_pasien VARCHAR(255);
  v_user_dokter UUID;
  v_nama_dokter VARCHAR(255);
BEGIN
  SELECT p.user_id, u.name INTO v_user_pasien, v_nama_pasien
  FROM patients p JOIN users u ON u.id = p.user_id
  WHERE p.id = NEW.patient_id;

  SELECT d.user_id, u.name INTO v_user_dokter, v_nama_dokter
  FROM doctors d JOIN users u ON u.id = d.user_id
  WHERE d.id = NEW.doctor_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (v_user_dokter, 'Janji Temu Baru',
            'Pasien ' || v_nama_pasien || ' mengajukan janji temu pada ' || NEW.appointment_date::TEXT || '.',
            'appointment', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'Approved' THEN
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (v_user_pasien, 'Janji Temu Disetujui',
              'Janji temu Anda dengan ' || v_nama_dokter || ' pada ' || NEW.appointment_date::TEXT || ' telah disetujui.',
              'appointment_approved', NEW.id);
    ELSIF NEW.status = 'Rejected' THEN
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (v_user_pasien, 'Janji Temu Ditolak',
              'Janji temu Anda dengan ' || v_nama_dokter || ' ditolak. Alasan: ' || NEW.rejection_reason,
              'appointment_rejected', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_notify_appointment();

CREATE TRIGGER trg_notify_appointment_update
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_notify_appointment();


-- E. Rekam medis bersifat permanen: tidak boleh diubah atau dihapus.
CREATE FUNCTION fn_rekam_medis_permanen() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Rekam medis bersifat permanen dan tidak dapat diubah atau dihapus';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rekam_medis_permanen
  BEFORE UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION fn_rekam_medis_permanen();


-- F. Rekam medis hanya boleh dibuat untuk janji berstatus Approved.
CREATE FUNCTION fn_medical_record_before_insert() RETURNS trigger AS $$
DECLARE
  v_status VARCHAR(12);
BEGIN
  SELECT status INTO v_status FROM appointments WHERE id = NEW.appointment_id FOR UPDATE;

  IF v_status IS DISTINCT FROM 'Approved' THEN
    RAISE EXCEPTION 'Rekam medis hanya dapat dibuat untuk janji temu berstatus Approved (saat ini: %)', v_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_before_insert
  BEFORE INSERT ON medical_records
  FOR EACH ROW EXECUTE FUNCTION fn_medical_record_before_insert();


-- G. Setelah rekam medis disimpan: janji menjadi Selesai dan resep dibuat
--    dengan status Menunggu Diproses. Semua dalam satu transaksi.
CREATE FUNCTION fn_medical_record_after_insert() RETURNS trigger AS $$
BEGIN
  UPDATE appointments SET status = 'Selesai' WHERE id = NEW.appointment_id;

  INSERT INTO prescriptions (medical_record_id, status)
  VALUES (NEW.id, 'Menunggu Diproses');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_after_insert
  AFTER INSERT ON medical_records
  FOR EACH ROW EXECUTE FUNCTION fn_medical_record_after_insert();


-- H. Item resep hanya bisa diubah selama resep masih Menunggu Diproses,
--    dan obat yang sudah kadaluarsa tidak boleh diresepkan.
CREATE FUNCTION fn_prescription_item_rules() RETURNS trigger AS $$
DECLARE
  v_status    VARCHAR(20);
  v_prescr_id UUID;
  v_expiry    DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_prescr_id := OLD.prescription_id;
  ELSE
    v_prescr_id := NEW.prescription_id;
  END IF;

  SELECT status INTO v_status FROM prescriptions WHERE id = v_prescr_id;

  IF v_status IS DISTINCT FROM 'Menunggu Diproses' THEN
    RAISE EXCEPTION 'Item resep tidak dapat diubah setelah resep diproses';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT expiry_date INTO v_expiry FROM medicines WHERE id = NEW.medicine_id;
  IF v_expiry IS NOT NULL AND v_expiry < CURRENT_DATE THEN
    RAISE EXCEPTION 'Obat sudah kadaluarsa dan tidak dapat diresepkan';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prescription_item_rules
  BEFORE INSERT OR UPDATE OR DELETE ON prescription_items
  FOR EACH ROW EXECUTE FUNCTION fn_prescription_item_rules();


-- I. Alur status resep. Saat Siap Diambil, stok dicek lalu dipotong
--    dalam satu transaksi. Jika ada obat yang stoknya kurang, seluruh
--    perubahan dibatalkan.
CREATE FUNCTION fn_prescription_status_rules() RETURNS trigger AS $$
DECLARE
  it RECORD;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'Menunggu Diproses' AND NEW.status = 'Siap Diambil')
    OR (OLD.status = 'Siap Diambil'      AND NEW.status = 'Sudah Diambil')
  ) THEN
    RAISE EXCEPTION 'Perubahan status resep dari % ke % tidak diizinkan', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'Siap Diambil' THEN
    FOR it IN
      SELECT medicine_id, quantity FROM prescription_items WHERE prescription_id = NEW.id
    LOOP
      PERFORM 1 FROM medicines
      WHERE id = it.medicine_id AND stock >= it.quantity
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok obat tidak mencukupi untuk resep ini';
      END IF;

      UPDATE medicines SET stock = stock - it.quantity, updated_at = NOW()
      WHERE id = it.medicine_id;
    END LOOP;

    NEW.ready_at := NOW();
  END IF;

  IF NEW.status = 'Sudah Diambil' THEN
    NEW.collected_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prescription_status_rules
  BEFORE UPDATE OF status ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION fn_prescription_status_rules();


-- J. Notifikasi ke pasien saat resep siap diambil di loket farmasi.
CREATE FUNCTION fn_notify_resep_siap() RETURNS trigger AS $$
DECLARE
  v_user_pasien UUID;
BEGIN
  IF NEW.status = 'Siap Diambil' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT p.user_id INTO v_user_pasien
    FROM medical_records mr JOIN patients p ON p.id = mr.patient_id
    WHERE mr.id = NEW.medical_record_id;

    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (v_user_pasien, 'Resep Siap Diambil',
            'Resep obat Anda sudah disiapkan dan siap diambil di loket farmasi.',
            'prescription_ready', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_resep_siap
  AFTER UPDATE OF status ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION fn_notify_resep_siap();


-- K. Ulasan hanya boleh untuk janji yang sudah Selesai.
CREATE FUNCTION fn_feedback_rules() RETURNS trigger AS $$
DECLARE
  v_status VARCHAR(12);
BEGIN
  SELECT status INTO v_status FROM appointments WHERE id = NEW.appointment_id;

  IF v_status IS DISTINCT FROM 'Selesai' THEN
    RAISE EXCEPTION 'Ulasan hanya dapat diberikan untuk janji temu yang sudah Selesai';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feedback_rules
  BEFORE INSERT ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION fn_feedback_rules();


-- =====================================================================
-- DATA AWAL
--  Catatan password: kolom password berisi placeholder. Setelah database
--  dibuat, isi dengan hash bcrypt (lihat README atau langkah di bawah file).
-- =====================================================================

-- Users
INSERT INTO users (id, email, password, name, role, phone) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@rumahsakit.local', 'GANTI_DENGAN_HASH_BCRYPT',
   'Administrator', 'admin', '081200000001'),
  ('d0000000-0000-0000-0000-000000000001', 'dr.sarah@rumahsakit.local', 'GANTI_DENGAN_HASH_BCRYPT',
   'Dr. Sarah Wijaya, Sp.PD', 'dokter', '081200000002'),
  ('d0000000-0000-0000-0000-000000000002', 'dr.budi@rumahsakit.local', 'GANTI_DENGAN_HASH_BCRYPT',
   'Drg. Budi Santoso, Sp.KG', 'dokter', '081200000003'),
  ('d0000000-0000-0000-0000-000000000003', 'dr.rina@rumahsakit.local', 'GANTI_DENGAN_HASH_BCRYPT',
   'Dr. Rina Maharani, Sp.JP', 'dokter', '081200000004'),
  ('b0000000-0000-0000-0000-000000000001', 'john@email.com', 'GANTI_DENGAN_HASH_BCRYPT',
   'John Doe', 'pasien', '081200000005'),
  ('b0000000-0000-0000-0000-000000000002', 'jane@email.com', 'GANTI_DENGAN_HASH_BCRYPT',
   'Jane Smith', 'pasien', '081200000006');

-- Poli
INSERT INTO polyclinics (id, name, description, icon) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Poli Umum',
   'Pemeriksaan kesehatan umum dan pengobatan dasar', 'stethoscope'),
  ('e0000000-0000-0000-0000-000000000002', 'Poli Gigi',
   'Perawatan dan pemeriksaan kesehatan gigi dan mulut', 'tooth'),
  ('e0000000-0000-0000-0000-000000000003', 'Poli Anak',
   'Pelayanan kesehatan untuk bayi, balita, dan anak', 'baby'),
  ('e0000000-0000-0000-0000-000000000004', 'Poli Jantung',
   'Pelayanan kesehatan jantung dan pembuluh darah', 'heart');

-- Profil dokter
INSERT INTO doctors (id, user_id, polyclinic_id, specialization) VALUES
  ('dc000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001', 'Dokter Umum'),
  ('dc000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000002', 'Dokter Gigi'),
  ('dc000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000004', 'Spesialis Jantung');

-- Profil pasien
INSERT INTO patients (id, user_id, date_of_birth, gender, blood_type, allergies) VALUES
  ('ba000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '1990-05-15', 'Laki-laki', 'O+', 'Tidak ada'),
  ('ba000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   '1995-08-22', 'Perempuan', 'A+', 'Penisilin');

-- Jadwal dokter (durasi 30 menit, jam mulai kelipatan 30 menit)
INSERT INTO doctor_schedules (doctor_id, day, start_time, end_time) VALUES
  -- dr. Sarah (Poli Umum)
  ('dc000000-0000-0000-0000-000000000001', 'Senin',  '08:00', '08:30'),
  ('dc000000-0000-0000-0000-000000000001', 'Senin',  '08:30', '09:00'),
  ('dc000000-0000-0000-0000-000000000001', 'Senin',  '09:00', '09:30'),
  ('dc000000-0000-0000-0000-000000000001', 'Rabu',   '08:00', '08:30'),
  ('dc000000-0000-0000-0000-000000000001', 'Rabu',   '08:30', '09:00'),
  ('dc000000-0000-0000-0000-000000000001', 'Jumat',  '10:00', '10:30'),
  ('dc000000-0000-0000-0000-000000000001', 'Jumat',  '10:30', '11:00'),
  -- drg. Budi (Poli Gigi)
  ('dc000000-0000-0000-0000-000000000002', 'Selasa', '09:00', '09:30'),
  ('dc000000-0000-0000-0000-000000000002', 'Selasa', '09:30', '10:00'),
  ('dc000000-0000-0000-0000-000000000002', 'Kamis',  '09:00', '09:30'),
  -- dr. Rina (Poli Jantung)
  ('dc000000-0000-0000-0000-000000000003', 'Senin',  '13:00', '13:30'),
  ('dc000000-0000-0000-0000-000000000003', 'Rabu',   '13:00', '13:30'),
  ('dc000000-0000-0000-0000-000000000003', 'Jumat',  '13:00', '13:30');

-- Obat (stok 0 dan kadaluarsa sengaja disertakan untuk menguji filter)
INSERT INTO medicines (name, description, type, unit, stock, expiry_date) VALUES
  ('Paracetamol 500mg', 'Pereda nyeri dan penurun demam',        'biasa', 'tablet', 500, '2027-12-31'),
  ('Amoxicillin 500mg', 'Antibiotik spektrum luas',              'keras', 'kapsul', 300, '2027-06-30'),
  ('Omeprazole 20mg',   'Obat lambung penghambat pompa proton',  'keras', 'kapsul', 200, '2027-09-30'),
  ('Cetirizine 10mg',   'Antihistamin untuk alergi',             'biasa', 'tablet', 400, '2027-10-31'),
  ('Metformin 500mg',   'Obat diabetes tipe 2',                  'keras', 'tablet', 250, '2027-08-31'),
  ('Amlodipine 5mg',    'Obat tekanan darah tinggi',             'keras', 'tablet', 180, '2027-11-30'),
  ('Vitamin C 1000mg',  'Suplemen vitamin C',                    'biasa', 'tablet', 600, '2028-01-31'),
  ('Antasida Doen',     'Obat maag kombinasi',                   'biasa', 'tablet',   0, '2027-04-30'),
  ('Simvastatin 20mg',  'Obat penurun kolesterol',               'keras', 'tablet', 150, '2026-03-15');

