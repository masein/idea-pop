import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KidXpCard from './KidXpCard';

const BASE_PROGRESS = {
  level: 2,
  total_xp: 180,
  xp_this_level: 30,
  xp_to_next_level: 150,
  rank: 'Maker',
  explore_xp: 50,
  learn_xp: 80,
  solve_xp: 50,
  creative_cycle_active: false,
  stickers: [],
  medals: { bronze: 1, silver: 0, gold: 0 },
};

describe('KidXpCard — older mode', () => {
  it('shows XP numbers and bar label', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="older" />);

    expect(screen.getByTestId('xp-numbers')).toBeInTheDocument();
    expect(screen.getByTestId('xp-bar-label')).toBeInTheDocument();
    expect(screen.getByTestId('xp-bar-label').textContent).toContain('30/150');
  });

  it('shows the XP breakdown grid', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="older" />);

    expect(screen.getByTestId('xp-breakdown')).toBeInTheDocument();
    // 80 XP is unique (learn_xp), so this confirms the breakdown renders real values
    expect(screen.getByText('80 XP')).toBeInTheDocument(); // learn
    expect(screen.getAllByText('50 XP')).toHaveLength(2); // explore + solve both = 50
  });

  it('does NOT render the visual jar in older mode', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="older" />);

    expect(screen.queryByTestId('xp-jar')).not.toBeInTheDocument();
  });

  it('shows rank label', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="older" />);

    expect(screen.getByTestId('rank-label').textContent).toContain('Maker');
  });
});

describe('KidXpCard — young mode', () => {
  it('does NOT show XP numbers', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="young" />);

    expect(screen.queryByTestId('xp-numbers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('xp-bar-label')).not.toBeInTheDocument();
  });

  it('shows the visual jar (no numbers)', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="young" />);

    expect(screen.getByTestId('xp-jar')).toBeInTheDocument();
    // No breakdown grid in young mode
    expect(screen.queryByTestId('xp-breakdown')).not.toBeInTheDocument();
  });

  it('still shows the XP progress bar', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="young" />);

    expect(screen.getByTestId('xp-bar')).toBeInTheDocument();
  });
});

describe('KidXpCard — Creative Cycle badge', () => {
  it('shows badge when active', () => {
    render(
      <KidXpCard
        progress={{ ...BASE_PROGRESS, creative_cycle_active: true }}
        ageMode="older"
      />,
    );

    expect(screen.getByTestId('creative-cycle-badge')).toBeInTheDocument();
    expect(screen.getByText(/Creative Cycle this week/i)).toBeInTheDocument();
  });

  it('hides badge when inactive', () => {
    render(<KidXpCard progress={BASE_PROGRESS} ageMode="older" />);

    expect(screen.queryByTestId('creative-cycle-badge')).not.toBeInTheDocument();
  });
});
