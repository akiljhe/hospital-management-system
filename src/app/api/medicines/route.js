import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, validateMaxLength, validateNoHtmlTags, sanitize } from '@/lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || searchParams.get('status');

    let sql = `
      SELECT id, name, name as nama_obat, 
             description, description as deskripsi, 
             type as tipe, unit, 
             stock as stok, stock,
             image as gambar,
             expiry_date as tanggal_kadaluarsa, expiry_date,
             status_obat,
             created_at
      FROM v_status_obat
    `;
    const whereClauses = [];

    if (filter === 'available' || filter === 'tersedia') {
      whereClauses.push("status_obat = 'tersedia'");
    } else if (filter === 'unavailable' || filter === 'tidak_tersedia' || filter === 'tidak tersedia') {
      whereClauses.push("status_obat = 'tidak tersedia'");
    } else if (filter === 'expired' || filter === 'kadaluarsa') {
      whereClauses.push("status_obat = 'kadaluarsa'");
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql);
    return NextResponse.json({ medicines: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get medicines error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const body = await request.json();
    const nama_obat = sanitize(body.name || body.nama_obat);
    const deskripsi = sanitize(body.description || body.deskripsi);
    const tipe = sanitize(body.tipe || 'biasa'); // 'biasa' atau 'keras'
    const stok = parseInt(body.stock !== undefined ? body.stock : (body.stok || 0), 10);
    const tanggal_kadaluarsa = body.expiry_date || body.tanggal_kadaluarsa || null;

    const nameErr = validateRequired(nama_obat, 'Nama obat')
      || validateMaxLength(nama_obat, 150, 'Nama obat')
      || validateNoHtmlTags(nama_obat, 'Nama obat');
    if (nameErr) {
      return apiError(400, nameErr);
    }

    const unitErr = validateMaxLength(body.unit || 'tablet', 50, 'Satuan obat');
    if (unitErr) {
      return apiError(400, unitErr);
    }

    if (isNaN(stok) || stok < 0) {
      return apiError(400, 'Stok harus berupa angka positif atau 0');
    }

    const validTipe = ['biasa', 'keras'];
    const tipeVal = validTipe.includes(tipe) ? tipe : 'biasa';

    const result = await query(
      `INSERT INTO medicines (name, description, type, unit, stock, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, name as nama_obat, description, description as deskripsi, type as tipe, unit, stock as stok, expiry_date as tanggal_kadaluarsa`,
      [nama_obat, deskripsi || null, tipeVal, body.unit || 'tablet', stok, tanggal_kadaluarsa || null]
    );

    return NextResponse.json({ medicine: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create medicine error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input obat melebihi batas panjang karakter yang diizinkan (nama obat maksimal 150 karakter)');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}
