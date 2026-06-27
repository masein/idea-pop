import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <AppShell section="explore">
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl leading-tight text-ink sm:text-6xl">
          {t("tagline")}
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-ink/80">
          {t("description")}
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Button variant="primary" size="lg">
            {t("cta_start")}
          </Button>
          <Button variant="secondary" size="lg">
            {t("cta_watch")}
          </Button>
        </div>

        <p className="mt-8 text-sm text-ink/60">{t("badges")}</p>
      </section>
    </AppShell>
  );
}
