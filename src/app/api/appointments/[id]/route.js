import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';
import { formatDate } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    const result = await query(
      `SELECT a.*, a.appointment_date as tanggal_booking, a.complaint as keluhan, a.complaint as notes,
              a.rejection_reason as alasan_penolakan,
              u_pat.name as patient_name, u_pat.name as nama_pasien, u_pat.phone as patient_phone, u_pat.email as patient_email,
              u_doc.name as doctor_name, u_doc.name as nama_dokter, u_doc.email as doctor_email,
              p.name as polyclinic_name, p.name as nama_poli,
              ds.day as hari, ds.start_time as jam_mulai, ds.end_time as jam_selesai,
              pat.user_id as patient_user_id,
              d.user_id as doctor_user_id
       FROM appointments a
       JOIN patients pat ON a.patient_id = pat.id
       JOIN users u_pat ON pat.user_id = u_pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
       JOIN doctor_schedules ds ON a.schedule_id = ds.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'Janji temu tidak ditemukan');
    }

    const appointment = result.rows[0];

    // Check authorization
    if (auth.user.role === 'pasien' && appointment.patient_user_id !== auth.user.id) {
      return apiError(403, 'Akses ditolak');
    }
    if (auth.user.role === 'dokter' && appointment.doctor_user_id !== auth.user.id) {
      return apiError(403, 'Akses ditolak');
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Get appointment detail error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;
    const body = await request.json();
    const status = sanitize(body.status);
    const alasan_penolakan = sanitize(body.alasan_penolakan || body.rejection_reason || '');

    const statusErr = validateRequired(status, 'Status');
    if (statusErr) {
      return apiError(400, statusErr);
    }

    // Ambil janji temu saat ini
    const currentResult = await query(
      `SELECT a.*, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as tanggal_booking_str,
              u_doc.name as doctor_name,
              pat.user_id as patient_user_id,
              d.user_id as doctor_user_id
       FROM appointments a
       JOIN patients pat ON a.patient_id = pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE a.id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return apiError(404, 'Janji temu tidak ditemukan');
    }

    const appointment = currentResult.rows[0];

    // Otorisasi dan validasi transisi status
    if (auth.user.role === 'pasien') {
      if (appointment.patient_user_id !== auth.user.id) {
        return apiError(403, 'Akses ditolak');
      }
      if (status !== 'Dibatalkan') {
        return apiError(403, 'Pasien tidak memiliki izin untuk menyetujui atau mengubah status janji temu');
      }
      if (appointment.status !== 'Pending') {
        return apiError(400, 'Janji temu hanya dapat dibatalkan jika statusnya masih Pending');
      }
    } else if (auth.user.role === 'dokter') {
      if (appointment.doctor_user_id !== auth.user.id) {
        return apiError(403, 'Akses ditolak');
      }
      if (!['Approved', 'Rejected'].includes(status)) {
        return apiError(400, 'Dokter hanya dapat menyetujui (Approved) atau menolak (Rejected) janji temu');
      }
      if (appointment.status !== 'Pending') {
        return apiError(400, `Janji temu berstatus ${appointment.status} tidak dapat diubah lagi`);
      }
      if (status === 'Rejected' && !alasan_penolakan) {
        return apiError(400, 'Alasan penolakan wajib diisi jika janji temu ditolak');
      }
    } else if (auth.user.role === 'admin') {
      if (!['Approved', 'Rejected'].includes(status)) {
        return apiError(400, 'Status tidak valid untuk Admin');
      }
      if (status === 'Rejected' && !alasan_penolakan) {
        return apiError(400, 'Alasan penolakan wajib diisi jika janji temu ditolak');
      }
    }

    const updateResult = await query(
      `UPDATE appointments
       SET status = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, status === 'Rejected' ? alasan_penolakan : null, id]
    );

    const updated = updateResult.rows[0];

    // Kirim notifikasi ke pasien jika Approved atau Rejected (jika belum otomatis dikirim oleh trigger)
    const doctorName = appointment.doctor_name || '';
    const doctorDisplayName = /^dr\.?/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`;
    const bookingDateLabel = formatDate(appointment.tanggal_booking_str || appointment.appointment_date);

    if (status === 'Approved') {
      await query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, $2, $3, $4)`,
        [
          appointment.patient_user_id,
          'Janji Temu Disetujui',
          `Janji temu Anda dengan ${doctorDisplayName} pada tanggal ${bookingDateLabel} telah disetujui.`,
          '/appointments',
        ]
      );
    } else if (status === 'Rejected') {
      await query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, $2, $3, $4)`,
        [
          appointment.patient_user_id,
          'Janji Temu Ditolak',
          `Janji temu Anda dengan ${doctorDisplayName} pada tanggal ${bookingDateLabel} ditolak. Alasan: ${alasan_penolakan}`,
          '/appointments',
        ]
      );
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}
