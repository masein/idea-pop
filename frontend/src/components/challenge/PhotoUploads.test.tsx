import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../messages/en.json';
import StepBuild from './StepBuild';
import LabCelebration from './story/LabCelebration';

const api = vi.hoisted(() => ({ createProject: vi.fn(), uploadProjectPhoto: vi.fn() }));
vi.mock('@/lib/api/client', () => api);

const MESSAGE = "Your photo couldn't be uploaded. Please try again.";
const photo = () => new File(['x'], 's.png', { type: 'image/png' });
const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Build step photo', () => {
  const challenge = { id: 'c1', slug: 'x', title: 'X', story: null, build_hints: [] };

  function submit() {
    const onNext = vi.fn();
    const onPhotoSaved = vi.fn();
    wrap(<StepBuild challenge={challenge as never} ageMode="older" sketchProjectId={null} onNext={onNext} onBack={vi.fn()} hideTestQuestion onPhotoSaved={onPhotoSaved} />);
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [photo()] } });
    fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'Raft' } });
    fireEvent.click(screen.getByTestId('capture-submit'));
    return { onNext, onPhotoSaved };
  }

  it('moves on after a successful upload', async () => {
    api.createProject.mockResolvedValue({ id: 'p1' });
    api.uploadProjectPhoto.mockResolvedValue({});
    const { onNext, onPhotoSaved } = submit();
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onPhotoSaved).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(MESSAGE)).toBeNull();
  });

  it('shows the error, keeps the work, and retries without a second project', async () => {
    api.createProject.mockResolvedValue({ id: 'p1' });
    api.uploadProjectPhoto.mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce({});
    const { onNext, onPhotoSaved } = submit();
    await screen.findByText(MESSAGE);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPhotoSaved).not.toHaveBeenCalled();
    expect((screen.getByTestId('field-title') as HTMLInputElement).value).toBe('Raft');
    expect(screen.getByTestId('photo-preview')).toBeTruthy();

    fireEvent.click(screen.getByTestId('photo-upload-retry'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.createProject).toHaveBeenCalledTimes(1);
    expect(onPhotoSaved).toHaveBeenCalledTimes(1);
  });
});

describe('Lab photo', () => {
  it('shows the error and retries the same photo', async () => {
    const onPhoto = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(10);
    wrap(<LabCelebration onPhoto={onPhoto} onKeepExploring={vi.fn()} onEnough={vi.fn()} />);
    const file = photo();
    fireEvent.change(screen.getByTestId('lab-photo-input'), { target: { files: [file] } });
    await screen.findByText(MESSAGE);
    expect(screen.getByTestId('lab-photo-preview')).toBeTruthy();

    fireEvent.click(screen.getByTestId('photo-upload-retry'));
    await waitFor(() => expect(onPhoto).toHaveBeenCalledTimes(2));
    expect(onPhoto.mock.calls[1][0]).toBe(file);
    await waitFor(() => expect(screen.queryByText(MESSAGE)).toBeNull());
  });
});
