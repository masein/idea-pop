import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { btnGlassOnDark, btnLime, motionDelay } from "./ui";
import startFreeGirl from "../../../../../public/landing/start-free-girl.png";

type Href = ComponentProps<typeof Link>["href"];

/* The landing page's closing green band, optionally with a second link beside its button: one component so The Method,
   Pricing and For Teachers cannot drift apart. The girl stands on the band's top edge, and the footer's dark green starts behind the
   band's lower part so the two read as one piece. Motion needs the page's ScrollReveal and motion.css. */
export default function ClosingBand({
  label,
  heading,
  primary,
  secondary,
}: {
  label: string;
  heading: ReactNode;
  primary: { href: Href; text: string };
  secondary?: { href: Href; text: string };
}) {
  return (
    <section
      aria-label={label}
      className="px-3 md:px-6 pb-0 mt-4 md:mt-8 bg-[linear-gradient(to_bottom,transparent_calc(100%_-_40px),#2E574D_calc(100%_-_40px))] md:bg-[linear-gradient(to_bottom,transparent_calc(100%_-_105px),#2E574D_calc(100%_-_105px))]"
    >
      <div className="max-w-[1336px] mx-auto rounded-[40px] md:rounded-[112px] bg-[#18785A] px-6 md:px-14 pt-10 md:pt-0 relative overflow-visible" data-scroll="scale-in">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
          <div className="py-6 md:py-16 text-center md:text-start">
            <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.625rem,1.15rem+2vw,2.5rem)] leading-[1.35] text-[#EEFFA9] mb-8" data-reveal="grow">
              {heading}
            </h2>
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 sm:gap-8">
              <Link href={primary.href} className={btnLime} data-reveal="pop" style={motionDelay(220)}>
                {primary.text}
              </Link>
              {secondary && (
                <Link href={secondary.href} prefetch={false} className={btnGlassOnDark} data-reveal="pop" style={motionDelay(320)}>
                  {secondary.text}
                </Link>
              )}
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <Image
              unoptimized
              src={startFreeGirl}
              alt=""
              aria-hidden="true"
              className="w-64 md:w-[450px] h-auto md:-mt-[136px] drop-shadow-xl"
              sizes="(min-width: 768px) 450px, 16rem"
              data-reveal="pop"
              style={motionDelay(420)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
