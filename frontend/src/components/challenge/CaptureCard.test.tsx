import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import CaptureCard from './CaptureCard';
import en from '../../../messages/en.json';

function render(ui: ReactElement) {
  return rtlRender(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// jsdom has no object-URL support; stub it so the preview <img> gets a src.
beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  });
});

function renderCard(onSubmit = vi.fn()) {
  render(
    <CaptureCard
      photoPrompt="Sketch or photo — projects, not faces"
      submitLabel="Save my idea"
      ageMode="young"
      onSubmit={onSubmit}
    />,
  );
}

const IMG = new File(['x'], 'sketch.png', { type: 'image/png' });

describe('CaptureCard photo picker', () => {
  it('exposes a real file input (not a fake toggle)', () => {
    renderCard();
    const input = screen.getByTestId('photo-input') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
    // Must have an accessible name (axe: form elements must have labels).
    expect(screen.getByLabelText('Sketch or photo — projects, not faces')).toBe(input);
    // Nothing selected yet → prompt is shown, no preview.
    expect(screen.getByText('Sketch or photo — projects, not faces')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-preview')).not.toBeInTheDocument();
  });

  it('shows a live preview after a photo is chosen', () => {
    renderCard();
    const input = screen.getByTestId('photo-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [IMG] } });
    const preview = screen.getByTestId('photo-preview') as HTMLImageElement;
    expect(preview).toBeInTheDocument();
    expect(preview.src).toContain('blob:preview');
  });

  it('removes the chosen photo and restores the prompt', () => {
    renderCard();
    const input = screen.getByTestId('photo-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [IMG] } });
    expect(screen.getByTestId('photo-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.queryByTestId('photo-preview')).not.toBeInTheDocument();
    expect(screen.getByText('Sketch or photo — projects, not faces')).toBeInTheDocument();
  });

  it('does not block submit — the photo stays optional', () => {
    const onSubmit = vi.fn();
    renderCard(onSubmit);
    // No photo chosen; fill the required text and submit.
    fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'A sorter' } });
    fireEvent.click(screen.getByTestId('capture-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
