import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';
import { formatDate } from '@/lib/utils';

const DAY_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function GET(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT a.id, a.patient_id as pasien_id, a.doctor_id as dokter_id, a.schedule_id as jadwal_id,
             a.appointment_date as tanggal_booking, a.appointment_date,
             a.complaint as keluhan_singkat, a.complaint as keluhan, a.complaint as notes,
             a.status,
             a.rejection_reason as alasan_penolakan, a.rejection_reason,
             a.created_at, a.updated_at,
             u_pat.name as patient_name, u_pat.name as nama_pasien, u_pat.phone as patient_phone, u_pat.email as patient_email,
             u_doc.name as doctor_name, u_doc.name as nama_dokter, u_doc.email as doctor_email,
             p.name as polyclinic_name, p.name as nama_poli,
             ds.day as hari, ds.day,
             ds.start_time as jam_mulai, ds.start_time,
             ds.end_time as jam_selesai, ds.end_time
      FROM appointments a
      JOIN patients pat ON a.patient_id = pat.id
      JOIN users u_pat ON pat.user_id = u_pat.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
      JOIN doctor_schedules ds ON a.schedule_id = ds.id
    `;
    const params = [];
    const whereClauses = [];

    if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      whereClauses.push(`pat.user_id = $${params.length}`);
    } else if (auth.user.role === 'dokter') {
      params.push(auth.user.id);
      whereClauses.push(`d.user_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`a.status = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY a.appointment_date DESC, ds.start_time DESC, a.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ appointments: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get appointments error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['pasien']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const jadwal_id = body.jadwal_id || body.schedule_id;
    const tanggal_booking = body.tanggal_booking || body.appointment_date;
    const keluhan_singkat = sanitize(body.keluhan_singkat || body.keluhan || body.notes || 'Pemeriksaan rutin');

    // Validate inputs
    const errors = [];
    const jadwalErr = validateRequired(jadwal_id, 'Jadwal dokter');
    if (jadwalErr) errors.push(jadwalErr);
    const dateErr = validateRequired(tanggal_booking, 'Tanggal janji temu');
    if (dateErr) errors.push(dateErr);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // Ambil info patient_id dari user login
    const patRes = await query('SELECT id FROM patients WHERE user_id = $1', [auth.user.id]);
    let patient_id;
    if (patRes.rows.length === 0) {
      const newPat = await query('INSERT INTO patients (user_id) VALUES ($1) RETURNING id', [auth.user.id]);
      patient_id = newPat.rows[0].id;
    } else {
      patient_id = patRes.rows[0].id;
    }

    // Ambil info jadwal
    const scheduleResult = await query(
      `SELECT ds.*, u.id as doctor_user_id, u.name as doctor_name
       FROM doctor_schedules ds
       JOIN doctors d ON ds.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE ds.id = $1`,
      [jadwal_id]
    );

    if (scheduleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Jadwal dokter tidak ditemukan' }, { status: 404 });
    }

    const schedule = scheduleResult.rows[0];

    // Cek apakah tanggal sesuai dengan hari pada jadwal dokter
    const [year, month, day] = tanggal_booking.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    const dayOfWeek = DAY_MAP[bookingDate.getDay()];

    if (dayOfWeek !== schedule.day) {
      return NextResponse.json(
        { error: `Tanggal ${tanggal_booking} adalah hari ${dayOfWeek}, sedangkan jadwal dokter adalah hari ${schedule.day}` },
        { status: 400 }
      );
    }

    // Cek tanggal tidak boleh di masa lalu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json({ error: 'Tanggal booking tidak boleh di masa lalu' }, { status: 400 });
    }

    // Cek apakah slot sudah dibooking pada tanggal tersebut
    const existing = await query(
      `SELECT id FROM appointments
       WHERE schedule_id = $1 AND appointment_date = $2 AND status IN ('Pending', 'Approved', 'Selesai')`,
      [jadwal_id, tanggal_booking]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Slot jadwal sudah dipesan untuk tanggal ini. Silakan pilih slot lain.' }, { status: 409 });
    }

    // Insert appointments
    const insertResult = await query(
      `INSERT INTO appointments (patient_id, doctor_id, schedule_id, appointment_date, complaint, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')
       RETURNING *`,
      [patient_id, schedule.doctor_id, jadwal_id, tanggal_booking, keluhan_singkat]
    );

    const appointment = insertResult.rows[0];

    // Notifikasi in-app untuk dokter: ada janji temu baru
    await query(
      `INSERT INTO notifications (user_id, title, message, link)
       VALUES ($1, $2, $3, $4)`,
      [
        schedule.doctor_user_id,
        'Janji Temu Baru',
        `Pasien ${auth.user.name || auth.user.nama_lengkap} membuat janji temu baru untuk tanggal ${formatDate(tanggal_booking)} (${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}).`,
        '/appointments',
      ]
    );

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slot jadwal sudah dipesan untuk tanggal ini' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
