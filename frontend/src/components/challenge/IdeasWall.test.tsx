import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import IdeasWallTab from './IdeasWallTab';
import IdeaCard from './IdeaCard';
import en from '../../../messages/en.json';

function render(ui: ReactElement) {
  return rtlRender(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// ── Mock API client ──────────────────────────────────────────────────────────

vi.mock('@/lib/api/client', () => ({
  fetchIdeas: vi.fn(),
  reactToIdea: vi.fn(),
  remixIdea: vi.fn(),
}));

import * as client from '@/lib/api/client';

const MOCK_IDEA = {
  id: 'idea-1',
  challenge_id: 'c-1',
  author_nickname: 'Aria',
  author_avatar_id: '🦋',
  project_photo_url: null,
  caption: 'A bridge made from sticks!',
  clap_count: 3,
  star_count: 1,
  lightbulb_count: 2,
  remix_count: 0,
  created_at: '2026-06-27T00:00:00Z',
};

// ── IdeasWallTab: locked state ────────────────────────────────────────────────

describe('IdeasWallTab — locked state', () => {
  it('shows the locked card when wallUnlocked=false', () => {
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={false}
        onWriteMyIdea={() => {}}
      />
    );

    expect(screen.getByTestId('wall-locked')).toBeInTheDocument();
    expect(screen.getByTestId('write-my-idea-cta')).toBeInTheDocument();
    expect(screen.getByText(/Send your idea first/i)).toBeInTheDocument();
    expect(screen.getByText(/Every idea is checked by a grown-up/i)).toBeInTheDocument();
  });

  it('calls onWriteMyIdea when the CTA is clicked', () => {
    const onWriteMyIdea = vi.fn();
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={false}
        onWriteMyIdea={onWriteMyIdea}
      />
    );

    fireEvent.click(screen.getByTestId('write-my-idea-cta'));
    expect(onWriteMyIdea).toHaveBeenCalledOnce();
  });

  it('does NOT fetch ideas when locked', () => {
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={false}
        onWriteMyIdea={() => {}}
      />
    );

    expect(client.fetchIdeas).not.toHaveBeenCalled();
  });
});

// ── IdeasWallTab: unlocked state ──────────────────────────────────────────────

describe('IdeasWallTab — unlocked state', () => {
  beforeEach(() => {
    vi.mocked(client.fetchIdeas).mockResolvedValue([MOCK_IDEA]);
  });

  it('fetches and renders ideas when unlocked', async () => {
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={true}
        onWriteMyIdea={() => {}}
      />
    );

    expect(screen.getByTestId('wall-unlocked')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('idea-card')).toBeInTheDocument();
    });
    expect(screen.getByText('A bridge made from sticks!')).toBeInTheDocument();
  });

  it('shows the safety note banner when unlocked', async () => {
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={true}
        onWriteMyIdea={() => {}}
      />
    );

    expect(screen.getByTestId('safety-note')).toBeInTheDocument();
  });

  it('toggles sort and re-fetches', async () => {
    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={true}
        onWriteMyIdea={() => {}}
      />
    );

    await waitFor(() => expect(client.fetchIdeas).toHaveBeenCalledWith('c-1', 'newest'));

    fireEvent.click(screen.getByTestId('sort-remixed'));
    await waitFor(() => expect(client.fetchIdeas).toHaveBeenCalledWith('c-1', 'most_remixed'));
  });

  it('shows restricted banner when remixIdea throws restricted error', async () => {
    const restrictedError = Object.assign(new Error('restricted'), { code: 'restricted' });
    vi.mocked(client.remixIdea).mockRejectedValue(restrictedError);

    render(
      <IdeasWallTab
        challengeId="c-1"
        ageMode="young"
        wallUnlocked={true}
        onWriteMyIdea={() => {}}
      />
    );

    await waitFor(() => expect(screen.getByTestId('idea-card')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('remix-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('restricted-banner')).toBeInTheDocument();
    });
    expect(screen.getByText(/grown-up needs to turn on sharing/i)).toBeInTheDocument();
  });
});

// ── IdeaCard ──────────────────────────────────────────────────────────────────

describe('IdeaCard', () => {
  const onReact = vi.fn();
  const onRemix = vi.fn();

  it('renders nickname and caption', () => {
    render(<IdeaCard idea={MOCK_IDEA} onReact={onReact} onRemix={onRemix} />);

    expect(screen.getByText('Aria')).toBeInTheDocument();
    expect(screen.getByText('A bridge made from sticks!')).toBeInTheDocument();
  });

  it('calls onReact with correct reaction type', () => {
    render(<IdeaCard idea={MOCK_IDEA} onReact={onReact} onRemix={onRemix} />);

    fireEvent.click(screen.getByTestId('react-clap'));
    expect(onReact).toHaveBeenCalledWith('idea-1', 'clap');

    fireEvent.click(screen.getByTestId('react-star'));
    expect(onReact).toHaveBeenCalledWith('idea-1', 'star');

    fireEvent.click(screen.getByTestId('react-lightbulb'));
    expect(onReact).toHaveBeenCalledWith('idea-1', 'lightbulb');
  });

  it('calls onRemix when remix button clicked', () => {
    render(<IdeaCard idea={MOCK_IDEA} onReact={onReact} onRemix={onRemix} />);

    fireEvent.click(screen.getByTestId('remix-btn'));
    expect(onRemix).toHaveBeenCalledWith('idea-1');
  });

  it('disables remix button while remixing', () => {
    render(<IdeaCard idea={MOCK_IDEA} onReact={onReact} onRemix={onRemix} remixing />);

    expect(screen.getByTestId('remix-btn')).toBeDisabled();
  });
});
