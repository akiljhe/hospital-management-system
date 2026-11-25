import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateEmail, validateRequired, sanitize } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    const nameErr = validateRequired(name, 'Nama lengkap');
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
    const emailErr = validateEmail(email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    // Check unique email exclude self
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email sudah digunakan oleh user lain' }, { status: 409 });
    }

    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
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
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    if (id === auth.user.id) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'User tidak dapat dihapus karena memiliki data terkait (janji temu, rekam medis, dll)' }, { status: 400 });
  }
}
