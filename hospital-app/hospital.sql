-- ============================================================
-- HOSPITAL DIGITALIZATION DATABASE SCHEMA
-- Tugas Final Praktikum Pemrograman Web 2026
-- ============================================================

-- Drop tables if exist (in reverse dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS prescription_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS medical_records_archive CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS polyclinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'dokter', 'pasien');

DROP TYPE IF EXISTS appointment_status CASCADE;
CREATE TYPE appointment_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Selesai', 'Dibatalkan');

DROP TYPE IF EXISTS prescription_status CASCADE;
CREATE TYPE prescription_status AS ENUM ('Menunggu Diproses', 'Siap Diambil', 'Sudah Diambil');

DROP TYPE IF EXISTS day_of_week CASCADE;
CREATE TYPE day_of_week AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'pasien',
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: polyclinics
-- ============================================================
CREATE TABLE polyclinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT '🏥',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: doctors (extends users)
-- ============================================================
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    polyclinic_id UUID REFERENCES polyclinics(id) ON DELETE SET NULL,
    specialization VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: patients (extends users)
-- ============================================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_type VARCHAR(5),
    allergies TEXT,
    insurance_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: doctor_schedules
-- ============================================================
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure no overlapping schedules for same doctor on same day
    CONSTRAINT check_time_order CHECK (end_time > start_time),
    -- Each slot is 30 minutes
    CONSTRAINT check_slot_duration CHECK (end_time - start_time = INTERVAL '30 minutes')
);

-- ============================================================
-- TABLE: appointments
-- ============================================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    status appointment_status DEFAULT 'Pending',
    rejection_reason TEXT,
    queue_number INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- One slot cannot be booked twice on the same date
    CONSTRAINT unique_schedule_date UNIQUE (schedule_id, appointment_date)
);

-- ============================================================
-- TABLE: medical_records
-- ============================================================
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    diagnosis TEXT NOT NULL,
    symptoms TEXT,
    examination TEXT,
    treatment_plan TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: medical_records_archive (for archival trigger)
-- ============================================================
CREATE TABLE medical_records_archive (
    id UUID PRIMARY KEY,
    appointment_id UUID,
    patient_id UUID,
    doctor_id UUID,
    diagnosis TEXT,
    symptoms TEXT,
    examination TEXT,
    treatment_plan TEXT,
    notes TEXT,
    created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: medicines
-- ============================================================
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'tablet',
    price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: prescriptions
-- ============================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_id UUID UNIQUE NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    status prescription_status DEFAULT 'Menunggu Diproses',
    pharmacist_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: prescription_items
-- ============================================================
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    dosage VARCHAR(255),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    related_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_polyclinic ON doctors(polyclinic_id);
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);

-- ============================================================
-- TRIGGER: Archive medical record on INSERT (copy to archive)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_archive_medical_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO medical_records_archive (
        id, appointment_id, patient_id, doctor_id,
        diagnosis, symptoms, examination, treatment_plan, notes, created_at
    ) VALUES (
        NEW.id, NEW.appointment_id, NEW.patient_id, NEW.doctor_id,
        NEW.diagnosis, NEW.symptoms, NEW.examination, NEW.treatment_plan, NEW.notes, NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_medical_record
AFTER INSERT ON medical_records
FOR EACH ROW
EXECUTE FUNCTION fn_archive_medical_record();

-- ============================================================
-- TRIGGER: Auto-create prescription when medical record is created
-- (if doctor adds prescription items, they will be linked)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_auto_create_prescription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO prescriptions (medical_record_id, status)
    VALUES (NEW.id, 'Menunggu Diproses');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_prescription
AFTER INSERT ON medical_records
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_prescription();

-- ============================================================
-- TRIGGER: Update appointment status to 'Selesai' when medical record created
-- ============================================================
CREATE OR REPLACE FUNCTION fn_complete_appointment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE appointments SET status = 'Selesai', updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.appointment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complete_appointment
AFTER INSERT ON medical_records
FOR EACH ROW
EXECUTE FUNCTION fn_complete_appointment();

-- ============================================================
-- TRIGGER: Reduce medicine stock when prescription item added
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reduce_medicine_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE medicines SET stock = stock - NEW.quantity, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.medicine_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_medicine_stock
AFTER INSERT ON prescription_items
FOR EACH ROW
EXECUTE FUNCTION fn_reduce_medicine_stock();

-- ============================================================
-- TRIGGER: Create notification for appointment status changes
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_appointment_status()
RETURNS TRIGGER AS $$
DECLARE
    patient_user_id UUID;
    doctor_user_id UUID;
    patient_name VARCHAR;
    doctor_name VARCHAR;
BEGIN
    -- Get patient user_id
    SELECT u.id, u.name INTO patient_user_id, patient_name
    FROM patients p JOIN users u ON p.user_id = u.id
    WHERE p.id = NEW.patient_id;

    -- Get doctor user_id
    SELECT u.id, u.name INTO doctor_user_id, doctor_name
    FROM doctors d JOIN users u ON d.user_id = u.id
    WHERE d.id = NEW.doctor_id;

    IF TG_OP = 'INSERT' THEN
        -- Notify doctor about new appointment
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (doctor_user_id, 'Janji Temu Baru',
                'Pasien ' || patient_name || ' mengajukan janji temu baru.',
                'appointment', NEW.id);
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'Approved' THEN
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (patient_user_id, 'Janji Temu Disetujui',
                    'Janji temu Anda dengan Dr. ' || doctor_name || ' telah disetujui.',
                    'appointment_approved', NEW.id);
        ELSIF NEW.status = 'Rejected' THEN
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (patient_user_id, 'Janji Temu Ditolak',
                    'Janji temu Anda dengan Dr. ' || doctor_name || ' ditolak. Alasan: ' || COALESCE(NEW.rejection_reason, '-'),
                    'appointment_rejected', NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_appointment_insert
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_notify_appointment_status();

CREATE TRIGGER trg_notify_appointment_update
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_notify_appointment_status();

-- ============================================================
-- TRIGGER: Notify patient when prescription is ready
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_prescription_status()
RETURNS TRIGGER AS $$
DECLARE
    patient_user_id UUID;
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'Siap Diambil' THEN
        SELECT u.id INTO patient_user_id
        FROM prescriptions p
        JOIN medical_records mr ON p.medical_record_id = mr.id
        JOIN patients pat ON mr.patient_id = pat.id
        JOIN users u ON pat.user_id = u.id
        WHERE p.id = NEW.id;

        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (patient_user_id, 'Resep Siap Diambil',
                'Resep obat Anda sudah siap untuk diambil di farmasi.',
                'prescription_ready', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_prescription_status
AFTER UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION fn_notify_prescription_status();

-- ============================================================
-- FUNCTION: Check schedule overlap
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_schedule_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM doctor_schedules
        WHERE doctor_id = NEW.doctor_id
          AND day = NEW.day
          AND id != COALESCE(NEW.id, uuid_generate_v4())
          AND is_active = true
          AND (
              (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
              (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
              (NEW.start_time <= start_time AND NEW.end_time >= end_time)
          )
    ) THEN
        RAISE EXCEPTION 'Jadwal bentrok dengan jadwal yang sudah ada';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_schedule_overlap
BEFORE INSERT OR UPDATE ON doctor_schedules
FOR EACH ROW
EXECUTE FUNCTION fn_check_schedule_overlap();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: admin123)
INSERT INTO users (id, email, password, name, role, phone) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@hospital.com',
 '$2b$10$8KzaNdKIMyOkASCakNL0QOFgMOIIFJcHm5DKZO8JjhXzSiMa7LXS',
 'Administrator', 'admin', '081200000001');

-- Doctor users (password: dokter123)
INSERT INTO users (id, email, password, name, role, phone) VALUES
('d0000000-0000-0000-0000-000000000001', 'dr.sarah@hospital.com',
 '$2b$10$YR.c1w9V4FqZ1Y0Yp5yMSOWeJVR5RD7qL3TG0M/kJj5YVhGQs2NSm',
 'Dr. Sarah Wijaya', 'dokter', '081200000002'),
('d0000000-0000-0000-0000-000000000002', 'dr.budi@hospital.com',
 '$2b$10$YR.c1w9V4FqZ1Y0Yp5yMSOWeJVR5RD7qL3TG0M/kJj5YVhGQs2NSm',
 'Dr. Budi Santoso', 'dokter', '081200000003'),
('d0000000-0000-0000-0000-000000000003', 'dr.rina@hospital.com',
 '$2b$10$YR.c1w9V4FqZ1Y0Yp5yMSOWeJVR5RD7qL3TG0M/kJj5YVhGQs2NSm',
 'Dr. Rina Maharani', 'dokter', '081200000004');

-- Patient users (password: pasien123)
INSERT INTO users (id, email, password, name, role, phone, address) VALUES
('p0000000-0000-0000-0000-000000000001', 'john@email.com',
 '$2b$10$5vrz.GRnHJTgLxrpVElCO.0M2kFH2tEBc1A3/6g3JNCXRniT3S2Si',
 'John Doe', 'pasien', '081200000005', 'Jl. Merdeka No. 1, Jakarta'),
('p0000000-0000-0000-0000-000000000002', 'jane@email.com',
 '$2b$10$5vrz.GRnHJTgLxrpVElCO.0M2kFH2tEBc1A3/6g3JNCXRniT3S2Si',
 'Jane Smith', 'pasien', '081200000006', 'Jl. Sudirman No. 2, Jakarta');

-- Polyclinics
INSERT INTO polyclinics (id, name, description, icon) VALUES
('c0000000-0000-0000-0000-000000000001', 'Poli Umum', 'Pelayanan kesehatan umum untuk berbagai keluhan', '🩺'),
('c0000000-0000-0000-0000-000000000002', 'Poli Gigi', 'Pelayanan kesehatan gigi dan mulut', '🦷'),
('c0000000-0000-0000-0000-000000000003', 'Poli Anak', 'Pelayanan kesehatan khusus anak-anak', '👶'),
('c0000000-0000-0000-0000-000000000004', 'Poli Jantung', 'Pelayanan kesehatan jantung dan pembuluh darah', '❤️'),
('c0000000-0000-0000-0000-000000000005', 'Poli Mata', 'Pelayanan kesehatan mata', '👁️'),
('c0000000-0000-0000-0000-000000000006', 'Poli Kulit', 'Pelayanan kesehatan kulit dan kelamin', '🧴');

-- Doctors
INSERT INTO doctors (id, user_id, polyclinic_id, specialization, license_number) VALUES
('dc000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'Dokter Umum', 'SIP-001-2024'),
('dc000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
 'c0000000-0000-0000-0000-000000000002', 'Dokter Gigi', 'SIP-002-2024'),
('dc000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
 'c0000000-0000-0000-0000-000000000004', 'Spesialis Jantung', 'SIP-003-2024');

-- Patients
INSERT INTO patients (id, user_id, date_of_birth, gender, blood_type, allergies) VALUES
('pt000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001',
 '1990-05-15', 'Laki-laki', 'O+', 'Tidak ada'),
('pt000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000002',
 '1995-08-22', 'Perempuan', 'A+', 'Penisilin');

-- Doctor Schedules
INSERT INTO doctor_schedules (doctor_id, day, start_time, end_time) VALUES
-- Dr. Sarah (Umum) - Senin, Rabu, Jumat
('dc000000-0000-0000-0000-000000000001', 'Senin', '08:00', '08:30'),
('dc000000-0000-0000-0000-000000000001', 'Senin', '08:30', '09:00'),
('dc000000-0000-0000-0000-000000000001', 'Senin', '09:00', '09:30'),
('dc000000-0000-0000-0000-000000000001', 'Senin', '09:30', '10:00'),
('dc000000-0000-0000-0000-000000000001', 'Rabu', '08:00', '08:30'),
('dc000000-0000-0000-0000-000000000001', 'Rabu', '08:30', '09:00'),
('dc000000-0000-0000-0000-000000000001', 'Rabu', '09:00', '09:30'),
('dc000000-0000-0000-0000-000000000001', 'Jumat', '10:00', '10:30'),
('dc000000-0000-0000-0000-000000000001', 'Jumat', '10:30', '11:00'),
-- Dr. Budi (Gigi) - Selasa, Kamis
('dc000000-0000-0000-0000-000000000002', 'Selasa', '09:00', '09:30'),
('dc000000-0000-0000-0000-000000000002', 'Selasa', '09:30', '10:00'),
('dc000000-0000-0000-0000-000000000002', 'Selasa', '10:00', '10:30'),
('dc000000-0000-0000-0000-000000000002', 'Kamis', '09:00', '09:30'),
('dc000000-0000-0000-0000-000000000002', 'Kamis', '09:30', '10:00'),
-- Dr. Rina (Jantung) - Senin, Rabu, Jumat
('dc000000-0000-0000-0000-000000000003', 'Senin', '13:00', '13:30'),
('dc000000-0000-0000-0000-000000000003', 'Senin', '13:30', '14:00'),
('dc000000-0000-0000-0000-000000000003', 'Rabu', '13:00', '13:30'),
('dc000000-0000-0000-0000-000000000003', 'Rabu', '13:30', '14:00'),
('dc000000-0000-0000-0000-000000000003', 'Jumat', '13:00', '13:30');

-- Medicines
INSERT INTO medicines (name, description, unit, price, stock, expiry_date) VALUES
('Paracetamol 500mg', 'Obat pereda nyeri dan penurun demam', 'tablet', 2500, 500, '2027-12-31'),
('Amoxicillin 500mg', 'Antibiotik spektrum luas', 'kapsul', 5000, 300, '2027-06-30'),
('Omeprazole 20mg', 'Obat lambung penghambat pompa proton', 'kapsul', 8000, 200, '2027-09-30'),
('Cetirizine 10mg', 'Obat antihistamin untuk alergi', 'tablet', 3000, 400, '2027-10-31'),
('Metformin 500mg', 'Obat diabetes tipe 2', 'tablet', 4000, 250, '2027-08-31'),
('Amlodipine 5mg', 'Obat tekanan darah tinggi', 'tablet', 6000, 180, '2027-11-30'),
('Ibuprofen 400mg', 'Obat anti inflamasi non-steroid', 'tablet', 3500, 350, '2027-07-31'),
('Simvastatin 20mg', 'Obat penurun kolesterol', 'tablet', 7000, 150, '2026-03-15'),
('Salbutamol Inhaler', 'Obat asma inhalasi', 'pcs', 45000, 50, '2027-05-31'),
('Vitamin C 1000mg', 'Suplemen vitamin C', 'tablet', 1500, 600, '2028-01-31'),
('Antasida Doen', 'Obat maag kombinasi', 'tablet', 1000, 0, '2027-04-30'),
('Dexamethasone 0.5mg', 'Obat anti inflamasi steroid', 'tablet', 3000, 200, '2026-01-15');
