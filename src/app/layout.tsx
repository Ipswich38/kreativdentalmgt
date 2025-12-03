import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental Practice Management System",
  description: "Professional dental clinic management software for Philippine healthcare providers",
  keywords: "dental management, practice software, appointment scheduling, patient records, Philippines, healthcare",
  authors: [{ name: "Dental Management System" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
