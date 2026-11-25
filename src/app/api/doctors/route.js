import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const polyclinic_id = searchParams.get('polyclinic_id') || searchParams.get('poli_id');

    let sql = `
      SELECT d.id, d.id as doctor_id, d.user_id, d.polyclinic_id as poli_id, d.polyclinic_id,
             u.name, u.name as nama_lengkap, u.email, u.phone as telepon, u.phone,
             p.name as nama_poli, p.name as polyclinic_name, p.icon as ikon,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ds.id,
                   'day', ds.day,
                   'hari', ds.day,
                   'start_time', ds.start_time,
                   'jam_mulai', ds.start_time,
                   'end_time', ds.end_time,
                   'jam_selesai', ds.end_time
                 ) ORDER BY ds.day, ds.start_time
               ) FILTER (WHERE ds.id IS NOT NULL), '[]'
             ) as schedules
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
      LEFT JOIN doctor_schedules ds ON ds.doctor_id = d.id AND ds.is_active = TRUE
    `;
    const params = [];

    if (polyclinic_id) {
      params.push(polyclinic_id);
      sql += ` WHERE d.polyclinic_id = $${params.length}`;
    }

    sql += ' GROUP BY d.id, d.user_id, d.polyclinic_id, u.name, u.email, u.phone, p.name, p.icon ORDER BY u.name ASC';

    const result = await query(sql, params);
    return NextResponse.json({ doctors: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get doctors error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
