import AppShell from '@/components/AppShell';

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="explore">{children}</AppShell>;
}
