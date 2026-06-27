import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return {
    title: `${t("heading_teacher")} — Idea Pop`,
  };
}

export default function TeacherRegisterPage() {
  return <RegisterForm role="teacher" />;
}
