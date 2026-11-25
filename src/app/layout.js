import "./globals.css";

export const metadata = {
  title: "RS Digital Sehat - Digitalisasi Rumah Sakit 2026",
  description: "Aplikasi web Digitalisasi Rumah Sakit untuk Tugas Final Praktikum Pemrograman Web 2026",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
