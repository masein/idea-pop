import type { Metadata } from "next";
import {
  ADLaM_Display,
  Baloo_2,
  Cherry_Bomb_One,
  Montserrat,
  Nunito,
  Vazirmatn,
} from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Marketing fonts (landing pages keep these).
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
// Marketing body/nav per the hero responsive spec (single 400 weight).
const adlam = ADLaM_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-adlam",
  display: "swap",
});

// App fonts — playful display + Montserrat body (Latin/EN).
const cherry = Cherry_Bomb_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cherry",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});
// Persian companion (fa locale) — carries the glyphs the app fonts lack.
const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-vazir",
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
    <html
      lang={locale}
      dir={dir}
      className={`${baloo.variable} ${nunito.variable} ${adlam.variable} ${cherry.variable} ${montserrat.variable} ${vazir.variable}`}
    >
      <body className="font-body text-ink antialiased">
        <a href="#main-content" className="skip-nav">
          {locale === "fa" ? "رفتن به محتوا" : "Skip to content"}
        </a>
        {children}
      </body>
    </html>
  );
}
