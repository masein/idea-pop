export default function Home() {
  return (
    <main className="min-h-screen bg-tint-lime">
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-challenge">Idea Pop</p>

        <h1 className="mt-6 font-display text-5xl leading-tight text-ink sm:text-6xl">
          Ask nature.
          <br />
          Build with your hands.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-ink/80">
          Your child solves one real problem every week — with design thinking,
          nature&apos;s secrets, and home materials. Ages 8+.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="#"
            className="rounded-pill bg-challenge px-6 py-3 font-display text-white shadow-sm transition hover:opacity-90"
          >
            Start free
          </a>
          <a
            href="#"
            className="rounded-pill border-2 border-ink/15 px-6 py-3 font-display text-ink transition hover:border-ink/30"
          >
            Watch a sample
          </a>
        </div>

        <p className="mt-8 text-sm text-ink/60">
          ✓ No ads · ✓ Private by default · ✓ Cancel anytime · ✓ COPPA-friendly
        </p>

        <p className="mt-16 text-xs text-ink/40">
          Phase 0 scaffold — design tokens wired. Real marketing screens land in
          Phases 8–12 of the roadmap.
        </p>
      </section>
    </main>
  );
}
