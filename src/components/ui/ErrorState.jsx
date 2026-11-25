import Link from 'next/link';

export default function ErrorState({
  code = '404',
  title = 'Halaman Tidak Ditemukan',
  description = 'Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.',
  primaryAction = { label: 'Kembali ke Beranda', href: '/' },
  secondaryAction = null,
  onRetry = null,
  retryLabel = 'Coba lagi',
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Latar gradien halus teal & slate (tanpa animasi berat) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(14, 124, 134, 0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(20, 184, 166, 0.15), transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg bg-slate-900/85 border border-slate-800 rounded-3xl p-7 sm:p-10 text-center shadow-2xl">
        {/* Brand Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src="/logo-rumah-sakit.svg"
            alt="Logo RS Digital Sehat"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl shadow-md"
          />
          <div className="text-left">
            <span className="block text-sm font-extrabold tracking-tight text-white leading-tight">
              RS Digital Sehat
            </span>
            <span className="block text-[11px] text-slate-400">
              Sistem Layanan Rumah Sakit
            </span>
          </div>
        </div>

        {/* Kode Status Besar (warna teal, bukan merah) */}
        <div className="text-6xl sm:text-7xl font-black tracking-tight text-teal-400 leading-none select-none">
          {code}
        </div>

        <h1 className="mt-4 text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          {title}
        </h1>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          {description}
        </p>

        {/* Tombol Aksi (tinggi minimal 40px) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0E7C86] hover:bg-teal-600 text-white text-sm font-bold shadow-lg shadow-teal-950/50 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              {retryLabel}
            </button>
          )}

          {primaryAction && primaryAction.href && (
            <Link
              href={primaryAction.href}
              className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center ${
                onRetry
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  : 'bg-[#0E7C86] hover:bg-teal-600 text-white shadow-lg shadow-teal-950/50'
              }`}
            >
              {primaryAction.label}
            </Link>
          )}

          {secondaryAction && secondaryAction.href && (
            <Link
              href={secondaryAction.href}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors inline-flex items-center justify-center"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
