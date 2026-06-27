import AppShell from '@/components/AppShell';

export default function ChallengeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="challenge">{children}</AppShell>;
}
