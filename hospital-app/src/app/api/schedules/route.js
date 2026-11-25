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
      SELECT ds.id, ds.doctor_id, ds.doctor_id as dokter_id, ds.day, ds.day as hari, 
             ds.start_time, ds.start_time as jam_mulai, 
             ds.end_time, ds.end_time as jam_selesai,
             u.name as doctor_name
      FROM doctor_schedules ds
      JOIN doctors d ON ds.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE ds.is_active = TRUE
    `;
    const params = [];

    if (doctor_id) {
      params.push(doctor_id);
      sql += ` AND (ds.doctor_id = $${params.length} OR d.user_id = $${params.length})`;
    }

    sql += ` ORDER BY CASE ds.day
      WHEN 'Senin' THEN 1
      WHEN 'Selasa' THEN 2
      WHEN 'Rabu' THEN 3
      WHEN 'Kamis' THEN 4
      WHEN 'Jumat' THEN 5
      WHEN 'Sabtu' THEN 6
      WHEN 'Minggu' THEN 7
    END, ds.start_time ASC`;

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
    
    // Resolve doctor_id in doctors table
    let doctorRow;
    if (auth.user.role === 'dokter') {
      const docRes = await query('SELECT id FROM doctors WHERE user_id = $1', [auth.user.id]);
      if (docRes.rows.length === 0) {
        return NextResponse.json({ error: 'Pengguna ini belum terdaftar di tabel doctors' }, { status: 400 });
      }
      doctorRow = docRes.rows[0];
    } else if (auth.user.role === 'admin') {
      const docIdInput = body.doctor_id || body.dokter_id;
      const docRes = await query('SELECT id FROM doctors WHERE id = $1 OR user_id = $1', [docIdInput]);
      if (docRes.rows.length === 0) {
        return NextResponse.json({ error: 'Dokter tidak ditemukan' }, { status: 400 });
      }
      doctorRow = docRes.rows[0];
    }
    const real_doctor_id = doctorRow.id;

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
      `SELECT id FROM doctor_schedules WHERE doctor_id = $1 AND day = $2 AND start_time = $3`,
      [real_doctor_id, hari, formattedStart]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Jadwal pada jam tersebut sudah ada' }, { status: 409 });
    }

    const insertResult = await query(
      `INSERT INTO doctor_schedules (doctor_id, day, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, doctor_id, day, day as hari, start_time, start_time as jam_mulai, end_time, end_time as jam_selesai`,
      [real_doctor_id, hari, formattedStart, formattedEnd]
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
