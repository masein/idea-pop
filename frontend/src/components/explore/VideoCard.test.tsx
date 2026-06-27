import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoCard from './VideoCard';
import type { components } from '@/lib/api/schema';

vi.mock('@/lib/api/client', () => ({
  recordVideoView: vi.fn().mockResolvedValue({
    xp_earned: 5,
    xp_total: 50,
    level: 1,
    rank: 'Explorer',
    is_new: false,
    cycle_bonus_earned: false,
  }),
}));

type ExploreVideo = components['schemas']['ExploreVideo'];

const mockVideo: ExploreVideo = {
  id: 'uuid-1',
  title: 'How Octopuses Think',
  slug: 'how-octopuses-think',
  superpower_category: 'masters_of_disguise',
  taxonomy: 'Cephalopoda',
  video_url: 'https://v.example.com/oct.mp4',
  duration_s: 240,
  design_secret: 'Each arm has its own mini-brain',
  sticker_id: 'octopus',
  xp_reward: 5,
  ai_generated: false,
  age_modes: ['young', 'older'],
  created_at: '2026-06-27T00:00:00Z',
};

describe('VideoCard', () => {
  it('renders title and taxonomy', () => {
    render(
      <VideoCard video={mockVideo} ageMode="young" onSelect={vi.fn()} />
    );
    expect(screen.getByText('How Octopuses Think')).toBeDefined();
    expect(screen.getByText('Cephalopoda')).toBeDefined();
  });

  it('shows design_secret preview when ageMode is older', () => {
    render(
      <VideoCard video={mockVideo} ageMode="older" onSelect={vi.fn()} />
    );
    expect(screen.getByText('Each arm has its own mini-brain')).toBeDefined();
  });

  it('hides design_secret when ageMode is young', () => {
    render(
      <VideoCard video={mockVideo} ageMode="young" onSelect={vi.fn()} />
    );
    expect(screen.queryByText('Each arm has its own mini-brain')).toBeNull();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <VideoCard video={mockVideo} ageMode="young" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByTestId('video-card'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(mockVideo);
  });

  it('shows AI badge when ai_generated is true', () => {
    const aiVideo: ExploreVideo = { ...mockVideo, ai_generated: true };
    render(
      <VideoCard video={aiVideo} ageMode="young" onSelect={vi.fn()} />
    );
    expect(screen.getByText('AI')).toBeDefined();
  });

  it('does NOT show AI badge when ai_generated is false', () => {
    render(
      <VideoCard video={mockVideo} ageMode="young" onSelect={vi.fn()} />
    );
    expect(screen.queryByText('AI')).toBeNull();
  });
});
