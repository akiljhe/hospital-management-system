import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT d.user_id as id, d.user_id as doctor_id, d.poli_id,
              u.nama_lengkap as name, u.nama_lengkap, u.email, u.telepon as phone, u.telepon, u.alamat,
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
       WHERE d.user_id = $1
       GROUP BY d.user_id, d.poli_id, u.nama_lengkap, u.email, u.telepon, u.alamat, p.nama_poli, p.ikon`,
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
