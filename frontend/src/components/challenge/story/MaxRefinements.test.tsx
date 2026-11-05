import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { BuildPhoto } from './StoryLab';
import LabCelebration from './LabCelebration';
import RewardPopup from './RewardPopup';
import BuildAgain from './BuildAgain';
import { JourneySummary } from './JourneyParts';
import { EMPTY_JOURNEY, buildJourney } from './useMissionJourney';
import ImageUploadArea from '../ImageUploadArea';

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  uploadProjectPhoto: vi.fn(),
  fetchProjectPhoto: vi.fn(),
  fetchMyHeroIdeas: vi.fn(),
  fetchMyProjects: vi.fn(),
}));
vi.mock('@/lib/api/client', () => api);

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
const picture = () => new File(['x'], 'p.png', { type: 'image/png' });
const FAILED = "Your photo couldn't be uploaded. Please try again.";
const story = {
  guide: { build_and_test: 'Build again' },
  clue_cards: [{ name: 'Water strider', trick: 'Tiny hairs', does: 'Stands on water', emoji: '', image: null }],
  discovery: { improved_idea: { title: 'Your improved idea' }, checklist_intro: 'Before we build' },
} as never;
const challenge = { id: 'c1', build_hints: [] } as never;

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('the upload area', () => {
  it('takes existing picture files only and never opens the camera', () => {
    wrap(<ImageUploadArea prompt="Add" previewUrl={null} onSelect={vi.fn()} />);
    const input = screen.getByTestId('photo-input') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBeNull();
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(screen.getByTestId('photo-area').querySelector('[data-asset-id="CHALLENGE-UI-UPLOAD-001"]')).toBeTruthy();
  });

  it('turns away other files with a message', () => {
    const onSelect = vi.fn();
    wrap(<ImageUploadArea prompt="Add" previewUrl={null} onSelect={onSelect} />);
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('photo-wrong-type')).toBeTruthy();
  });
});

describe('Build and Test photo, on the page', () => {
  it('shows the error and retries the same picture', async () => {
    const onPhoto = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    wrap(<BuildPhoto description="Upload" onPhoto={onPhoto} onBusy={vi.fn()} />);
    const file = picture();
    fireEvent.change(screen.getByTestId('lab-photo-input'), { target: { files: [file] } });
    await screen.findByText(FAILED);
    expect(screen.getByTestId('lab-photo-preview')).toBeTruthy();
    fireEvent.click(screen.getByTestId('photo-upload-retry'));
    await waitFor(() => expect(onPhoto).toHaveBeenCalledTimes(2));
    expect(onPhoto.mock.calls[1][0]).toBe(file);
    await waitFor(() => expect(screen.queryByText(FAILED)).toBeNull());
  });

  it('the completion popup has no upload fields, and shows the XP it is given', () => {
    wrap(<LabCelebration hero="Max" xp={10} onKeepExploring={vi.fn()} onEnough={vi.fn()} onClose={vi.fn()} />);
    const popup = screen.getByTestId('lab-celebration');
    expect(popup.querySelector('input,textarea')).toBeNull();
    expect(popup.textContent).toContain("You came up with an idea to help Max");
    expect(screen.getByTestId('lab-celebration-xp').textContent).toContain('+10 XP');
    expect(screen.getByTestId('lab-celebration-primary').textContent).toBe('Continue');
  });
});

describe('the X', () => {
  it('only closes the popup', () => {
    const onClose = vi.fn();
    const primary = vi.fn();
    wrap(<RewardPopup title="T" text="x" xp={null} primary={{ label: 'Go', onClick: primary }} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('reward-popup-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(primary).not.toHaveBeenCalled();
  });
});

describe('the saved journey', () => {
  const idea = (over = {}) => ({ id: 'i1', challenge_id: 'c1', challenge_title: 'C', hero_name: 'Water strider', text: 'Long legs', version: 1, project_id: 's1', created_at: '2026-01-01', ...over });
  const project = (id: string, step_type: string | null, created_at: string, over = {}) => ({ id, origin_id: 'c1', title: id, description: `${id} words`, materials: '', photo_keys: [], step_type, created_at, ...over });

  it('puts each saved thing in its place and keeps earlier versions', () => {
    const j = buildJourney('c1', 'Lab', [idea()], [
      project('v2', 'build', '2026-01-06'),
      project('v1', 'build', '2026-01-05', { photo_keys: ['k'] }),
      project('p', 'practice', '2026-01-04', { materials: 'clay → foam' }),
      project('m', 'model', '2026-01-03', { photo_keys: ['k'] }),
      project('l', 'lab', '2026-01-02'),
      project('s1', 'sketch', '2026-01-01', { title: 'My raft', photo_keys: ['k'] }),
      project('other', 'build', '2026-01-07', { origin_id: 'c2' }),
    ]);
    expect(j.idea).toEqual({ name: 'My raft', text: 'Long legs', heroName: 'Water strider' });
    expect(j.sketch?.id).toBe('s1');
    expect(j.model?.id).toBe('m');
    expect(j.labResults).toBe('l words');
    expect(j.change).toBe('clay → foam');
    expect(j.versions.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('recognises older projects saved before they recorded their kind', () => {
    const j = buildJourney('c1', 'Lab', [idea()], [
      project('old-lab', null, '2026-01-02', { title: 'Lab', photo_keys: ['k'] }),
      project('s1', null, '2026-01-01'),
      project('an-old-card', null, '2026-01-01'),
    ]);
    expect(j.sketch?.id).toBe('s1');
    expect(j.model?.id).toBe('old-lab');
    expect(j.versions).toEqual([]);
  });

  it('page 9 shows neutral spots for missing pictures and asks nothing', () => {
    wrap(<JourneySummary journey={EMPTY_JOURNEY} story={story} partner={0} improvedNote={null} />);
    const page = screen.getByTestId('journey-summary');
    expect(page.querySelectorAll('[data-asset-id="CHALLENGE-UI-EMPTY-JOURNEY-001"]').length).toBe(3);
    expect(page.querySelector('input,textarea')).toBeNull();
    expect(screen.getByTestId('journey-hero').textContent).toContain('Tiny hairs');
  });

  it('page 9 falls back to the neutral spot when a picture cannot load', async () => {
    api.fetchProjectPhoto.mockRejectedValue(new Error('no'));
    const sketch = { id: 's1', title: 'Raft', text: '', materials: '', hasPhoto: true };
    wrap(<JourneySummary journey={{ ...EMPTY_JOURNEY, sketch }} story={story} partner={0} improvedNote={null} />);
    await waitFor(() => expect(screen.getByTestId('journey-summary').querySelectorAll('[data-asset-id]').length).toBe(3));
  });
});

describe('page 8, a new version', () => {
  const page = (onVersionSaved = vi.fn()) => {
    wrap(
      <BuildAgain
        challenge={challenge}
        story={story}
        partner={0}
        journey={EMPTY_JOURNEY}
        improvedNote={null}
        blobUrls={{ model: null, sketch: null }}
        onVersionSaved={onVersionSaved}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId('version-name'), { target: { value: 'Foam raft' } });
    fireEvent.change(screen.getByTestId('version-diff'), { target: { value: 'It floats higher' } });
    return onVersionSaved;
  };

  it('has no rounds and no repeated questions, and keeps the checklist', () => {
    page();
    expect(screen.queryByTestId('round1')).toBeNull();
    expect(screen.queryByTestId('field-used')).toBeNull();
    expect(screen.getByTestId('build-checklist').querySelectorAll('input[type=checkbox]').length).toBe(4);
    expect(screen.getByTestId('idea-history')).toBeTruthy();
  });

  it('saves as its own record', async () => {
    api.createProject.mockResolvedValue({ id: 'v1' });
    const saved = page();
    fireEvent.click(screen.getByTestId('version-save'));
    await waitFor(() => expect(saved).toHaveBeenCalledWith('Foam raft: It floats higher', false));
    expect(api.createProject.mock.calls[0][0]).toMatchObject({ title: 'Foam raft', what_i_made: 'It floats higher', step_type: 'build' });
    expect(screen.getByTestId('version-saved')).toBeTruthy();
  });

  it('keeps the words and the record when the picture fails, then retries', async () => {
    api.createProject.mockResolvedValue({ id: 'v1' });
    api.uploadProjectPhoto.mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce({});
    const saved = page();
    fireEvent.change(screen.getByTestId('version-photo-input'), { target: { files: [picture()] } });
    fireEvent.click(screen.getByTestId('version-save'));
    await screen.findByText(FAILED);
    expect(saved).not.toHaveBeenCalled();
    expect((screen.getByTestId('version-name') as HTMLInputElement).value).toBe('Foam raft');
    fireEvent.click(screen.getByTestId('photo-upload-retry'));
    await waitFor(() => expect(saved).toHaveBeenCalledWith('Foam raft: It floats higher', true));
    expect(api.createProject).toHaveBeenCalledTimes(1);
  });
});
