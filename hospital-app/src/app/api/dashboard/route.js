import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { toLocalDateISO } from '@/lib/utils';

const DAY_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function GET() {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const role = auth.user.role;
    const today = new Date();
    const todayName = DAY_MAP[today.getDay()];
    const todayStr = toLocalDateISO(today);

    if (role === 'admin') {
      // 1. Jumlah janji Pending
      const pendingResult = await query("SELECT COUNT(*) as count FROM janji_temu WHERE status = 'Pending'");
      
      // 2. Antrean farmasi (Menunggu Diproses dan Siap Diambil)
      const menungguResult = await query("SELECT COUNT(*) as count FROM resep WHERE status = 'Menunggu Diproses'");
      const siapResult = await query("SELECT COUNT(*) as count FROM resep WHERE status = 'Siap Diambil'");

      // 3. Daftar dokter yang bertugas hari ini
      const doctorsTodayResult = await query(
        `SELECT DISTINCT u.id, u.nama_lengkap as name, p.nama_poli as polyclinic_name, jd.jam_mulai, jd.jam_selesai
         FROM jadwal_dokter jd
         JOIN users u ON jd.dokter_id = u.id
         JOIN dokter d ON jd.dokter_id = d.user_id
         LEFT JOIN poli p ON d.poli_id = p.id
         WHERE jd.hari = $1
         ORDER BY jd.jam_mulai ASC`,
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
      // 1. Jumlah janji Pending untuknya
      const pendingResult = await query(
        "SELECT COUNT(*) as count FROM janji_temu WHERE dokter_id = $1 AND status = 'Pending'",
        [auth.user.id]
      );

      // 2. Janji Approved hari ini
      const approvedTodayResult = await query(
        `SELECT jt.id, jt.tanggal_booking, jt.keluhan_singkat as keluhan,
                u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone,
                jd.jam_mulai, jd.jam_selesai
         FROM janji_temu jt
         JOIN users u_pat ON jt.pasien_id = u_pat.id
         JOIN jadwal_dokter jd ON jt.jadwal_id = jd.id
         WHERE jt.dokter_id = $1 AND jt.status = 'Approved' AND jt.tanggal_booking = $2
         ORDER BY jd.jam_mulai ASC`,
        [auth.user.id, todayStr]
      );

      // 3. 5 pasien terbaru yang diperiksa (ada di rekam_medis)
      const recentPatientsResult = await query(
        `SELECT rm.id, rm.created_at, rm.diagnosis,
                u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone,
                jt.tanggal_booking
         FROM rekam_medis rm
         JOIN users u_pat ON rm.pasien_id = u_pat.id
         JOIN janji_temu jt ON rm.janji_temu_id = jt.id
         WHERE rm.dokter_id = $1
         ORDER BY rm.created_at DESC
         LIMIT 5`,
        [auth.user.id]
      );

      // Akses cepat ke jadwal dokter
      const schedulesResult = await query(
        `SELECT * FROM jadwal_dokter WHERE dokter_id = $1 ORDER BY hari, jam_mulai`,
        [auth.user.id]
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
      // 1. Status janji terakhir
      const latestAppointmentResult = await query(
        `SELECT jt.*, u_doc.nama_lengkap as doctor_name, p.nama_poli as polyclinic_name,
                jd.hari, jd.jam_mulai, jd.jam_selesai
         FROM janji_temu jt
         JOIN users u_doc ON jt.dokter_id = u_doc.id
         JOIN dokter d ON jt.dokter_id = d.user_id
         LEFT JOIN poli p ON d.poli_id = p.id
         JOIN jadwal_dokter jd ON jt.jadwal_id = jd.id
         WHERE jt.pasien_id = $1
         ORDER BY jt.created_at DESC
         LIMIT 1`,
        [auth.user.id]
      );

      // 2. Notifikasi janji yang disetujui
      const approvedNotificationsResult = await query(
        `SELECT * FROM notifikasi 
         WHERE user_id = $1 AND (judul ILIKE '%disetujui%' OR judul ILIKE '%approved%')
         ORDER BY created_at DESC LIMIT 5`,
        [auth.user.id]
      );

      // 3. Resep yang siap diambil
      const readyPrescriptionsResult = await query(
        `SELECT r.id, r.status, r.tanggal_siap, rm.diagnosis, u_doc.nama_lengkap as doctor_name
         FROM resep r
         JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
         JOIN users u_doc ON rm.dokter_id = u_doc.id
         WHERE rm.pasien_id = $1 AND r.status = 'Siap Diambil'
         ORDER BY r.tanggal_siap DESC`,
        [auth.user.id]
      );

      return NextResponse.json({
        role: 'pasien',
        latestAppointment: latestAppointmentResult.rows[0] || null,
        approvedNotifications: approvedNotificationsResult.rows,
        readyPrescriptions: readyPrescriptionsResult.rows,
      });
    }

    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
