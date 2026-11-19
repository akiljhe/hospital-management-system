import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

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
      SELECT jt.id, jt.pasien_id, jt.dokter_id, jt.jadwal_id,
             jt.tanggal_booking, jt.tanggal_booking as appointment_date,
             jt.keluhan_singkat, jt.keluhan_singkat as keluhan, jt.keluhan_singkat as notes,
             jt.status,
             jt.alasan_penolakan, jt.alasan_penolakan as rejection_reason,
             jt.created_at, jt.updated_at,
             u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone, u_pat.email as patient_email,
             u_doc.nama_lengkap as doctor_name, u_doc.email as doctor_email,
             p.nama_poli as polyclinic_name, p.nama_poli,
             jd.hari, jd.hari as day,
             jd.jam_mulai, jd.jam_mulai as start_time,
             jd.jam_selesai, jd.jam_selesai as end_time
      FROM janji_temu jt
      JOIN users u_pat ON jt.pasien_id = u_pat.id
      JOIN users u_doc ON jt.dokter_id = u_doc.id
      JOIN dokter d ON jt.dokter_id = d.user_id
      LEFT JOIN poli p ON d.poli_id = p.id
      JOIN jadwal_dokter jd ON jt.jadwal_id = jd.id
    `;
    const params = [];
    const whereClauses = [];

    if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      whereClauses.push(`jt.pasien_id = $${params.length}`);
    } else if (auth.user.role === 'dokter') {
      params.push(auth.user.id);
      whereClauses.push(`jt.dokter_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`jt.status = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY jt.tanggal_booking DESC, jd.jam_mulai DESC, jt.created_at DESC';

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

    // Ambil info jadwal
    const scheduleResult = await query(
      `SELECT jd.*, u.nama_lengkap as doctor_name
       FROM jadwal_dokter jd
       JOIN users u ON jd.dokter_id = u.id
       WHERE jd.id = $1`,
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

    if (dayOfWeek !== schedule.hari) {
      return NextResponse.json(
        { error: `Tanggal ${tanggal_booking} adalah hari ${dayOfWeek}, sedangkan jadwal dokter adalah hari ${schedule.hari}` },
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
      `SELECT id FROM janji_temu
       WHERE jadwal_id = $1 AND tanggal_booking = $2 AND status IN ('Pending', 'Approved', 'Selesai')`,
      [jadwal_id, tanggal_booking]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Slot jadwal sudah dipesan untuk tanggal ini. Silakan pilih slot lain.' }, { status: 409 });
    }

    // Insert janji temu dengan auto-increment id tanpa mengubah skema tabel
    const insertResult = await query(
      `INSERT INTO janji_temu (id, pasien_id, dokter_id, jadwal_id, tanggal_booking, keluhan_singkat, status)
       VALUES (COALESCE((SELECT MAX(id) FROM janji_temu), 0) + 1, $1, $2, $3, $4, $5, 'Pending')
       RETURNING *`,
      [auth.user.id, schedule.dokter_id, jadwal_id, tanggal_booking, keluhan_singkat]
    );

    const appointment = insertResult.rows[0];

    // Notifikasi in-app untuk dokter: ada janji temu baru
    await query(
      `INSERT INTO notifikasi (user_id, judul, pesan)
       VALUES ($1, $2, $3)`,
      [
        schedule.dokter_id,
        'Janji Temu Baru',
        `Pasien ${auth.user.name || auth.user.nama_lengkap} membuat janji temu baru untuk tanggal ${tanggal_booking} (${schedule.jam_mulai.substring(0, 5)} - ${schedule.jam_selesai.substring(0, 5)}).`,
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
