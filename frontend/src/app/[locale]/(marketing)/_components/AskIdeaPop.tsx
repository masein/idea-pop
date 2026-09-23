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
      <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-1 md:grid-cols-[300px_1fr] items-start gap-6 md:gap-x-3 md:gap-y-0">
        {/* Motion (landing motion.css): PopI pops out, then the greeting and the box grow in. */}
        <div className="flex justify-center">
          <Image
                unoptimized
            src={robot}
            alt=""
            aria-hidden="true"
            className="w-[200px] md:w-[300px] md:-ms-[100px] h-auto"
            sizes="(min-width: 768px) 300px, 200px"
            data-reveal="pop"
          />
        </div>
        <div>
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.875rem,1.435rem+1.878vw,3rem)] leading-[normal] text-[#363535] md:-ms-[100px]" data-reveal="grow" style={{ "--motion-delay": "220ms" } as React.CSSProperties}>
            {heading}
          </h2>
          <p className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.375rem,1rem+1.4vw,2.25rem)] leading-[normal] text-[#363535] mt-0.5 mb-[18px] md:-ms-[100px]" data-reveal="grow" style={{ "--motion-delay": "350ms" } as React.CSSProperties}>
            {sub}
          </p>
          <form
            data-reveal="grow"
            style={{ "--motion-delay": "490ms" } as React.CSSProperties}
            className="relative md:-ms-[200px] md:w-[calc(100%+200px)]"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/sign-up");
            }}
          >
            <textarea
              aria-label={inputLabel}
              placeholder={placeholder}
              rows={4}
              className="w-full h-[140px] md:h-[136px] rounded-[20px] bg-[#EEFFA9] border-2 border-[#D1EF5A] px-6 py-5 [font-family:var(--font-adlam)] font-normal text-[20px] md:text-[24px] text-[#363535] placeholder:text-[#363535]/60 resize-none focus:outline-none focus:ring-2 focus:ring-[#2E5F4B]"
            />
            <div className="absolute bottom-4 end-4 flex items-center gap-2">
              <button
                type="button"
                aria-label={micLabel}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[#2E5F4B] hover:bg-[#2E5F4B]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B]"
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
                className="w-11 h-11 rounded-full bg-[#D1EF5A] flex items-center justify-center text-[#1F4D33] shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:brightness-105 hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] active:shadow-[inset_0_0_0_2px_#18785A,0_2px_2px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2"
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
