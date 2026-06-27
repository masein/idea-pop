'use client'

import { useState } from 'react'

interface ToolFiveWhysProps {
  ageMode: 'young' | 'older'
  topic: string
}

export default function ToolFiveWhys({ ageMode, topic }: ToolFiveWhysProps) {
  const whyCount = ageMode === 'young' ? 3 : 5
  const [answers, setAnswers] = useState<string[]>(() => Array(whyCount).fill(''))
  const [hmw, setHmw] = useState('')

  const rootFound =
    answers.every((a) => a.trim().length > 0) &&
    answers[answers.length - 1].trim().length >= 10

  const desc =
    ageMode === 'young'
      ? 'Keep asking "Why?" 3 times to find the real reason behind the problem.'
      : 'Dig deeper by asking "Why?" 5 times. Each answer becomes the next question.'

  const handleChange = (i: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const getLabel = (i: number): string => {
    if (i === 0) return `WHY is "${topic}" a problem?`
    return `WHY? ${i + 1}`
  }

  return (
    <div data-testid="tool-five-whys" className="rounded-card border border-ink/20 bg-tint-blue p-4">
      <p className="font-display text-lg text-challenge mb-1">5 Whys ❓</p>
      <p className="font-body text-sm text-ink/60 mb-4">{desc}</p>

      {answers.map((answer, i) => (
        <div key={i} className="flex flex-col gap-1 mb-3">
          <label className="font-body text-xs text-ink/50">{getLabel(i)}</label>
          <input
            data-testid={`why-input-${i}`}
            type="text"
            value={answer}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`Because…`}
            className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge bg-white"
          />
        </div>
      ))}

      {rootFound && (
        <div
          data-testid="root-found"
          className="mt-4 rounded-card border border-challenge bg-challenge/10 p-4"
        >
          <p className="font-display text-challenge text-base mb-3">
            🎯 Root found! Now ask: How Might We…?
          </p>
          <textarea
            data-testid="hmw-input"
            value={hmw}
            onChange={(e) => setHmw(e.target.value)}
            placeholder="How Might We… (write your opportunity statement)"
            rows={3}
            className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge bg-white resize-none"
          />
        </div>
      )}
    </div>
  )
}
