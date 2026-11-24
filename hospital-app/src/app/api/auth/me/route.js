import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 200 });
    }

    let roleData = {};

    if (user.role === 'dokter') {
      const result = await query(
        `SELECT d.user_id as doctor_id, d.poli_id, p.nama_poli as polyclinic_name, p.nama_poli
         FROM dokter d
         LEFT JOIN poli p ON d.poli_id = p.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (result.rows.length > 0) {
        roleData = result.rows[0];
      }
    } else if (user.role === 'pasien') {
      roleData = {
        patient_id: user.id,
      };
    }

    return NextResponse.json({ user: { ...user, name: user.nama_lengkap, ...roleData } });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
