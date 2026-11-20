import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT r.id, r.rekam_medis_id, r.status, r.tanggal_siap, r.tanggal_diambil, r.created_at,
             rm.diagnosis, rm.tindakan_medis, rm.catatan,
             u_pat.id as patient_id, u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone,
             u_doc.nama_lengkap as doctor_name,
             p.nama_poli as polyclinic_name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ri.id,
                   'obat_id', ri.obat_id,
                   'nama_obat', o.nama_obat,
                   'tipe', o.tipe,
                   'stok', o.stok,
                   'jumlah', ri.jumlah
                 )
               ) FILTER (WHERE ri.id IS NOT NULL), '[]'
             ) as items
      FROM resep r
      JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
      JOIN users u_pat ON rm.pasien_id = u_pat.id
      JOIN users u_doc ON rm.dokter_id = u_doc.id
      JOIN dokter d ON rm.dokter_id = d.user_id
      LEFT JOIN poli p ON d.poli_id = p.id
      LEFT JOIN resep_item ri ON ri.resep_id = r.id
      LEFT JOIN obat o ON ri.obat_id = o.id
    `;
    const params = [];
    const whereClauses = [];

    if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      whereClauses.push(`rm.pasien_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`r.status = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ` GROUP BY r.id, rm.diagnosis, rm.tindakan_medis, rm.catatan, u_pat.id, u_pat.nama_lengkap, u_pat.telepon, u_doc.nama_lengkap, p.nama_poli
             ORDER BY r.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ prescriptions: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
