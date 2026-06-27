import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Idea Pop — Ask nature. Build with your hands.",
  description:
    "A web learning platform for kids 8+. Watch, learn, and solve one real problem every week with design thinking and nature's secrets.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = locale === "fa" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} className={`${baloo.variable} ${nunito.variable}`}>
      <body className="font-body text-ink antialiased">
        <a href="#main-content" className="skip-nav">
          {locale === "fa" ? "رفتن به محتوا" : "Skip to content"}
        </a>
        {children}
      </body>
    </html>
  );
}
