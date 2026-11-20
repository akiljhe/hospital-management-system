import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'available', 'unavailable', 'expired', or 'semua'

    let sql = `
      SELECT id, nama_obat, nama_obat as name, 
             deskripsi, deskripsi as description, 
             tipe, tipe as unit, 
             stok, stok as stock, 
             gambar,
             tanggal_kadaluarsa, tanggal_kadaluarsa as expiry_date,
             created_at
      FROM obat
    `;
    const whereClauses = [];

    if (filter === 'available' || filter === 'tersedia') {
      whereClauses.push('stok > 0 AND (tanggal_kadaluarsa IS NULL OR tanggal_kadaluarsa >= CURRENT_DATE)');
    } else if (filter === 'unavailable' || filter === 'tidak_tersedia') {
      whereClauses.push('stok = 0');
    } else if (filter === 'expired' || filter === 'kadaluarsa') {
      whereClauses.push('tanggal_kadaluarsa < CURRENT_DATE');
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY nama_obat ASC';

    const result = await query(sql);
    return NextResponse.json({ medicines: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get medicines error:', error);
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
    const nama_obat = sanitize(body.name || body.nama_obat);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const tipe = sanitize(body.tipe || 'biasa'); // 'biasa' atau 'keras'
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
      `INSERT INTO obat (nama_obat, deskripsi, tipe, stok, tanggal_kadaluarsa)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nama_obat, deskripsi || null, tipeVal, stok, tanggal_kadaluarsa || null]
    );

    return NextResponse.json({ medicine: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create medicine error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
