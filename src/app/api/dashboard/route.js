import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { toLocalDateISO } from '@/lib/utils';

const DAY_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function GET() {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const role = auth.user.role;
    const today = new Date();
    const todayName = DAY_MAP[today.getDay()];
    const todayStr = toLocalDateISO(today);

    if (role === 'admin') {
      // 1. Jumlah janji Pending
      const pendingResult = await query("SELECT COUNT(*) as count FROM appointments WHERE status = 'Pending'");
      
      // 2. Antrean farmasi (Menunggu Diproses dan Siap Diambil)
      const menungguResult = await query("SELECT COUNT(*) as count FROM prescriptions WHERE status = 'Menunggu Diproses'");
      const siapResult = await query("SELECT COUNT(*) as count FROM prescriptions WHERE status = 'Siap Diambil'");

      // 3. Daftar dokter yang bertugas hari ini
      const doctorsTodayResult = await query(
        `SELECT DISTINCT u.id, u.name, p.name as polyclinic_name, ds.start_time as jam_mulai, ds.end_time as jam_selesai
         FROM doctor_schedules ds
         JOIN doctors d ON ds.doctor_id = d.id
         JOIN users u ON d.user_id = u.id
         LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
         WHERE ds.day = $1 AND ds.is_active = true
         ORDER BY ds.start_time ASC`,
        [todayName]
      );

      // 4. Total pengguna per peran
      const userCountsResult = await query(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
      );
      const userCounts = { admin: 0, dokter: 0, pasien: 0 };
      userCountsResult.rows.forEach(r => {
        userCounts[r.role] = parseInt(r.count, 10);
      });

      return NextResponse.json({
        role: 'admin',
        pendingAppointments: parseInt(pendingResult.rows[0].count, 10),
        pharmacyQueue: {
          menunggu: parseInt(menungguResult.rows[0].count, 10),
          siap: parseInt(siapResult.rows[0].count, 10),
        },
        todayDoctors: doctorsTodayResult.rows,
        userCounts,
      });
    } else if (role === 'dokter') {
      let doctorId = auth.user.doctor_id;
      if (!doctorId) {
        const docRes = await query('SELECT id FROM doctors WHERE user_id = $1', [auth.user.id]);
        if (docRes.rows.length > 0) {
          doctorId = docRes.rows[0].id;
        }
      }

      if (!doctorId) {
        return NextResponse.json({
          role: 'dokter',
          pendingAppointments: 0,
          todayApproved: [],
          todayApprovedCount: 0,
          recentPatients: [],
          mySchedules: [],
        });
      }

      // 1. Jumlah janji Pending untuknya
      const pendingResult = await query(
        "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = $1 AND status = 'Pending'",
        [doctorId]
      );

      // 2. Janji Approved hari ini
      const approvedTodayResult = await query(
        `SELECT a.id, a.appointment_date as tanggal_booking, a.complaint as keluhan,
                u_pat.name as patient_name, u_pat.phone as patient_phone,
                ds.start_time as jam_mulai, ds.end_time as jam_selesai
         FROM appointments a
         JOIN patients pat ON a.patient_id = pat.id
         JOIN users u_pat ON pat.user_id = u_pat.id
         JOIN doctor_schedules ds ON a.schedule_id = ds.id
         WHERE a.doctor_id = $1 AND a.status = 'Approved' AND a.appointment_date = $2
         ORDER BY ds.start_time ASC`,
        [doctorId, todayStr]
      );

      // 3. 5 pasien terbaru yang diperiksa (ada di medical_records)
      const recentPatientsResult = await query(
        `SELECT mr.id, mr.created_at, mr.diagnosis,
                u_pat.name as patient_name, u_pat.phone as patient_phone,
                a.appointment_date as tanggal_booking
         FROM medical_records mr
         JOIN patients pat ON mr.patient_id = pat.id
         JOIN users u_pat ON pat.user_id = u_pat.id
         JOIN appointments a ON mr.appointment_id = a.id
         WHERE mr.doctor_id = $1
         ORDER BY mr.created_at DESC
         LIMIT 5`,
        [doctorId]
      );

      // Akses cepat ke jadwal dokter
      const schedulesResult = await query(
        `SELECT id, doctor_id, day as hari, start_time as jam_mulai, end_time as jam_selesai, is_active 
         FROM doctor_schedules WHERE doctor_id = $1 ORDER BY day, start_time`,
        [doctorId]
      );

      return NextResponse.json({
        role: 'dokter',
        pendingAppointments: parseInt(pendingResult.rows[0].count, 10),
        todayApproved: approvedTodayResult.rows,
        todayApprovedCount: approvedTodayResult.rows.length,
        recentPatients: recentPatientsResult.rows,
        mySchedules: schedulesResult.rows,
      });
    } else if (role === 'pasien') {
      let patientId = auth.user.patient_id;
      if (!patientId) {
        const patRes = await query('SELECT id FROM patients WHERE user_id = $1', [auth.user.id]);
        if (patRes.rows.length > 0) {
          patientId = patRes.rows[0].id;
        }
      }

      if (!patientId) {
        return NextResponse.json({
          role: 'pasien',
          latestAppointment: null,
          approvedNotifications: [],
          readyPrescriptions: [],
        });
      }

      // 1. Status janji terakhir
      const latestAppointmentResult = await query(
        `SELECT a.id, a.appointment_date as tanggal_booking, a.status, a.complaint as keluhan_singkat, a.rejection_reason as catatan_dokter,
                u_doc.name as doctor_name, p.name as polyclinic_name,
                ds.day as hari, ds.start_time as jam_mulai, ds.end_time as jam_selesai
         FROM appointments a
         JOIN doctors d ON a.doctor_id = d.id
         JOIN users u_doc ON d.user_id = u_doc.id
         LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
         JOIN doctor_schedules ds ON a.schedule_id = ds.id
         WHERE a.patient_id = $1
         ORDER BY a.created_at DESC
         LIMIT 1`,
        [patientId]
      );

      // 2. Notifikasi janji yang disetujui
      const approvedNotificationsResult = await query(
        `SELECT id, title as judul, message as pesan, is_read as dibaca, link, created_at
         FROM notifications 
         WHERE user_id = $1 AND (title ILIKE '%disetujui%' OR title ILIKE '%approved%')
         ORDER BY created_at DESC LIMIT 5`,
        [auth.user.id]
      );

      // 3. Resep yang siap diambil
      const readyPrescriptionsResult = await query(
        `SELECT pr.id, pr.status, pr.ready_at as tanggal_siap, mr.diagnosis, u_doc.name as doctor_name
         FROM prescriptions pr
         JOIN medical_records mr ON pr.medical_record_id = mr.id
         JOIN doctors d ON mr.doctor_id = d.id
         JOIN users u_doc ON d.user_id = u_doc.id
         WHERE mr.patient_id = $1 AND pr.status = 'Siap Diambil'
         ORDER BY pr.ready_at DESC`,
        [patientId]
      );

      return NextResponse.json({
        role: 'pasien',
        latestAppointment: latestAppointmentResult.rows[0] || null,
        approvedNotifications: approvedNotificationsResult.rows,
        readyPrescriptions: readyPrescriptionsResult.rows,
      });
    }

    return apiError(400, 'Unknown role');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
