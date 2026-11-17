import { cookies } from 'next/headers';
import { query } from './db';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-key-hospital-2026';
const SESSION_COOKIE = 'hospital_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function signToken(payload) {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  try {
    const [encoded, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const data = Buffer.from(encoded, 'base64url').toString();
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function createSession(userId) {
  const cookieStore = await cookies();
  const token = signToken({ userId, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.exp < Date.now()) return null;

  try {
    const result = await query(
      `SELECT id, username, email, nama_lengkap, nama_lengkap as name, role, telepon, telepon as phone, alamat, alamat as address, foto 
       FROM users WHERE id = $1`,
      [payload.userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function requireAuth(allowedRoles = []) {
  const user = await getSession();
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user };
}
