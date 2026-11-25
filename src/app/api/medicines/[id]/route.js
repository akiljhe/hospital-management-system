import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, validateMaxLength, validateNoHtmlTags, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, name, name as nama_obat, description, description as deskripsi, 
              type as tipe, unit, stock as stok, stock, expiry_date as tanggal_kadaluarsa, expiry_date
       FROM medicines WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Obat tidak ditemukan');
    }

    return NextResponse.json({ medicine: result.rows[0] });
  } catch (error) {
    console.error('Get medicine error:', error);
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
    const nama_obat = sanitize(body.name || body.nama_obat);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const tipe = sanitize(body.tipe || 'biasa');
    const stok = parseInt(body.stock !== undefined ? body.stock : (body.stok || 0), 10);
    const tanggal_kadaluarsa = body.expiry_date || body.tanggal_kadaluarsa || null;

    const nameErr = validateRequired(nama_obat, 'Nama obat')
      || validateMaxLength(nama_obat, 150, 'Nama obat')
      || validateNoHtmlTags(nama_obat, 'Nama obat');
    if (nameErr) {
      return apiError(400, nameErr);
    }

    if (isNaN(stok) || stok < 0) {
      return apiError(400, 'Stok harus berupa angka positif atau 0');
    }

    const validTipe = ['biasa', 'keras'];
    const tipeVal = validTipe.includes(tipe) ? tipe : 'biasa';

    const result = await query(
      `UPDATE medicines
       SET name = $1, description = $2, type = $3, stock = $4, expiry_date = $5
       WHERE id = $6
       RETURNING id, name, name as nama_obat, description, description as deskripsi, type as tipe, unit, stock as stok, expiry_date as tanggal_kadaluarsa`,
      [nama_obat, deskripsi, tipeVal, stok, tanggal_kadaluarsa, id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Obat tidak ditemukan');
    }

    return NextResponse.json({ medicine: result.rows[0] });
  } catch (error) {
    console.error('Update medicine error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input obat melebihi batas panjang karakter yang diizinkan (nama obat maksimal 150 karakter)');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    // Cek apakah obat sudah ada di prescription_items
    const checkItem = await query('SELECT id FROM prescription_items WHERE medicine_id = $1 LIMIT 1', [id]);
    if (checkItem.rows.length > 0) {
      return apiError(400, 'Obat tidak dapat dihapus karena sudah tercatat dalam riwayat resep obat pasien');
    }

    const result = await query('DELETE FROM medicines WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return apiError(404, 'Obat tidak ditemukan');
    }

    return NextResponse.json({ message: 'Obat berhasil dihapus' });
  } catch (error) {
    console.error('Delete medicine error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
