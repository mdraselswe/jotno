import { CalendarClock, MessageCircleQuestion, Plus, Stethoscope } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { petPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { dueState } from "@/features/health";
import { PetCard, petAge } from "@/features/pets";
import { listPets, upcomingCare } from "@/features/pets/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("nav.account"), t("account.sub"), ROUTES.account, await getLocale());
}

async function Overview() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.account));
  const [pets, care] = await Promise.all([listPets(viewer.id), upcomingCare(viewer.id)]);
  const today = dhakaDay(new Date());
  const due = care.filter((c) => c.dueOn && dueState(c.dueOn, today, 30) !== "ok").slice(0, 5);

  return (
    <div className="grid gap-8">
      <PrivateHeading title={t("account.title", { name: viewer.fullName ?? "" })} sub={t("account.sub")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={localeHref(locale, ROUTES.ask)}
          className="flex items-center gap-3 rounded-(--radius-xl) bg-primary p-(--card-pad) text-primary-foreground shadow-(--shadow-card) transition-transform"
        >
          <MessageCircleQuestion aria-hidden="true" className="size-6" />
          <span className="font-medium">{t("account.quickAsk")}</span>
        </Link>
        <Link
          href={localeHref(locale, ROUTES.vets)}
          className="glow-border relative flex items-center gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-transform"
        >
          <Stethoscope aria-hidden="true" className="size-6 text-primary" />
          <span className="font-medium">{t("account.quickFind")}</span>
        </Link>
      </div>

      <section className="grid gap-4" aria-labelledby="pets-h">
        <div className="flex items-center justify-between gap-4">
          <h2 id="pets-h" className="font-heading text-xl font-semibold">
            {t("account.pets")}
          </h2>
          <ButtonLink href={localeHref(locale, ROUTES.newPet)} size="sm" variant="outline">
            <Plus aria-hidden="true" />
            {t("pets.add")}
          </ButtonLink>
        </div>
        {pets.length === 0 ? (
          <p className="text-muted-foreground">{t("pets.empty")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => {
              const age = petAge(pet.birthDate, today);
              return (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  locale={locale}
                  href={localeHref(locale, petPath(pet.id))}
                  extra={
                    age ? t(age.unit === "years" ? "pets.age" : "pets.ageMonths", { n: age.n }) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="care-h">
        <h2 id="care-h" className="font-heading text-xl font-semibold">
          {t("account.upcoming")}
        </h2>
        {due.length === 0 ? (
          <p className="text-muted-foreground">{t("account.noUpcoming")}</p>
        ) : (
          <ul className="grid gap-2">
            {due.map((c) => {
              const state = dueState(c.dueOn, today);
              return (
                <li key={c.id}>
                  <Link
                    href={localeHref(locale, petPath(c.petId))}
                    className="flex items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card) hover:bg-muted/50"
                  >
                    <CalendarClock
                      aria-hidden="true"
                      className={cn("size-5", state === "due" ? "text-destructive" : "text-warning")}
                    />
                    <span className="flex-1">
                      <span className="font-medium">{c.petName}</span> · {c.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {c.dueOn ? fmt.date(new Date(`${c.dueOn}T00:00:00+06:00`)) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {viewer.role === "owner" ? (
        <p className="text-sm">
          <Link
            href={localeHref(locale, ROUTES.forVets)}
            className="text-primary underline underline-offset-4"
          >
            {t("account.becomeVet")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Private>
      <Overview />
    </Private>
  );
}
