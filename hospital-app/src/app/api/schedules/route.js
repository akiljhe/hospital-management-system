import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

const VALID_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctor_id = searchParams.get('doctor_id');

    let sql = `
      SELECT jd.id, jd.dokter_id, jd.hari, jd.hari as day, 
             jd.jam_mulai, jd.jam_mulai as start_time, 
             jd.jam_selesai, jd.jam_selesai as end_time,
             u.nama_lengkap as doctor_name
      FROM jadwal_dokter jd
      JOIN users u ON jd.dokter_id = u.id
    `;
    const params = [];

    if (doctor_id) {
      params.push(doctor_id);
      sql += ` WHERE jd.dokter_id = $${params.length}`;
    }

    sql += ` ORDER BY CASE jd.hari
      WHEN 'Senin' THEN 1
      WHEN 'Selasa' THEN 2
      WHEN 'Rabu' THEN 3
      WHEN 'Kamis' THEN 4
      WHEN 'Jumat' THEN 5
      WHEN 'Sabtu' THEN 6
      WHEN 'Minggu' THEN 7
    END, jd.jam_mulai ASC`;

    const result = await query(sql, params);
    return NextResponse.json({ schedules: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['dokter', 'admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const hari = sanitize(body.hari || body.day);
    let jam_mulai = sanitize(body.jam_mulai || body.start_time);
    let jam_selesai = sanitize(body.jam_selesai || body.end_time);
    
    // Dokter id: jika dokter, paksakan id dokter sendiri
    let dokter_id = auth.user.id;
    if (auth.user.role === 'admin' && (body.dokter_id || body.doctor_id)) {
      dokter_id = body.dokter_id || body.doctor_id;
    }

    // Pastikan user ini terdaftar di tabel dokter
    const checkDoc = await query('SELECT user_id FROM dokter WHERE user_id = $1', [dokter_id]);
    if (checkDoc.rows.length === 0) {
      return NextResponse.json({ error: 'Pengguna ini belum terdaftar di tabel dokter' }, { status: 400 });
    }

    // Validate hari
    if (!hari || !VALID_DAYS.includes(hari)) {
      return NextResponse.json({ error: 'Hari tidak valid (pilih Senin - Minggu)' }, { status: 400 });
    }

    // Format waktu
    if (!jam_mulai) {
      return NextResponse.json({ error: 'Jam mulai wajib diisi' }, { status: 400 });
    }

    // Normalisasi jam_mulai ke HH:MM:00
    const parts = jam_mulai.split(':');
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);

    if (isNaN(hh) || isNaN(mm) || (mm !== 0 && mm !== 30)) {
      return NextResponse.json({ error: 'Slot waktu harus dimulai pada menit :00 atau :30 (contoh: 08:00, 08:30)' }, { status: 400 });
    }

    // Hitung jam_selesai otomatis 30 menit kemudian
    let endH = hh;
    let endM = mm + 30;
    if (endM >= 60) {
      endH = (endH + 1) % 24;
      endM = 0;
    }

    const formattedStart = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

    // Cek apakah slot sudah ada
    const existing = await query(
      `SELECT id FROM jadwal_dokter WHERE dokter_id = $1 AND hari = $2 AND jam_mulai = $3`,
      [dokter_id, hari, formattedStart]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Jadwal pada jam tersebut sudah ada' }, { status: 409 });
    }

    const insertResult = await query(
      `INSERT INTO jadwal_dokter (dokter_id, hari, jam_mulai, jam_selesai)
       VALUES ($1, $2, $3, $4)
       RETURNING id, dokter_id, hari, jam_mulai, jam_selesai`,
      [dokter_id, hari, formattedStart, formattedEnd]
    );

    return NextResponse.json({ schedule: insertResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create schedule error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Jadwal bentrok dengan jadwal yang sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
