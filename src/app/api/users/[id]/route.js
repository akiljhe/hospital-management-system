import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  validateEmail,
  validateRequired,
  validateMaxLength,
  validateNoHtmlTags,
  validateOptionalPassword,
  sanitize,
} from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    const result = await query(
      `SELECT u.id, u.email, u.name, u.name as nama_lengkap, 
              u.role, u.phone, u.phone as telepon, u.address, u.address as alamat, u.created_at,
              d.id as doctor_id, d.polyclinic_id as poli_id, p.name as polyclinic_name, p.name as nama_poli,
              pat.id as patient_id
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
       LEFT JOIN patients pat ON u.id = pat.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'User tidak ditemukan');
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;
    const body = await request.json();
    const name = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    const role = sanitize(body.role);
    const phone = sanitize(body.phone || body.telepon);
    const address = sanitize(body.address || body.alamat);
    const polyclinic_id = body.polyclinic_id || body.poli_id;
    const password = body.password;

    const nameErr = validateRequired(name, 'Nama lengkap')
      || validateMaxLength(name, 255, 'Nama lengkap')
      || validateNoHtmlTags(name, 'Nama lengkap');
    if (nameErr) return apiError(400, nameErr);
    const emailErr = validateEmail(email);
    if (emailErr) return apiError(400, emailErr);
    const phoneErr = validateMaxLength(phone, 20, 'Nomor telepon');
    if (phoneErr) return apiError(400, phoneErr);
    const addrErr = validateMaxLength(address, 1000, 'Alamat')
      || validateNoHtmlTags(address, 'Alamat');
    if (addrErr) return apiError(400, addrErr);
    const passErr = validateOptionalPassword(password);
    if (passErr) return apiError(400, passErr);

    // Check unique email exclude self
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, id]
    );
    if (existing.rows.length > 0) {
      return apiError(409, 'Email sudah digunakan oleh user lain');
    }

    if (password && password.trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await query(
        `UPDATE users
         SET name = $1, email = $2, role = $3, phone = $4, address = $5, password = $6, updated_at = NOW()
         WHERE id = $7`,
        [name, email.toLowerCase(), role, phone, address, hashedPassword, id]
      );
    } else {
      await query(
        `UPDATE users
         SET name = $1, email = $2, role = $3, phone = $4, address = $5, updated_at = NOW()
         WHERE id = $6`,
        [name, email.toLowerCase(), role, phone, address, id]
      );
    }

    // Jika dokter, update polyclinic_id
    if (role === 'dokter' && polyclinic_id) {
      await query(
        `INSERT INTO doctors (user_id, polyclinic_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET polyclinic_id = $2`,
        [id, polyclinic_id]
      );
    } else if (role === 'pasien') {
      await query(
        `INSERT INTO patients (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [id]
      );
    }

    return NextResponse.json({ message: 'User berhasil diperbarui' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input melebihi batas panjang karakter yang diizinkan');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;

    if (id === auth.user.id) {
      return apiError(400, 'Anda tidak dapat menghapus akun Anda sendiri');
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return apiError(404, 'User tidak ditemukan');
    }

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    return apiError(400, 'User tidak dapat dihapus karena memiliki data terkait (janji temu, rekam medis, dll)');
  }
}
