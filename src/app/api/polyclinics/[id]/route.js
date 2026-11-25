import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, validateMaxLength, validateNoHtmlTags, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, name, name as nama_poli, description, description as deskripsi, icon, icon as ikon 
       FROM polyclinics WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Poliklinik tidak ditemukan');
    }

    return NextResponse.json({ polyclinic: result.rows[0] });
  } catch (error) {
    console.error('Get polyclinic error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;
    const body = await request.json();
    const nama_poli = sanitize(body.name || body.nama_poli);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const ikon = sanitize(body.icon || body.ikon);

    const nameErr = validateRequired(nama_poli, 'Nama poliklinik')
      || validateMaxLength(nama_poli, 100, 'Nama poliklinik')
      || validateNoHtmlTags(nama_poli, 'Nama poliklinik');
    if (nameErr) {
      return apiError(400, nameErr);
    }

    const result = await query(
      `UPDATE polyclinics
       SET name = $1, description = $2, icon = $3
       WHERE id = $4
       RETURNING id, name, name as nama_poli, description, description as deskripsi, icon, icon as ikon`,
      [nama_poli, deskripsi, ikon, id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Poliklinik tidak ditemukan');
    }

    return NextResponse.json({ polyclinic: result.rows[0] });
  } catch (error) {
    console.error('Update polyclinic error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Nama poliklinik maksimal 100 karakter');
    }
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    // Check if doctors are assigned to this poli
    const checkDoctors = await query('SELECT id FROM doctors WHERE polyclinic_id = $1 LIMIT 1', [id]);
    if (checkDoctors.rows.length > 0) {
      return apiError(400, 'Poli tidak dapat dihapus karena masih ada dokter yang bertugas di poli ini');
    }

    const result = await query('DELETE FROM polyclinics WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return apiError(404, 'Poliklinik tidak ditemukan');
    }

    return NextResponse.json({ message: 'Poliklinik berhasil dihapus' });
  } catch (error) {
    console.error('Delete polyclinic error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
