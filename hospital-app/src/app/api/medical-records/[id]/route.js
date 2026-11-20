import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const result = await query(
      `SELECT rm.id, rm.janji_temu_id, rm.pasien_id, rm.dokter_id,
              rm.diagnosis, rm.tindakan_medis, rm.tindakan_medis as tindakan, rm.catatan, rm.created_at,
              u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone, u_pat.alamat as patient_address,
              u_doc.nama_lengkap as doctor_name,
              p.nama_poli as polyclinic_name,
              jt.tanggal_booking as appointment_date,
              r.id as prescription_id, r.status as prescription_status, r.tanggal_siap, r.tanggal_diambil,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ri.id,
                    'obat_id', ri.obat_id,
                    'nama_obat', o.nama_obat,
                    'jumlah', ri.jumlah,
                    'tipe', o.tipe
                  )
                ) FILTER (WHERE ri.id IS NOT NULL), '[]'
              ) as prescription_items
       FROM rekam_medis rm
       JOIN users u_pat ON rm.pasien_id = u_pat.id
       JOIN users u_doc ON rm.dokter_id = u_doc.id
       JOIN dokter d ON rm.dokter_id = d.user_id
       LEFT JOIN poli p ON d.poli_id = p.id
       JOIN janji_temu jt ON rm.janji_temu_id = jt.id
       LEFT JOIN resep r ON r.rekam_medis_id = rm.id
       LEFT JOIN resep_item ri ON ri.resep_id = r.id
       LEFT JOIN obat o ON ri.obat_id = o.id
       WHERE rm.id = $1
       GROUP BY rm.id, u_pat.nama_lengkap, u_pat.telepon, u_pat.alamat, u_doc.nama_lengkap, p.nama_poli, jt.tanggal_booking, r.id, r.status, r.tanggal_siap, r.tanggal_diambil`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Rekam medis tidak ditemukan' }, { status: 404 });
    }

    const record = result.rows[0];

    // Otorisasi
    if (auth.user.role === 'pasien' && record.pasien_id !== auth.user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (auth.user.role === 'dokter' && record.dokter_id !== auth.user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Get medical record detail error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Rekam medis bersifat permanen dan tidak dapat diubah' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Rekam medis bersifat permanen dan tidak dapat dihapus' },
    { status: 405 }
  );
}
