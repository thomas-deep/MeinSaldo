import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Finanz-Auswertung",
  description: "Detaillierte Aufbereitung von Einnahmen und Ausgaben aus Konto-Exporten",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-fira-sans), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
