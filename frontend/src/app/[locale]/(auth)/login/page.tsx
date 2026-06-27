import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return {
    title: `${t("heading")} — Idea Pop`,
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
