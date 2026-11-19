import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const result = await query(
      `SELECT jt.*, jt.tanggal_booking as appointment_date, jt.keluhan_singkat as keluhan, jt.keluhan_singkat as notes,
              jt.alasan_penolakan as rejection_reason,
              u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone, u_pat.email as patient_email,
              u_doc.nama_lengkap as doctor_name, u_doc.email as doctor_email,
              p.nama_poli as polyclinic_name,
              jd.hari, jd.jam_mulai, jd.jam_selesai
       FROM janji_temu jt
       JOIN users u_pat ON jt.pasien_id = u_pat.id
       JOIN users u_doc ON jt.dokter_id = u_doc.id
       JOIN dokter d ON jt.dokter_id = d.user_id
       LEFT JOIN poli p ON d.poli_id = p.id
       JOIN jadwal_dokter jd ON jt.jadwal_id = jd.id
       WHERE jt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 });
    }

    const appointment = result.rows[0];

    // Check authorization
    if (auth.user.role === 'pasien' && appointment.pasien_id !== auth.user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (auth.user.role === 'dokter' && appointment.dokter_id !== auth.user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Get appointment detail error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();
    const status = sanitize(body.status);
    const alasan_penolakan = sanitize(body.alasan_penolakan || body.rejection_reason || '');

    const statusErr = validateRequired(status, 'Status');
    if (statusErr) {
      return NextResponse.json({ error: statusErr }, { status: 400 });
    }

    // Ambil janji temu saat ini
    const currentResult = await query(
      `SELECT jt.*, u_doc.nama_lengkap as doctor_name
       FROM janji_temu jt
       JOIN users u_doc ON jt.dokter_id = u_doc.id
       WHERE jt.id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 });
    }

    const appointment = currentResult.rows[0];

    // Otorisasi dan validasi transisi status
    if (auth.user.role === 'pasien') {
      if (appointment.pasien_id !== auth.user.id) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      if (status !== 'Dibatalkan') {
        return NextResponse.json({ error: 'Pasien hanya dapat membatalkan janji temu' }, { status: 400 });
      }
      if (appointment.status !== 'Pending') {
        return NextResponse.json({ error: 'Janji temu hanya dapat dibatalkan jika statusnya masih Pending' }, { status: 400 });
      }
    } else if (auth.user.role === 'dokter') {
      if (appointment.dokter_id !== auth.user.id) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      if (!['Approved', 'Rejected'].includes(status)) {
        return NextResponse.json({ error: 'Dokter hanya dapat menyetujui (Approved) atau menolak (Rejected) janji temu' }, { status: 400 });
      }
      if (appointment.status !== 'Pending') {
        return NextResponse.json({ error: `Janji temu berstatus ${appointment.status} tidak dapat diubah lagi` }, { status: 400 });
      }
      if (status === 'Rejected' && !alasan_penolakan) {
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi jika janji temu ditolak' }, { status: 400 });
      }
    } else if (auth.user.role === 'admin') {
      if (!['Approved', 'Rejected'].includes(status)) {
        return NextResponse.json({ error: 'Status tidak valid untuk Admin' }, { status: 400 });
      }
      if (status === 'Rejected' && !alasan_penolakan) {
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi jika janji temu ditolak' }, { status: 400 });
      }
    }

    const updateResult = await query(
      `UPDATE janji_temu
       SET status = $1, alasan_penolakan = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, status === 'Rejected' ? alasan_penolakan : null, id]
    );

    const updated = updateResult.rows[0];

    // Kirim notifikasi ke pasien jika Approved atau Rejected
    if (status === 'Approved') {
      await query(
        `INSERT INTO notifikasi (user_id, judul, pesan)
         VALUES ($1, $2, $3)`,
        [
          appointment.pasien_id,
          'Janji Temu Disetujui',
          `Janji temu Anda dengan Dr. ${appointment.doctor_name} pada tanggal ${appointment.tanggal_booking.toISOString().substring(0, 10)} telah disetujui.`,
        ]
      );
    } else if (status === 'Rejected') {
      await query(
        `INSERT INTO notifikasi (user_id, judul, pesan)
         VALUES ($1, $2, $3)`,
        [
          appointment.pasien_id,
          'Janji Temu Ditolak',
          `Janji temu Anda dengan Dr. ${appointment.doctor_name} pada tanggal ${appointment.tanggal_booking.toISOString().substring(0, 10)} ditolak. Alasan: ${alasan_penolakan}`,
        ]
      );
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}
