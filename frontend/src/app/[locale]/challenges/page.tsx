import { getTranslations } from "next-intl/server";
import ChallengeExperience from "./_components/ChallengeExperience";

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "challenge" });
  return {
    title: t("meta_title"),
    description: t("brief_body"),
  };
}

export default function ChallengesPage() {
  return <ChallengeExperience />;
}
