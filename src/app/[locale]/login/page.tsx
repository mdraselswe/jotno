import { Suspense } from "react";
import { ROUTES } from "@/config/routes";
import { LoginForm } from "@/features/auth";
import { getLocale, getT } from "@/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return {
    ...pageMetadata(t("auth.title"), t("auth.sub"), ROUTES.login, await getLocale()),
    robots: { index: false },
  };
}

export default function LoginPage() {
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
