import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../messages/en.json';
import StepSketch from './StepSketch';

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  uploadProjectPhoto: vi.fn(),
  attachSketchToIdea: vi.fn(),
}));
vi.mock('@/lib/api/client', () => api);

const challenge = { id: 'c1', slug: 'x', title: 'X', story: { hero: { name: 'Max' } }, tools: [], season: 1, week_number: 1 };

function setup() {
  const onNext = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <StepSketch challenge={challenge as never} ageMode="older" onNext={onNext} onBack={vi.fn()} guide={{ nameLabel: 'Name', submitLabel: 'Submit', description: 'A raft' }} />
    </NextIntlClientProvider>,
  );
  fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } });
  fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'Ant Raft' } });
  fireEvent.click(screen.getByTestId('capture-submit'));
  return onNext;
}

describe('StepSketch when the sketch photo fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    api.createProject.mockResolvedValue({ id: 'p1' });
    api.attachSketchToIdea.mockResolvedValue(undefined);
  });

  it('shows the error and retries the photo on the same project', async () => {
    api.uploadProjectPhoto.mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce({});
    const onNext = setup();
    await screen.findByTestId('sketch-save-failed');
    expect(onNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sketch-save-retry'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.createProject).toHaveBeenCalledTimes(1);
    expect(api.uploadProjectPhoto).toHaveBeenCalledTimes(2);
    expect(onNext.mock.calls[0][0]).toBe('p1');
  });

  it('lets the kid carry on without the photo', async () => {
    api.uploadProjectPhoto.mockRejectedValue(new Error('no'));
    const onNext = setup();
    fireEvent.click(await screen.findByTestId('sketch-save-continue'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext.mock.calls[0][2].photo).toBeNull();
  });

  it('keeps everything when the save itself fails', async () => {
    api.createProject.mockRejectedValueOnce(new Error('no'));
    api.uploadProjectPhoto.mockResolvedValue({});
    const onNext = setup();
    await screen.findByTestId('sketch-save-failed');
    expect(onNext).not.toHaveBeenCalled();
    expect((screen.getByTestId('field-title') as HTMLInputElement).value).toBe('Ant Raft');
    fireEvent.click(screen.getByTestId('sketch-save-retry'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.createProject).toHaveBeenCalledTimes(2);
  });
});
