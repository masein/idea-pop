'use client';

/** A badge's art in a list or chip: a picture (e.g. Quizzy) or, until one exists, an emoji. */
export default function BadgeIcon({ art, className = 'h-6 w-6' }: { art: string; className?: string }) {
  if (/^\/|\.(png|webp|jpe?g|svg)$/i.test(art)) {
    // eslint-disable-next-line @next/next/no-img-element -- small badge artwork
    return <img src={art} alt="" aria-hidden="true" className={`inline-block shrink-0 rounded-full bg-white object-cover object-top ${className}`} />;
  }
  return <span aria-hidden="true">{art}</span>;
}
