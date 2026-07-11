import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import MissionHUD from './MissionHUD';
import en from '../../../messages/en.json';

const mockChallenge = {
  title: 'Help Max Cross The River',
  emoji: '🌉',
  completion_xp: 20,
};

const defaultProps = {
  challenge: mockChallenge,
  currentStep: 2,
  reachedSteps: new Set([1, 2]),
  onJumpTo: vi.fn(),
};

function renderHUD(props: Partial<ComponentProps<typeof MissionHUD>> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MissionHUD {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe('MissionHUD', () => {
  it('renders mission title and XP badge', () => {
    renderHUD();

    expect(screen.getByText(/Help Max Cross The River/)).toBeInTheDocument();
    expect(screen.getByText(/\+20 XP/)).toBeInTheDocument();
  });

  it('shows 8 progress dots', () => {
    renderHUD();

    const dots: HTMLElement[] = [];
    for (let i = 1; i <= 8; i++) {
      dots.push(screen.getByTestId(`progress-dot-${i}`));
    }
    expect(dots).toHaveLength(8);
  });

  it('opens mission menu on button click', () => {
    renderHUD();

    expect(screen.queryByTestId('mission-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mission-menu-button'));

    expect(screen.getByTestId('mission-menu')).toBeInTheDocument();
  });

  it('clicking a reached step calls onJumpTo', () => {
    const onJumpTo = vi.fn();
    renderHUD({ onJumpTo });

    // Open the menu first
    fireEvent.click(screen.getByTestId('mission-menu-button'));

    // Step 1 is in reachedSteps
    fireEvent.click(screen.getByTestId('mission-step-1'));

    expect(onJumpTo).toHaveBeenCalledTimes(1);
    expect(onJumpTo).toHaveBeenCalledWith(1);
  });

  it('clicking an unreached step does nothing', () => {
    const onJumpTo = vi.fn();
    renderHUD({ onJumpTo });

    // Open the menu first
    fireEvent.click(screen.getByTestId('mission-menu-button'));

    // Step 5 is NOT in reachedSteps (only 1 and 2 are)
    fireEvent.click(screen.getByTestId('mission-step-5'));

    expect(onJumpTo).not.toHaveBeenCalled();
  });
});
