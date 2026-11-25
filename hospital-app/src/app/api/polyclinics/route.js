import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, name as nama_poli, description, description as deskripsi, icon, icon as ikon 
       FROM polyclinics ORDER BY name ASC`
    );
    return NextResponse.json({ polyclinics: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get polyclinics error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const nama_poli = sanitize(body.name || body.nama_poli);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const ikon = sanitize(body.icon || body.ikon);

    const nameErr = validateRequired(nama_poli, 'Nama poliklinik');
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO polyclinics (name, description, icon)
       VALUES ($1, $2, $3)
       RETURNING id, name, name as nama_poli, description, description as deskripsi, icon, icon as ikon`,
      [nama_poli, deskripsi || null, ikon || 'stethoscope']
    );

    return NextResponse.json({ polyclinic: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create polyclinic error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama poli sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
