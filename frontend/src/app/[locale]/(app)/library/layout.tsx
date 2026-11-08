import ComingSoonGate from "@/components/preview/ComingSoonGate";

// Public preview: this section is faded behind Coming Soon on the live site.
// Localhost (no preview) shows it exactly as before.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ComingSoonGate kind="library">{children}</ComingSoonGate>;
}
