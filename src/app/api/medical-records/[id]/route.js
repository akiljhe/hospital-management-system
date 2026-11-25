import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    const result = await query(
      `SELECT mr.id, mr.appointment_id as janji_temu_id, mr.patient_id as pasien_id, mr.doctor_id as dokter_id,
              mr.diagnosis, mr.treatment as tindakan_medis, mr.treatment as tindakan, mr.notes as catatan, mr.created_at,
              u_pat.name as patient_name, u_pat.name as nama_lengkap, u_pat.phone as patient_phone, u_pat.phone as telepon, u_pat.address as patient_address, u_pat.address as alamat,
              u_doc.name as doctor_name,
              p.name as polyclinic_name, p.name as nama_poli,
              a.appointment_date as appointment_date, a.appointment_date as tanggal_booking,
              pr.id as prescription_id, pr.status as prescription_status, pr.ready_at as tanggal_siap, pr.collected_at as tanggal_diambil,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', pri.id,
                    'obat_id', pri.medicine_id,
                    'medicine_id', pri.medicine_id,
                    'nama_obat', m.name,
                    'medicine_name', m.name,
                    'jumlah', pri.quantity,
                    'quantity', pri.quantity,
                    'tipe', m.type,
                    'dosage', pri.dosage
                  )
                ) FILTER (WHERE pri.id IS NOT NULL), '[]'
              ) as prescription_items
       FROM medical_records mr
       JOIN patients pat ON mr.patient_id = pat.id
       JOIN users u_pat ON pat.user_id = u_pat.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
       JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN prescriptions pr ON pr.medical_record_id = mr.id
       LEFT JOIN prescription_items pri ON pri.prescription_id = pr.id
       LEFT JOIN medicines m ON pri.medicine_id = m.id
       WHERE mr.id = $1
       GROUP BY mr.id, mr.appointment_id, mr.patient_id, mr.doctor_id, mr.diagnosis, mr.treatment, mr.notes, mr.created_at,
                u_pat.name, u_pat.phone, u_pat.address, u_doc.name, p.name, a.appointment_date, pr.id, pr.status, pr.ready_at, pr.collected_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Rekam medis tidak ditemukan');
    }

    const record = result.rows[0];

    // Otorisasi
    if (auth.user.role === 'pasien' && record.pasien_id !== auth.user.patient_id) {
      return apiError(403, 'Akses ditolak');
    }
    if (auth.user.role === 'dokter' && record.dokter_id !== auth.user.doctor_id) {
      return apiError(403, 'Akses ditolak');
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Get medical record detail error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PUT() {
  return apiError(405, 'Rekam medis bersifat permanen dan tidak dapat diubah');
}

export async function DELETE() {
  return apiError(405, 'Rekam medis bersifat permanen dan tidak dapat dihapus');
}
