import { Link } from "@/i18n/routing";

interface PricingCardProps {
  label: string;
  price: string;
  billingLabel: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPrimary?: boolean;
  savingsBadge?: string;
  note?: string;
}

export default function PricingCard({
  label,
  price,
  billingLabel,
  features,
  ctaLabel,
  ctaHref,
  isPrimary = false,
  savingsBadge,
  note,
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-col gap-6 rounded-card border p-8 ${
        isPrimary
          ? "border-explore bg-tint-lime shadow-md"
          : "border-ink/20 bg-surface"
      }`}
    >
      {/* Label + savings badge */}
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-bold text-ink">{label}</span>
        {savingsBadge && (
          <span className="rounded-pill bg-pricing px-2 py-0.5 text-xs font-bold text-white">
            {savingsBadge}
          </span>
        )}
      </div>

      {/* Price */}
      <div>
        <span className="font-display text-4xl font-bold text-ink">{price}</span>
        <span className="ml-1.5 text-sm text-ink/60">{billingLabel}</span>
      </div>

      {/* Features list */}
      <ul className="flex flex-col gap-2" aria-label="Plan features">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-explore"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm text-ink/70">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA link styled as button */}
      <Link
        href={ctaHref as "/sign-up"}
        className={`inline-flex items-center justify-center rounded-pill px-6 py-3 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 ${
          isPrimary
            ? "bg-explore text-white hover:brightness-110 active:scale-95"
            : "border-2 border-ink/20 text-ink hover:bg-ink/5 active:scale-95"
        }`}
      >
        {ctaLabel}
      </Link>

      {/* Optional note */}
      {note && (
        <p className="text-center text-xs text-ink/50">{note}</p>
      )}
    </div>
  );
}
