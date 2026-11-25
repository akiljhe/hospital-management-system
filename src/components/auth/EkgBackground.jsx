// Konfigurasi animasi EKG — ubah konstanta di bawah untuk menyesuaikan tampilan
export const EKG_CONFIG = {
  color: '#0E7C86', // Warna teal selaras logo RS Digital Sehat
  glowColor: 'rgba(14, 124, 134, 0.7)', // Warna efek glow (drop-shadow)
  primary: {
    durationSec: 5.5, // Kecepatan gambar garis utama (detik per siklus)
    opacityDesktop: 0.45, // Opasitas di layar >= 640px (0.35 - 0.5)
    opacityMobile: 0.28, // Opasitas lebih tipis di layar < 640px
    strokeWidthDesktop: 2,
    strokeWidthMobile: 1.35,
  },
  secondary: {
    durationSec: 8.5, // Kecepatan garis kedua (lebih pelan untuk efek kedalaman)
    delaySec: 1.4, // Jeda awal agar fase tidak bertumpuk
    opacityDesktop: 0.28,
    opacityMobile: 0.16,
    strokeWidthDesktop: 1.25,
    strokeWidthMobile: 0.9,
  },
};

// Pola gelombang EKG autentik (P, QRS, T) berulang 3 siklus melintasi 0..1440
const PRIMARY_EKG_PATH =
  'M 0 120 ' +
  // Siklus 1 (0..480)
  'L 110 120 Q 125 104 140 120 L 162 120 L 170 132 L 184 38 L 198 156 L 210 120 L 242 120 Q 264 90 288 120 L 480 120 ' +
  // Siklus 2 (480..960)
  'L 590 120 Q 605 104 620 120 L 642 120 L 650 132 L 664 38 L 678 156 L 690 120 L 722 120 Q 744 90 768 120 L 960 120 ' +
  // Siklus 3 (960..1440)
  'L 1070 120 Q 1085 104 1100 120 L 1122 120 L 1130 132 L 1144 38 L 1158 156 L 1170 120 L 1202 120 Q 1224 90 1248 120 L 1440 120';

// Lapisan kedua sedikit lebih rendah & bergeser fase untuk kesan kedalaman
const SECONDARY_EKG_PATH =
  'M 0 156 ' +
  'L 230 156 Q 243 144 256 156 L 274 156 L 281 166 L 293 92 L 305 184 L 315 156 L 342 156 Q 361 132 382 156 L 720 156 ' +
  'L 950 156 Q 963 144 976 156 L 994 156 L 1001 166 L 1013 92 L 1025 184 L 1035 156 L 1062 156 Q 1081 132 1102 156 L 1440 156';

export default function EkgBackground({ className = '' }) {
  const { color, glowColor, primary, secondary } = EKG_CONFIG;

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none flex items-center justify-center ${className}`}
      aria-hidden="true"
      data-testid="ekg-background"
      style={{
        '--ekg-color': color,
        '--ekg-glow': glowColor,
        '--ekg-dur-1': `${primary.durationSec}s`,
        '--ekg-dur-2': `${secondary.durationSec}s`,
        '--ekg-delay-2': `${secondary.delaySec}s`,
        '--ekg-op-1': primary.opacityDesktop,
        '--ekg-op-1-sm': primary.opacityMobile,
        '--ekg-op-2': secondary.opacityDesktop,
        '--ekg-op-2-sm': secondary.opacityMobile,
        '--ekg-sw-1': primary.strokeWidthDesktop,
        '--ekg-sw-1-sm': primary.strokeWidthMobile,
        '--ekg-sw-2': secondary.strokeWidthDesktop,
        '--ekg-sw-2-sm': secondary.strokeWidthMobile,
      }}
    >
      <style>{`
        @keyframes ekg-draw-fade {
          0% {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
          6% {
            opacity: var(--ekg-target-op);
          }
          76% {
            stroke-dashoffset: 0;
            opacity: var(--ekg-target-op);
          }
          92% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
          100% {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
        }

        .ekg-line-primary {
          --ekg-target-op: var(--ekg-op-1);
          stroke: var(--ekg-color);
          stroke-width: var(--ekg-sw-1);
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          filter: drop-shadow(0 0 6px var(--ekg-glow));
          animation: ekg-draw-fade var(--ekg-dur-1) linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .ekg-line-secondary {
          --ekg-target-op: var(--ekg-op-2);
          stroke: var(--ekg-color);
          stroke-width: var(--ekg-sw-2);
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          filter: drop-shadow(0 0 4px var(--ekg-glow));
          animation: ekg-draw-fade var(--ekg-dur-2) linear var(--ekg-delay-2) infinite;
          will-change: stroke-dashoffset, opacity;
        }

        @media (max-width: 639px) {
          .ekg-line-primary {
            --ekg-target-op: var(--ekg-op-1-sm);
            stroke-width: var(--ekg-sw-1-sm);
          }
          .ekg-line-secondary {
            --ekg-target-op: var(--ekg-op-2-sm);
            stroke-width: var(--ekg-sw-2-sm);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ekg-line-primary {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            opacity: var(--ekg-target-op) !important;
          }
          .ekg-line-secondary {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            opacity: var(--ekg-target-op) !important;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="w-full h-56 sm:h-72 lg:h-80"
        fill="none"
      >
        {/* Lapisan 2: Garis tipis lebih pelan di belakang untuk kedalaman */}
        <path
          d={SECONDARY_EKG_PATH}
          pathLength="1000"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="ekg-line-secondary"
        />

        {/* Lapisan 1: Garis EKG utama */}
        <path
          d={PRIMARY_EKG_PATH}
          pathLength="1000"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="ekg-line-primary"
        />
      </svg>
    </div>
  );
}
