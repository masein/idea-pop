export interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="divide-y divide-ink/10 rounded-card border border-ink/10">
      {items.map((item, index) => (
        <details key={index} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore">
            <span>{item.q}</span>
            <svg
              className="h-5 w-5 flex-shrink-0 text-ink/50 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
