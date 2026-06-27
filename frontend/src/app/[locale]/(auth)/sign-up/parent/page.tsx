import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return {
    title: `${t("heading_parent")} — Idea Pop`,
  };
}

export default function ParentRegisterPage() {
  return <RegisterForm role="parent" />;
}
