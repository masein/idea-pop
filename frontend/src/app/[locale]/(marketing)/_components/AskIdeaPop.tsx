"use client";

import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import robot from "../../../../../public/landing/robot.png";

interface AskIdeaPopProps {
  heading: string;
  sub: string;
  placeholder: string;
  inputLabel: string;
  sendLabel: string;
  micLabel: string;
}

/**
 * Marketing-only "ask me anything" teaser. There is no free chat on the
 * marketing site — submitting simply routes visitors to sign-up, where the
 * real (consent-gated) helper lives.
 */
export default function AskIdeaPop({
  heading,
  sub,
  placeholder,
  inputLabel,
  sendLabel,
  micLabel,
}: AskIdeaPopProps) {
  const router = useRouter();

  return (
    <section aria-label="ask idea pop" className="py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[220px_1fr] items-start gap-8">
        <div className="flex justify-center">
          <Image
            src={robot}
            alt=""
            aria-hidden="true"
            className="w-40 md:w-52 h-auto"
            sizes="(min-width: 768px) 13rem, 10rem"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1E5B2E]">
            {heading}
          </h2>
          <p className="font-display text-xl md:text-2xl font-bold text-[#2E5F4B] mt-1 mb-5">
            {sub}
          </p>
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/sign-up");
            }}
          >
            <textarea
              aria-label={inputLabel}
              placeholder={placeholder}
              rows={5}
              className="w-full rounded-[1.75rem] bg-[#EDF6C5] border border-[#2E5F4B]/20 px-6 py-5 font-body text-base text-ink placeholder:text-ink/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#2E5F4B]"
            />
            <div className="absolute bottom-4 end-4 flex items-center gap-2">
              <button
                type="button"
                aria-label={micLabel}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#2E5F4B] hover:bg-[#2E5F4B]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
              <button
                type="submit"
                aria-label={sendLabel}
                className="w-11 h-11 rounded-full bg-[#CDEB5A] flex items-center justify-center text-[#1F4D33] shadow-sm hover:brightness-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19V5m0 0l-6 6m6-6l6 6"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
