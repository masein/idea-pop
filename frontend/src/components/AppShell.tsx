'use client';

import React, { useState } from 'react';
import { usePathname } from '@/i18n/routing';
import Logo from './Logo';
import PenguinMascot from './PenguinMascot';

export type Section = 'profile' | 'explore' | 'library' | 'challenge';

/** Which nav item is active, derived from the current route. */
function sectionFromPath(path: string): Section | undefined {
  if (path.startsWith('/explore')) return 'explore';
  if (path.startsWith('/library')) return 'library';
  if (path.startsWith('/challenge')) return 'challenge';
  if (path.startsWith('/profile') || path.startsWith('/dashboard')) return 'profile';
  return undefined;
}

export interface AppShellProps {
  section?: Section;
  children: React.ReactNode;
  themesUnlocked?: boolean;
}

const sectionTint: Record<Section, string> = {
  profile: 'bg-tint-lime',
  explore: 'bg-tint-lime',
  library: 'bg-tint-cream',
  challenge: 'bg-tint-blue',
};

const navItems: Array<{
  id: Section;
  label: string;
  icon: string;
  activeClass: string;
}> = [
  { id: 'profile', label: 'My Profile', icon: '👤', activeClass: 'text-ink' },
  { id: 'explore', label: 'Exploring', icon: '🌿', activeClass: 'text-explore' },
  { id: 'library', label: 'Library', icon: '📚', activeClass: 'text-library' },
  { id: 'challenge', label: 'Challenges', icon: '⚡', activeClass: 'text-challenge' },
];

export default function AppShell({
  section = 'explore',
  children,
  themesUnlocked = false,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const activeSection = sectionFromPath(pathname) ?? section;
  const tint = sectionTint[activeSection];

  const sidebar = (
    <nav aria-label="Main navigation" className="flex flex-col h-full py-6 px-4 gap-6">
      <div className="ltr:pl-2 rtl:pr-2">
        <Logo size="md" showWordmark />
      </div>
      <ul className="flex flex-col gap-1 mt-2 flex-1" role="list">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <li key={item.id}>
              <a
                href={`/${item.id === 'profile' ? 'profile' : item.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 rounded-card px-3 py-2.5 font-body font-semibold text-sm transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  isActive
                    ? `${item.activeClass} bg-white/70 shadow-sm focus-visible:ring-ink/30`
                    : 'text-ink/50 hover:text-ink/80 hover:bg-white/40 focus-visible:ring-ink/20',
                ].join(' ')}
              >
                <span className="text-lg w-6 text-center flex-shrink-0 select-none" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden font-body">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-ink/10">
        {sidebar}
      </aside>

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
          'fixed inset-y-0 ltr:left-0 rtl:right-0 z-30 w-64 bg-white flex flex-col transition-transform duration-200 md:hidden',
          drawerOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full',
        ].join(' ')}
        aria-label="Main navigation"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="self-end m-3 p-1.5 rounded-full text-ink/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          aria-label="Close navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {sidebar}
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-white border-b border-ink/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-card text-ink/60 hover:text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size="sm" showWordmark />
        </header>

        {/* Scrollable content */}
        <main id="main-content" className={`flex-1 overflow-y-auto ${tint} pb-20`}>
          {children}
        </main>

        {/* Themes bar */}
        <div
          className="h-12 bg-tint-lavender border-t border-ink/10 flex items-center justify-center gap-4 text-sm text-ink/60 font-body flex-shrink-0"
          aria-label={themesUnlocked ? 'Themes' : 'Themes (locked until Level 4)'}
        >
          {themesUnlocked ? (
            <span>Themes</span>
          ) : (
            <span className="text-ink/80">Themes unlock at Level 4</span>
          )}
        </div>
      </div>

      {/* Floating penguin mascot */}
      <div className="fixed bottom-6 ltr:right-6 rtl:left-6 z-40">
        <PenguinMascot />
      </div>
    </div>
  );
}
