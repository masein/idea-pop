import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MissionHUD from './MissionHUD';

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

describe('MissionHUD', () => {
  it('renders mission title and XP badge', () => {
    render(<MissionHUD {...defaultProps} />);

    expect(screen.getByText(/Help Max Cross The River/)).toBeInTheDocument();
    expect(screen.getByText(/\+20 XP/)).toBeInTheDocument();
  });

  it('shows 8 progress dots', () => {
    render(<MissionHUD {...defaultProps} />);

    const dots: HTMLElement[] = [];
    for (let i = 1; i <= 8; i++) {
      dots.push(screen.getByTestId(`progress-dot-${i}`));
    }
    expect(dots).toHaveLength(8);
  });

  it('opens mission menu on button click', () => {
    render(<MissionHUD {...defaultProps} />);

    expect(screen.queryByTestId('mission-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mission-menu-button'));

    expect(screen.getByTestId('mission-menu')).toBeInTheDocument();
  });

  it('clicking a reached step calls onJumpTo', () => {
    const onJumpTo = vi.fn();
    render(<MissionHUD {...defaultProps} onJumpTo={onJumpTo} />);

    // Open the menu first
    fireEvent.click(screen.getByTestId('mission-menu-button'));

    // Step 1 is in reachedSteps
    fireEvent.click(screen.getByTestId('mission-step-1'));

    expect(onJumpTo).toHaveBeenCalledTimes(1);
    expect(onJumpTo).toHaveBeenCalledWith(1);
  });

  it('clicking an unreached step does nothing', () => {
    const onJumpTo = vi.fn();
    render(<MissionHUD {...defaultProps} onJumpTo={onJumpTo} />);

    // Open the menu first
    fireEvent.click(screen.getByTestId('mission-menu-button'));

    // Step 5 is NOT in reachedSteps (only 1 and 2 are)
    fireEvent.click(screen.getByTestId('mission-step-5'));

    expect(onJumpTo).not.toHaveBeenCalled();
  });
});
