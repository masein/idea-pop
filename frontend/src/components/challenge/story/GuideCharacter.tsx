'use client';

/** A helper character (Quizzy for WH Questions, Scamper for SCAMPER) explaining a tool in a
 *  speech bubble. A clean round spot waits for the character's picture until it arrives. */
export default function GuideCharacter({
  name,
  text,
  image = null,
  testId,
}: {
  name: string;
  text: string;
  image?: string | null;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex items-end gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small character cut-out
        <img src={image} alt="" aria-hidden="true" className="h-28 w-28 shrink-0 rounded-full bg-white object-cover object-top shadow-[0_4px_12px_rgba(0,0,0,0.12)]" />
      ) : (
        <span aria-hidden="true" className="h-24 w-24 shrink-0 rounded-full border-2 border-dashed border-[#9CC9E6] bg-white/60" />
      )}
      <div className="min-w-0 flex-1 rounded-[18px] bg-white px-4 py-3 shadow-sm">
        <p className="font-body text-sm font-bold text-challenge">{name}</p>
        <p dir="auto" className="whitespace-pre-line font-body text-lg font-semibold leading-snug text-ink">
          {text}
        </p>
      </div>
    </div>
  );
}
