import AppShell from '@/components/AppShell';

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="library">{children}</AppShell>;
}
