import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT d.id as doctor_id, d.id, d.user_id, d.polyclinic_id, d.specialization,
              u.name, u.name as nama_lengkap, u.email, u.phone, u.phone as telepon, u.address, u.address as alamat,
              p.name as polyclinic_name, p.name as nama_poli, p.icon as ikon,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ds.id,
                    'day', ds.day,
                    'hari', ds.day,
                    'start_time', ds.start_time,
                    'jam_mulai', ds.start_time,
                    'end_time', ds.end_time,
                    'jam_selesai', ds.end_time,
                    'is_active', ds.is_active
                  ) ORDER BY ds.day, ds.start_time
                ) FILTER (WHERE ds.id IS NOT NULL), '[]'
              ) as schedules
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
       LEFT JOIN doctor_schedules ds ON ds.doctor_id = d.id
       WHERE d.id::text = $1 OR d.user_id::text = $1
       GROUP BY d.id, d.user_id, d.polyclinic_id, d.specialization, u.name, u.email, u.phone, u.address, p.name, p.icon`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Dokter tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ doctor: result.rows[0] });
  } catch (error) {
    console.error('Get doctor error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
