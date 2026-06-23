import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Idea Pop — Ask nature. Build with your hands.",
  description:
    "A web learning platform for kids 8+. Watch, learn, and solve one real problem every week with design thinking and nature's secrets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="font-body text-ink antialiased">{children}</body>
    </html>
  );
}
