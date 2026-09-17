import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cellbound",
  description: "Enter the world of Cellbound.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
