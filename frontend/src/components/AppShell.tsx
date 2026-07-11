'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from '@/i18n/routing';
import Logo from './Logo';
import PenguinMascot from './PenguinMascot';
import { AVATARS } from '@/lib/avatars';

export type Section = 'profile' | 'explore' | 'library' | 'challenge' | 'studio';
type Persona = 'kid' | 'parent' | 'teacher';

// ── Route → active section / persona (works on the server via usePathname) ──────

function sectionFromPath(path: string): Section | undefined {
  if (path.startsWith('/explore')) return 'explore';
  if (path.startsWith('/library')) return 'library';
  if (path.startsWith('/challenge')) return 'challenge';
  if (path.startsWith('/studio')) return 'studio';
  if (path.startsWith('/profile') || path.startsWith('/dashboard')) return 'profile';
  return undefined;
}

function personaFromPath(path: string): Persona {
  if (path.startsWith('/dashboard/parent')) return 'parent';
  if (path.startsWith('/dashboard/teacher')) return 'teacher';
  return 'kid';
}

// ── Nav config per persona ──────────────────────────────────────────────────────

interface NavItem {
  id: Section | 'account';
  label: string;
  href: string;
  activeClass: string;
}

const KID_NAV: NavItem[] = [
  { id: 'profile', label: 'My profile', href: '/profile', activeClass: 'text-ink' },
  { id: 'explore', label: 'Exploring', href: '/explore', activeClass: 'text-explore' },
  { id: 'library', label: 'Library', href: '/library', activeClass: 'text-library' },
  { id: 'challenge', label: 'Challenges', href: '/challenges', activeClass: 'text-challenge' },
  { id: 'account', label: 'Account', href: '/profile', activeClass: 'text-ink' },
];
// The Machine Trainer classifier is a TOOL, not a section: it's reachable from
// the Library tool card and the in-mission Build-step embed, not the main nav.
// /studio/* keeps its Section entry so the page shell still gets its tint.

const PARENT_NAV: NavItem[] = [
  { id: 'profile', label: 'My profile', href: '/dashboard/parent', activeClass: 'text-ink' },
  { id: 'account', label: 'Account', href: '/dashboard/parent#account', activeClass: 'text-ink' },
];

const TEACHER_NAV: NavItem[] = [
  { id: 'profile', label: 'My profile', href: '/dashboard/teacher', activeClass: 'text-ink' },
  { id: 'explore', label: 'Exploring', href: '/explore', activeClass: 'text-explore' },
  { id: 'library', label: 'Library', href: '/library', activeClass: 'text-library' },
  { id: 'challenge', label: 'Challenges', href: '/challenges', activeClass: 'text-challenge' },
];

const NAV: Record<Persona, NavItem[]> = { kid: KID_NAV, parent: PARENT_NAV, teacher: TEACHER_NAV };

const sectionTint: Record<Section, string> = {
  profile: 'bg-tint-lime',
  explore: 'bg-tint-lime',
  library: 'bg-tint-cream',
  challenge: 'bg-tint-blue',
  studio: 'bg-tint-lavender',
};

// ── Inline line icons ───────────────────────────────────────────────────────────

function NavIcon({ id, className }: { id: NavItem['id']; className?: string }) {
  const common = {
    className,
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (id) {
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'explore':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </svg>
      );
    case 'library':
      return (
        <svg {...common}>
          <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
        </svg>
      );
    case 'challenge':
      return (
        <svg {...common}>
          <path d="M5 15c-1 2-1 4-1 4s2 0 4-1M14 4c3 1 6 4 6 6 0 3-4 7-8 9l-3-3c2-4 6-8 9-8" />
          <circle cx="15" cy="9" r="1.5" />
        </svg>
      );
    case 'account':
      return (
        <svg {...common}>
          <circle cx="10" cy="8" r="3" />
          <path d="M4 20a6 6 0 0 1 10-4.5" />
          <circle cx="18" cy="16" r="2.2" />
          <path d="M18 13v-1M18 20v-1M21 16h-1M15 16h-1" />
        </svg>
      );
  }
}

// ── Sidebar ─────────────────────────────────────────────────────────────────────

function AppShellInner({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kid, setKid] = useState<{ nickname: string; avatar_id: string } | null>(null);

  const persona = personaFromPath(pathname);
  const activeSection = sectionFromPath(pathname) ?? section;
  const items = NAV[persona];
  const tint = sectionTint[activeSection];
  const showUpgrade = persona === 'kid' || persona === 'parent';

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kidProfile');
      if (raw) {
        const p = JSON.parse(raw) as { nickname?: string; avatar_id?: string };
        if (p.nickname) setKid({ nickname: p.nickname, avatar_id: p.avatar_id ?? '' });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const displayName =
    persona === 'kid' ? (kid?.nickname ?? 'Explorer') : persona === 'teacher' ? 'Teacher' : 'Parent';
  const avatar = kid ? AVATARS.find((a) => a.id === kid.avatar_id) : undefined;

  const sidebar = (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-4 px-3 py-5">
      {/* Avatar + name header */}
      <div className="flex flex-col items-center gap-2 rounded-[1.5rem] bg-white px-3 py-4 shadow-sm">
        <span
          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-3xl ring-4 ring-tint-lime"
          style={{ backgroundColor: avatar?.bg ?? '#FBF7D5' }}
          aria-hidden="true"
        >
          {persona === 'kid' && avatar?.img ? (
            <Image src={avatar.img} alt="" width={64} height={64} className="h-full w-full object-contain" />
          ) : (
            <span>{persona === 'kid' ? (avatar?.emoji ?? '🐧') : persona === 'teacher' ? '🧑‍🏫' : '🧑'}</span>
          )}
        </span>
        <span className="font-display text-base font-bold text-ink">{displayName}</span>
      </div>

      {/* Nav */}
      <ul className="flex flex-1 flex-col gap-1" role="list">
        {items.map((item) => {
          const isActive = item.id !== 'account' && activeSection === item.id;
          return (
            <li key={`${item.id}-${item.href}`} className="relative">
              <a
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center justify-between gap-3 rounded-card px-3 py-2.5 font-body text-sm font-semibold transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  isActive
                    ? `${item.activeClass} bg-white shadow-sm focus-visible:ring-ink/30`
                    : 'text-ink/50 hover:bg-white/50 hover:text-ink/80 focus-visible:ring-ink/20',
                ].join(' ')}
              >
                <span>{item.label}</span>
                <NavIcon id={item.id} className="shrink-0" />
              </a>
              {/* Floating section indicator — protrudes into the content seam */}
              {isActive && (
                <span
                  className="pointer-events-none absolute top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 ltr:-right-8 rtl:-left-8 md:flex"
                  aria-hidden="true"
                >
                  <NavIcon id={item.id} className={`h-6 w-6 ${item.activeClass}`} />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Upgrade card (kid + parent) */}
      {showUpgrade && (
        <a
          href={persona === 'parent' ? '/dashboard/parent#account' : '/profile'}
          className="flex flex-col items-center gap-2 rounded-[1.25rem] bg-tint-lime p-3 text-center transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
        >
          <Image src="/kid/upgrade-girl.png" alt="" width={72} height={72} className="h-16 w-auto" aria-hidden="true" />
          <span className="font-body text-xs font-semibold text-ink/70">
            Unlock full access to the Idea Pop platform
          </span>
          <span className="rounded-pill bg-explore px-5 py-1.5 font-display text-sm font-bold text-white">
            Upgrade
          </span>
        </a>
      )}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-tint-lime font-body">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col md:flex">{sidebar}</aside>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink/30 md:hidden"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          'fixed inset-y-0 z-30 flex w-64 flex-col bg-tint-lime transition-transform duration-200 ltr:left-0 rtl:right-0 md:hidden',
          drawerOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full',
        ].join(' ')}
        aria-label="Main navigation"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="m-3 self-end rounded-full p-1.5 text-ink/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          aria-label="Close navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {sidebar}
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-ink/10 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-card p-2 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size="sm" showWordmark />
        </header>

        {/* Scrollable content — rounded card with the section tint + top-right logo */}
        <main
          id="main-content"
          className={`relative m-2 flex-1 overflow-y-auto rounded-[1.75rem] pb-20 md:m-3 ${tint}`}
        >
          <div className="pointer-events-none absolute right-5 top-4 z-10 hidden md:block">
            <span className="pointer-events-auto">
              <Logo size="sm" showWordmark />
            </span>
          </div>
          {children}
        </main>
      </div>

      {/* Floating penguin mascot (flips to the left in RTL) */}
      <div className="fixed bottom-6 z-40 ltr:right-6 rtl:left-6">
        <PenguinMascot />
      </div>
    </div>
  );
}

// ── Public component (keeps the `section` prop for callers) ──────────────────────

export interface AppShellProps {
  section?: Section;
  children: React.ReactNode;
}

export default function AppShell({ section = 'explore', children }: AppShellProps) {
  return <AppShellInner section={section}>{children}</AppShellInner>;
}
