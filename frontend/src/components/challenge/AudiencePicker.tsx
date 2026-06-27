'use client';

import { useState } from 'react';
import { updateVisibility } from '@/lib/api/client';

interface AudiencePickerProps {
  projectId: string | null;
  onDone: (visibility: 'private' | 'class' | 'public') => void;
}

export default function AudiencePicker({ projectId, onDone }: AudiencePickerProps) {
  const [selected, setSelected] = useState<'private' | 'class' | 'public'>('private');
  const [saving, setSaving] = useState(false);
  const [restrictedError, setRestrictedError] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (projectId === null) {
      onDone(selected);
      return;
    }

    setSaving(true);
    setRestrictedError(false);

    try {
      await updateVisibility(projectId, selected);
      setSaved(true);
      onDone(selected);
    } catch (err) {
      if (err instanceof Error && (err as any).code === 'restricted') {
        setRestrictedError(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="audience-picker" className="rounded-card bg-tint-blue p-4">
      <h2 className="font-display text-lg text-ink mb-4">Who can see your project?</h2>

      <div className="flex flex-col gap-3 mb-4">
        {/* Option 1: Private */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            data-testid="share-private"
            name="audience"
            value="private"
            checked={selected === 'private'}
            onChange={() => setSelected('private')}
            className="mt-1"
          />
          <div>
            <span className="font-display text-ink">🔒 Only me</span>
            <p className="font-body text-sm text-ink/70">Your private portfolio</p>
          </div>
        </label>

        {/* Option 2: Class */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            data-testid="share-class"
            name="audience"
            value="class"
            checked={selected === 'class'}
            onChange={() => setSelected('class')}
            className="mt-1"
          />
          <div>
            <span className="font-display text-ink">🏫 My class</span>
            <p className="font-body text-sm text-ink/70">Your teacher can see &amp; cheer</p>
          </div>
        </label>

        {/* Option 3: Public (locked) */}
        <label className="flex items-start gap-3 opacity-50 cursor-not-allowed">
          <input
            type="radio"
            data-testid="share-public-locked"
            name="audience"
            value="public"
            disabled
            className="mt-1 cursor-not-allowed"
          />
          <div>
            <span className="font-display text-ink">🌍 Idea Gallery</span>
            <p className="font-body text-sm text-ink/70">Ask a parent to unlock this</p>
          </div>
        </label>
      </div>

      {/* Safety note */}
      <p className="font-body text-sm text-ink/60 mb-4">
        🛡 Grown-ups check public posts before others can see them
      </p>

      {/* Restricted error banner */}
      {restrictedError && (
        <div
          data-testid="restricted-banner"
          className="bg-challenge/10 text-challenge rounded-card px-3 py-2 text-sm font-body mb-4"
        >
          A grown-up needs to turn on sharing first
        </div>
      )}

      {/* Save button */}
      <button
        data-testid="audience-save"
        onClick={handleSave}
        disabled={saving || saved || projectId === null}
        className="bg-challenge text-white font-display px-6 py-2 rounded-card disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
      </button>
    </div>
  );
}
