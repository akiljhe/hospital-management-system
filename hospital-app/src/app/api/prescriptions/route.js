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
      SELECT r.id, r.medical_record_id as rekam_medis_id, r.medical_record_id, 
             r.status, r.ready_at as tanggal_siap, r.collected_at as tanggal_diambil, r.created_at,
             rm.diagnosis, rm.treatment as tindakan_medis, rm.notes as catatan,
             u_pat.id as patient_user_id, pat.id as patient_id, 
             u_pat.name as patient_name, u_pat.name as nama_pasien, u_pat.phone as patient_phone,
             u_doc.name as doctor_name, u_doc.name as nama_dokter,
             p.name as polyclinic_name, p.name as nama_poli,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'obat_id', pi.medicine_id,
                   'medicine_id', pi.medicine_id,
                   'nama_obat', m.name,
                   'name', m.name,
                   'tipe', m.type,
                   'type', m.type,
                   'stok', m.stock,
                   'stock', m.stock,
                   'jumlah', pi.quantity,
                   'quantity', pi.quantity
                 )
               ) FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) as items
      FROM prescriptions r
      JOIN medical_records rm ON r.medical_record_id = rm.id
      JOIN patients pat ON rm.patient_id = pat.id
      JOIN users u_pat ON pat.user_id = u_pat.id
      JOIN doctors d ON rm.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
      LEFT JOIN prescription_items pi ON pi.prescription_id = r.id
      LEFT JOIN medicines m ON pi.medicine_id = m.id
    `;
    const params = [];
    const whereClauses = [];

    if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      whereClauses.push(`pat.user_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`r.status = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ` GROUP BY r.id, rm.diagnosis, rm.treatment, rm.notes, u_pat.id, pat.id, u_pat.name, u_pat.phone, u_doc.name, p.name
             ORDER BY r.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ prescriptions: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
