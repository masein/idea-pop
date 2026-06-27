import { Link } from '@/i18n/routing';

const features = [
  {
    emoji: '🎯',
    heading: 'Weekly missions',
    body: 'See which challenge your child is working on',
  },
  {
    emoji: '🖼️',
    heading: 'Portfolio',
    body: "Every build they've submitted, in one place",
  },
  {
    emoji: '📊',
    heading: 'Progress',
    body: 'XP, level, and badges earned so far',
  },
];

export default async function ParentDashboardPage() {
  return (
    <div className="px-4 py-10" data-testid="parent-dashboard">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-bold text-3xl text-ink mb-8">
          Your family dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {features.map((f) => (
            <div key={f.heading} className="rounded-card bg-white p-6 shadow-sm">
              <div className="text-3xl mb-3" aria-hidden="true">
                {f.emoji}
              </div>
              <h2 className="font-display font-bold text-base text-ink mb-1">
                {f.heading}
              </h2>
              <p className="font-body text-sm text-ink/60">{f.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold transition-all duration-150 focus-visible:outline-none select-none px-8 py-3.5 text-lg bg-explore text-white hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
        >
          Invite your child
        </Link>
      </div>
    </div>
  );
}
