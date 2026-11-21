import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateEmail, validatePassword, validateRequired, sanitize } from '@/lib/validation';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = `
      SELECT u.id, u.username, u.email, u.nama_lengkap, u.nama_lengkap as name, 
             u.role, u.telepon, u.telepon as phone, u.alamat, u.alamat as address, u.created_at,
             d.poli_id, p.nama_poli as polyclinic_name
      FROM users u
      LEFT JOIN dokter d ON u.id = d.user_id
      LEFT JOIN poli p ON d.poli_id = p.id
    `;
    const params = [];

    if (role) {
      params.push(role);
      sql += ` WHERE u.role = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ users: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const nama_lengkap = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    let username = sanitize(body.username);
    const password = body.password || 'password123';
    const role = sanitize(body.role || 'pasien');
    const telepon = sanitize(body.phone || body.telepon);
    const alamat = sanitize(body.address || body.alamat);
    const poli_id = body.poli_id || body.polyclinic_id;

    const nameErr = validateRequired(nama_lengkap, 'Nama lengkap');
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
    const emailErr = validateEmail(email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
    const passErr = validatePassword(password);
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });

    if (!['admin', 'dokter', 'pasien'].includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    if (role === 'dokter' && !poli_id) {
      return NextResponse.json({ error: 'Poli wajib dipilih untuk dokter' }, { status: 400 });
    }

    if (!username) {
      username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }

    // Check unique email/username
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email atau username sudah digunakan' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await query(
      `INSERT INTO users (username, email, password_hash, nama_lengkap, role, telepon, alamat)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, nama_lengkap, role, telepon, alamat, created_at`,
      [username, email.toLowerCase(), hashedPassword, nama_lengkap, role, telepon || null, alamat || null]
    );

    const user = userResult.rows[0];

    // Jika dokter, insert ke tabel dokter
    if (role === 'dokter' && poli_id) {
      await query(
        `INSERT INTO dokter (user_id, poli_id)
         VALUES ($1, $2)`,
        [user.id, poli_id]
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
