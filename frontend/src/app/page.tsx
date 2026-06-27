import { redirect } from "next/navigation";

// All real routes live under /[locale]. The middleware redirects / → /en,
// but this fallback keeps typecheck & static analysis clean.
export default function RootPage() {
  redirect("/en");
}
