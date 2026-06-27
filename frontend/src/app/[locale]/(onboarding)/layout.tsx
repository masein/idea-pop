import Logo from "@/components/Logo";
import { Link } from "@/i18n/routing";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-tint-lime">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Idea Pop home">
          <Logo size="sm" showWordmark />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-12">
        {children}
      </main>
    </div>
  );
}
