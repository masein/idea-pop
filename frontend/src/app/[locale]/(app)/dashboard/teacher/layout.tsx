import ComingSoonGate from "@/components/preview/ComingSoonGate";

// Public preview: a signed-in home shows "We're upgrading IDEA POP" over the faded page on
// the live site (signing out and the menu stay usable). Localhost shows it as before.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ComingSoonGate variant="profile">{children}</ComingSoonGate>;
}
