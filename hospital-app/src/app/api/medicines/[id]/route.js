import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, nama_obat, nama_obat as name, deskripsi, deskripsi as description, 
              tipe, tipe as unit, stok, stok as stock, tanggal_kadaluarsa, tanggal_kadaluarsa as expiry_date
       FROM obat WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ medicine: result.rows[0] });
  } catch (error) {
    console.error('Get medicine error:', error);
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
    const nama_obat = sanitize(body.name || body.nama_obat);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const tipe = sanitize(body.tipe || 'biasa');
    const stok = parseInt(body.stock !== undefined ? body.stock : (body.stok || 0), 10);
    const tanggal_kadaluarsa = body.expiry_date || body.tanggal_kadaluarsa || null;

    const nameErr = validateRequired(nama_obat, 'Nama obat');
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }

    if (isNaN(stok) || stok < 0) {
      return NextResponse.json({ error: 'Stok harus berupa angka positif atau 0' }, { status: 400 });
    }

    const validTipe = ['biasa', 'keras'];
    const tipeVal = validTipe.includes(tipe) ? tipe : 'biasa';

    const result = await query(
      `UPDATE obat
       SET nama_obat = $1, deskripsi = $2, tipe = $3, stok = $4, tanggal_kadaluarsa = $5
       WHERE id = $6
       RETURNING *`,
      [nama_obat, deskripsi, tipeVal, stok, tanggal_kadaluarsa, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ medicine: result.rows[0] });
  } catch (error) {
    console.error('Update medicine error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Cek apakah obat sudah ada di resep_item
    const checkItem = await query('SELECT id FROM resep_item WHERE obat_id = $1 LIMIT 1', [id]);
    if (checkItem.rows.length > 0) {
      return NextResponse.json(
        { error: 'Obat tidak dapat dihapus karena sudah tercatat dalam riwayat resep obat pasien' },
        { status: 400 }
      );
    }

    const result = await query('DELETE FROM obat WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Obat berhasil dihapus' });
  } catch (error) {
    console.error('Delete medicine error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
