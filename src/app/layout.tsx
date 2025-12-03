import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KreativDental Management System",
  description: "Premium dental practice management software built for modern clinics",
  keywords: "dental management, practice software, appointment scheduling, patient records",
  authors: [{ name: "KreativDental" }],
  viewport: "width=device-width, initial-scale=1",
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
