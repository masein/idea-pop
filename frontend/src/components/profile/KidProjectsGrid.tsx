'use client';

import { useState } from 'react';
import KidProjectCard from './KidProjectCard';
import AudiencePicker from '@/components/challenge/AudiencePicker';

type KidProjectSummary = import('@/lib/api/schema').components['schemas']['KidProjectSummary'];

interface KidProjectsGridProps {
  projects: KidProjectSummary[];
  onVisibilityChanged?: (projectId: string, visibility: 'private' | 'class' | 'public') => void;
}

export default function KidProjectsGrid({ projects, onVisibilityChanged }: KidProjectsGridProps) {
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);

  function handleShare(projectId: string) {
    setSharingProjectId(projectId);
  }

  function handlePickerDone(visibility: 'private' | 'class' | 'public') {
    if (sharingProjectId && onVisibilityChanged) {
      onVisibilityChanged(sharingProjectId, visibility);
    }
    setSharingProjectId(null);
  }

  return (
    <>
      {/* Audience picker modal */}
      {sharingProjectId && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share project"
          data-testid="audience-picker-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSharingProjectId(null);
          }}
        >
          <div className="bg-tint-blue rounded-card w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="font-display text-base text-ink">Share this project</p>
              <button
                type="button"
                onClick={() => setSharingProjectId(null)}
                aria-label="Close"
                className="text-ink/40 hover:text-ink p-1"
              >
                ✕
              </button>
            </div>
            <div className="px-4 pb-4">
              <AudiencePicker projectId={sharingProjectId} onDone={handlePickerDone} />
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div data-testid="projects-grid" className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">My projects</h2>

        {projects.length === 0 ? (
          <p
            data-testid="projects-empty"
            className="font-body text-sm text-ink/50 bg-white rounded-card p-6 text-center"
          >
            Nothing here yet — finish a challenge to save your work!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {projects.map((project) => (
              <KidProjectCard
                key={project.id}
                project={project}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
