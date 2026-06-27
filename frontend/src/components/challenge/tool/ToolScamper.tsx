'use client'

import { useState } from 'react'

interface ToolScamperProps {
  ageMode: 'young' | 'older'
  topic: string
}

type ScamperKey = 's' | 'c' | 'a' | 'm' | 'p' | 'e' | 'r'

interface ScamperItem {
  key: ScamperKey
  emoji: string
  label: string
  youngPrompt: string
  olderPrompt: string
}

const SCAMPER_ITEMS: ScamperItem[] = [
  {
    key: 's',
    emoji: '🔄',
    label: 'Substitute',
    youngPrompt: 'What can you SWAP out?',
    olderPrompt: 'What materials, components, or processes could you substitute?',
  },
  {
    key: 'c',
    emoji: '🔗',
    label: 'Combine',
    youngPrompt: 'What can you JOIN together?',
    olderPrompt: 'What ideas, features, or elements could you combine?',
  },
  {
    key: 'a',
    emoji: '🔧',
    label: 'Adapt',
    youngPrompt: 'What can you CHANGE to fit better?',
    olderPrompt: 'What could you adapt or borrow from somewhere else?',
  },
  {
    key: 'm',
    emoji: '📏',
    label: 'Modify / Magnify',
    youngPrompt: 'What can you make BIGGER or DIFFERENT?',
    olderPrompt: 'What could you modify, magnify, minimize, or exaggerate?',
  },
  {
    key: 'p',
    emoji: '♻️',
    label: 'Put to other use',
    youngPrompt: 'How else could you USE it?',
    olderPrompt: 'How could this be used in a different context or for a different purpose?',
  },
  {
    key: 'e',
    emoji: '✂️',
    label: 'Eliminate',
    youngPrompt: 'What could you REMOVE or simplify?',
    olderPrompt: 'What elements could you eliminate or simplify without losing value?',
  },
  {
    key: 'r',
    emoji: '🔃',
    label: 'Reverse / Rearrange',
    youngPrompt: 'What if you FLIPPED it or changed the order?',
    olderPrompt: 'What if you reversed the process, rearranged components, or turned it upside down?',
  },
]

export default function ToolScamper({ ageMode, topic }: ToolScamperProps) {
  const [answers, setAnswers] = useState<Record<ScamperKey, string>>({
    s: '',
    c: '',
    a: '',
    m: '',
    p: '',
    e: '',
    r: '',
  })

  const handleChange = (key: ScamperKey, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div data-testid="tool-scamper" className="rounded-card border border-ink/20 bg-tint-lavender p-4">
      <p className="font-display text-lg text-challenge mb-1">SCAMPER 🔀</p>
      <p className="font-body text-sm text-ink/60 mb-4">
        {ageMode === 'young'
          ? `Use these tricks to come up with new ideas about "${topic}".`
          : `Apply each SCAMPER lens to generate creative ideas about "${topic}".`}
      </p>

      <div className="flex flex-col gap-4">
        {SCAMPER_ITEMS.map((item) => (
          <div
            key={item.key}
            data-testid={`scamper-${item.key}`}
            className="flex flex-col gap-1"
          >
            <label className="font-body text-xs font-semibold text-ink/70 flex items-center gap-1">
              <span>{item.emoji}</span>
              <span className="text-challenge uppercase tracking-wide">{item.key.toUpperCase()}</span>
              <span className="text-ink/50">— {item.label}</span>
            </label>
            <p className="font-body text-xs text-ink/50 mb-1">
              {ageMode === 'young' ? item.youngPrompt : item.olderPrompt}
            </p>
            <textarea
              value={answers[item.key]}
              onChange={(e) => handleChange(item.key, e.target.value)}
              placeholder="Your ideas…"
              rows={2}
              className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge bg-white resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
