'use client';

import AppShell from '@/components/AppShell';
import { usePathname } from '@/i18n/routing';
import { PUBLIC_PREVIEW } from '@/lib/publicPreview';

/** One persistent app shell for every (app) page, so the menu's circle slides between sections
 *  instead of the whole shell reloading. The public /challenges experience (signed out) is a
 *  marketing page and goes without it. */
export default function AppShellGate({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  // (On the public preview everyone gets the in-app missions list, so it keeps the shell.)
  if (!signedIn && pathname === '/challenges' && !PUBLIC_PREVIEW) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
