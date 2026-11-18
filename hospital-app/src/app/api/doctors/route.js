import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const polyclinic_id = searchParams.get('polyclinic_id') || searchParams.get('poli_id');

    let sql = `
      SELECT d.user_id as id, d.user_id as doctor_id, d.poli_id,
             u.nama_lengkap as name, u.nama_lengkap, u.email, u.telepon as phone, u.telepon,
             p.nama_poli, p.nama_poli as polyclinic_name, p.ikon,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', jd.id,
                   'day', jd.hari,
                   'hari', jd.hari,
                   'start_time', jd.jam_mulai,
                   'jam_mulai', jd.jam_mulai,
                   'end_time', jd.jam_selesai,
                   'jam_selesai', jd.jam_selesai
                 ) ORDER BY jd.hari, jd.jam_mulai
               ) FILTER (WHERE jd.id IS NOT NULL), '[]'
             ) as schedules
      FROM dokter d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN poli p ON d.poli_id = p.id
      LEFT JOIN jadwal_dokter jd ON jd.dokter_id = d.user_id
    `;
    const params = [];

    if (polyclinic_id) {
      params.push(polyclinic_id);
      sql += ` WHERE d.poli_id = $${params.length}`;
    }

    sql += ' GROUP BY d.user_id, d.poli_id, u.nama_lengkap, u.email, u.telepon, p.nama_poli, p.ikon ORDER BY u.nama_lengkap ASC';

    const result = await query(sql, params);
    return NextResponse.json({ doctors: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get doctors error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
