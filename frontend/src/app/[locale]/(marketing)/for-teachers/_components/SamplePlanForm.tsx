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
 *
 * Drawn like the footer's newsletter form (a 44px white field and the lime button), on the page's mint; the frame
 * gives the button a wider 150px pill at desktop.
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
        className="[font-family:var(--font-montserrat)] text-[16px] font-bold text-[#1F4D33]"
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
      className="flex gap-2 md:gap-5"
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
        className="h-11 min-w-0 flex-1 rounded-pill bg-white px-5 [font-family:var(--font-montserrat)] text-[16px] font-medium text-[#1F2D33] placeholder:text-[#8B95A1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18785A]"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-pill bg-[#D1EF5A] px-8 md:px-[55px] [font-family:var(--font-montserrat)] text-[16px] font-extrabold text-[#1F4D33] shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:brightness-105 hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4F8ED]"
      >
        {button}
      </button>
    </form>
  );
}
