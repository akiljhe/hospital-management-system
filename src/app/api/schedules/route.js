import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

const VALID_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctor_id = searchParams.get('doctor_id');
    const date = searchParams.get('date');

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
    let schedules = result.rows;
    let bookedScheduleIds = [];

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && schedules.length > 0) {
      const scheduleIds = schedules.map((s) => s.id);
      const bookedRes = await query(
        `SELECT schedule_id FROM appointments
         WHERE schedule_id = ANY($1::uuid[])
           AND appointment_date = $2
           AND status IN ('Pending', 'Approved', 'Selesai')`,
        [scheduleIds, date]
      );
      bookedScheduleIds = bookedRes.rows.map((r) => r.schedule_id);
      const bookedSet = new Set(bookedScheduleIds);
      schedules = schedules.map((s) => ({ ...s, is_booked: bookedSet.has(s.id) }));
    }

    return NextResponse.json({ schedules, data: schedules, bookedScheduleIds });
  } catch (error) {
    console.error('Get schedules error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['dokter', 'admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
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
        return apiError(400, 'Pengguna ini belum terdaftar di tabel doctors');
      }
      doctorRow = docRes.rows[0];
    } else if (auth.user.role === 'admin') {
      const docIdInput = body.doctor_id || body.dokter_id;
      const docRes = await query('SELECT id FROM doctors WHERE id = $1 OR user_id = $1', [docIdInput]);
      if (docRes.rows.length === 0) {
        return apiError(400, 'Dokter tidak ditemukan');
      }
      doctorRow = docRes.rows[0];
    }
    const real_doctor_id = doctorRow.id;

    // Validate hari
    if (!hari || !VALID_DAYS.includes(hari)) {
      return apiError(400, 'Hari tidak valid (pilih Senin - Minggu)');
    }

    // Format waktu
    if (!jam_mulai) {
      return apiError(400, 'Jam mulai wajib diisi');
    }

    // Normalisasi jam_mulai ke HH:MM:00
    const startParts = jam_mulai.split(':');
    const hh = parseInt(startParts[0], 10);
    const mm = parseInt(startParts[1], 10);

    if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || (mm !== 0 && mm !== 30)) {
      return apiError(400, 'Slot waktu harus dimulai pada menit :00 atau :30 (contoh: 08:00, 08:30)');
    }

    let endH = hh;
    let endM = mm + 30;
    if (endM >= 60) {
      endH = (endH + 1) % 24;
      endM = 0;
    }

    // Validasi durasi jika jam_selesai dikirimkan (tidak boleh menimpa secara diam-diam)
    if (jam_selesai) {
      const endParts = jam_selesai.split(':');
      const ehh = parseInt(endParts[0], 10);
      const emm = parseInt(endParts[1], 10);
      if (isNaN(ehh) || isNaN(emm) || ehh < 0 || ehh > 23 || emm < 0 || emm > 59) {
        return apiError(400, 'Format jam selesai tidak valid (HH:MM)');
      }
      const startTotal = hh * 60 + mm;
      const endTotal = ehh * 60 + emm;
      if (endTotal - startTotal !== 30) {
        return apiError(400, 'Durasi jadwal praktik wajib tepat 30 menit');
      }
      endH = ehh;
      endM = emm;
    }

    const formattedStart = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

    // Cek apakah slot sudah ada
    const existing = await query(
      `SELECT id FROM doctor_schedules WHERE doctor_id = $1 AND day = $2 AND start_time = $3`,
      [real_doctor_id, hari, formattedStart]
    );

    if (existing.rows.length > 0) {
      return apiError(409, 'Jadwal pada jam tersebut sudah ada');
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
      return apiError(409, 'Jadwal bentrok dengan jadwal yang sudah ada');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}
