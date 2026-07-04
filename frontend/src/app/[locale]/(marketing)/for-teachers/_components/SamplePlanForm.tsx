"use client";

import { useState } from "react";

interface Props {
  label: string;
  placeholder: string;
  button: string;
  success: string;
}

/**
 * Sample-plan email capture. No backend yet — on submit it acknowledges;
 * the real handoff (emailing the PDF) is wired when the endpoint exists.
 */
export default function SamplePlanForm({
  label,
  placeholder,
  button,
  success,
}: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p
        className="font-body font-bold text-[#2E5F4B]"
        role="status"
        aria-live="polite"
      >
        {success}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email) setSent(true);
      }}
      className="flex flex-col gap-3 sm:flex-row"
      aria-label={label}
    >
      <label htmlFor="sample-plan-email" className="sr-only">
        {label}
      </label>
      <input
        id="sample-plan-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-pill bg-white px-6 py-3 font-body text-ink shadow-sm placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-[#2E5F4B]"
      />
      <button
        type="submit"
        className="rounded-pill bg-[#CDEB5A] px-8 py-3 font-display font-bold text-[#2E5F4B] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2"
      >
        {button}
      </button>
    </form>
  );
}
