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
      `SELECT u.id, u.username, u.email, u.nama_lengkap, u.nama_lengkap as name, 
              u.role, u.telepon, u.telepon as phone, u.alamat, u.alamat as address, u.created_at,
              d.poli_id, p.nama_poli as polyclinic_name
       FROM users u
       LEFT JOIN dokter d ON u.id = d.user_id
       LEFT JOIN poli p ON d.poli_id = p.id
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
    const nama_lengkap = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    const role = sanitize(body.role);
    const telepon = sanitize(body.phone || body.telepon);
    const alamat = sanitize(body.address || body.alamat);
    const poli_id = body.poli_id || body.polyclinic_id;
    const password = body.password;

    const nameErr = validateRequired(nama_lengkap, 'Nama lengkap');
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
         SET nama_lengkap = $1, email = $2, role = $3, telepon = $4, alamat = $5, password_hash = $6
         WHERE id = $7`,
        [nama_lengkap, email.toLowerCase(), role, telepon, alamat, hashedPassword, id]
      );
    } else {
      await query(
        `UPDATE users
         SET nama_lengkap = $1, email = $2, role = $3, telepon = $4, alamat = $5
         WHERE id = $6`,
        [nama_lengkap, email.toLowerCase(), role, telepon, alamat, id]
      );
    }

    // Jika dokter, update poli_id
    if (role === 'dokter' && poli_id) {
      await query(
        `INSERT INTO dokter (user_id, poli_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET poli_id = $2`,
        [id, poli_id]
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

    if (parseInt(id, 10) === auth.user.id) {
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
