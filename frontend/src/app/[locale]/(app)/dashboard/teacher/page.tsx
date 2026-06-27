import { Link } from '@/i18n/routing';

interface TeacherDashboardPageProps {
  searchParams: Promise<{ code?: string }>;
}

const features = [
  {
    emoji: '👩‍🎓',
    heading: 'Your students',
    body: 'See all students who joined with your class code',
  },
  {
    emoji: '📋',
    heading: 'Assignments',
    body: 'Set the weekly mission for your whole class',
  },
  {
    emoji: '📁',
    heading: 'Portfolios',
    body: 'Review student builds before they become public',
  },
];

export default async function TeacherDashboardPage({
  searchParams,
}: TeacherDashboardPageProps) {
  const { code } = await searchParams;

  return (
    <div className="px-4 py-10" data-testid="teacher-dashboard">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-bold text-3xl text-ink mb-8">
          Your teacher dashboard
        </h1>

        {/* Class code section */}
        {code ? (
          <div className="mb-10 flex flex-col items-center gap-2">
            <p className="font-body text-sm text-ink/60 uppercase tracking-wide mb-2">
              Your class code
            </p>
            <div className="font-display text-4xl tracking-widest text-explore bg-tint-lime rounded-card px-8 py-4">
              {code}
            </div>
          </div>
        ) : (
          <div className="mb-10 bg-tint-cream rounded-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-lg text-ink">No class yet</p>
              <p className="font-body text-sm text-ink/60 mt-0.5">
                Set up a class to get your unique class code
              </p>
            </div>
            <Link
              href="/onboarding/teacher"
              className="inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold transition-all duration-150 focus-visible:outline-none select-none px-6 py-2.5 text-base bg-explore text-white hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 shrink-0"
            >
              Set up a class
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
}
