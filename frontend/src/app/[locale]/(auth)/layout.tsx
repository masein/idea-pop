import Logo from "@/components/Logo";
import { Link } from "@/i18n/routing";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-tint-lime px-4 py-8">
      <Link href="/" aria-label="Idea Pop home" className="mb-8">
        <Logo size="md" showWordmark />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
