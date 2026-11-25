export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email wajib diisi';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Format email tidak valid';
  if (email.length > 255) return 'Email terlalu panjang';
  return null;
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password wajib diisi';
  if (password.length < 6) return 'Password minimal 6 karakter';
  if (password.length > 100) return 'Password terlalu panjang';
  return null;
}

export function validateRequired(value, fieldName) {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} wajib diisi`;
  }
  return null;
}

export function validatePhone(phone) {
  if (!phone) return null; // optional
  if (typeof phone !== 'string') return 'Nomor telepon tidak valid';
  const re = /^[0-9+\-() ]{8,20}$/;
  if (!re.test(phone)) return 'Format nomor telepon tidak valid';
  return null;
}

export function validateDate(dateStr, fieldName = 'Tanggal') {
  if (!dateStr) return `${fieldName} wajib diisi`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `${fieldName} tidak valid`;
  return null;
}

export function validateInteger(id, fieldName = 'ID') {
  if (id === undefined || id === null || isNaN(Number(id)) || Number(id) <= 0) {
    return `${fieldName} tidak valid`;
  }
  return null;
}

export function validateUUID(id, fieldName = 'ID') {
  if (!id) return `${fieldName} wajib diisi`;
  return null;
}

export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

export function validateTime(timeStr, fieldName = 'Waktu') {
  if (!timeStr) return `${fieldName} wajib diisi`;
  const re = /^([01]\d|2[0-3]):([0-5]\d)(:00)?$/;
  if (!re.test(timeStr)) return `${fieldName} format tidak valid (HH:MM)`;
  return null;
}

export function validateMaxLength(value, max, fieldName) {
  if (typeof value === 'string' && value.length > max) {
    return `${fieldName} maksimal ${max} karakter`;
  }
  return null;
}

export function validateNoHtmlTags(value, fieldName) {
  if (typeof value === 'string' && /[<>]/.test(value)) {
    return `${fieldName} tidak boleh mengandung karakter < atau >`;
  }
  return null;
}

export function validateOptionalPassword(password) {
  if (password === undefined || password === null || password === '') return null;
  if (typeof password !== 'string') return 'Password baru minimal 6 karakter';
  const trimmed = password.trim();
  if (trimmed.length < 6) return 'Password baru minimal 6 karakter';
  if (trimmed.length > 100) return 'Password baru maksimal 100 karakter';
  return null;
}
