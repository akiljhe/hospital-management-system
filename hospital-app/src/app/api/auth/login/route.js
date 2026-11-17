import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = sanitize(body.email || body.username || '');
    const password = body.password;

    // Validate
    const errors = [];
    const idErr = validateRequired(identifier, 'Email atau Username');
    if (idErr) errors.push(idErr);
    const passErr = validateRequired(password, 'Password');
    if (passErr) errors.push(passErr);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // Find user by email or username
    const result = await query(
      `SELECT id, username, email, password_hash, nama_lengkap, role, telepon, alamat, foto 
       FROM users 
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Email/username atau password salah' }, { status: 401 });
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Email/username atau password salah' }, { status: 401 });
    }

    // Create session
    await createSession(user.id);

    const { password_hash: _, ...userData } = user;
    userData.name = user.nama_lengkap;
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
