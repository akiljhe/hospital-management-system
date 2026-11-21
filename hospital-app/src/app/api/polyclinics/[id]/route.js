import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, nama_poli, nama_poli as name, deskripsi, deskripsi as description, ikon, ikon as icon 
       FROM poli WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Poliklinik tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ polyclinic: result.rows[0] });
  } catch (error) {
    console.error('Get polyclinic error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();
    const nama_poli = sanitize(body.name || body.nama_poli);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const ikon = sanitize(body.icon || body.ikon);

    const nameErr = validateRequired(nama_poli, 'Nama poliklinik');
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }

    const result = await query(
      `UPDATE poli
       SET nama_poli = $1, deskripsi = $2, ikon = $3
       WHERE id = $4
       RETURNING id, nama_poli, nama_poli as name, deskripsi, deskripsi as description, ikon, ikon as icon`,
      [nama_poli, deskripsi, ikon, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Poliklinik tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ polyclinic: result.rows[0] });
  } catch (error) {
    console.error('Update polyclinic error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Check if doctors are assigned to this poli
    const checkDoctors = await query('SELECT user_id FROM dokter WHERE poli_id = $1 LIMIT 1', [id]);
    if (checkDoctors.rows.length > 0) {
      return NextResponse.json(
        { error: 'Poli tidak dapat dihapus karena masih ada dokter yang bertugas di poli ini' },
        { status: 400 }
      );
    }

    const result = await query('DELETE FROM poli WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Poliklinik tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Poliklinik berhasil dihapus' });
  } catch (error) {
    console.error('Delete polyclinic error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
