"use client";

import { useEffect } from "react";

/**
 * The root layout sets <html lang> and <html dir> on the server. Switching between /en and /fa on the client does not
 * re-render it, so the page kept the old direction (and the Persian font rules keyed on lang) until a reload.
 * This keeps both attributes in step with the active locale.
 */
export default function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
