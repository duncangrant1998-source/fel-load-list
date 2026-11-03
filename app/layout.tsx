import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FEL Load List",
  description: "Warehouse load list tracker for FEL Motorsports",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fel-bg font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
