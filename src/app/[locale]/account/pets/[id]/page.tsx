import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { Private } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { breedName, speciesName } from "@/content/places";
import { petPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { dueState, HealthRing, ringProgress, type HealthKind } from "@/features/health";
import { DeletePetButton, DeleteRecordButton, HealthRecordForm, PetAvatar, petAge } from "@/features/pets";
import { getPet } from "@/features/pets/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("account.pets"), robots: { index: false } };
}

const KIND_KEYS = { vaccine: "health.vaccine", deworm: "health.deworm", checkup: "health.checkup" } as const;
const STATE_TONE = {
  due: "bg-destructive/10 text-destructive",
  soon: "bg-warning/15 text-warning-foreground",
  ok: "bg-success/15 text-success-foreground",
  none: "bg-muted text-muted-foreground",
} as const;
const STATE_KEYS = { due: "health.due", soon: "health.soon", ok: "health.ok", none: "health.ok" } as const;

async function PetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, petPath(id)));
  const found = await getPet(viewer.id, id);
  if (!found) notFound();
  const { pet, records } = found;
  const today = dhakaDay(new Date());
  const age = petAge(pet.birthDate, today);
  const day = (d: string) => fmt.date(new Date(`${d}T00:00:00+06:00`));

  const latest = (kind: HealthKind) => records.find((r) => r.kind === kind && r.givenOn);
  const ring = (["vaccine", "deworm", "checkup"] as const).map((kind) => {
    const r = latest(kind);
    return { kind, value: ringProgress(kind, r?.givenOn ?? null, r?.dueOn ?? null, today) };
  });
  const pct = (k: HealthKind) => Math.round((ring.find((r) => r.kind === k)?.value ?? 0) * 100);

  const facts = [
    speciesName(pet.speciesId, locale),
    breedName(pet.breedId, locale),
    age ? t(age.unit === "years" ? "pets.age" : "pets.ageMonths", { n: age.n }) : null,
    pet.weightGrams ? `${fmt.number(pet.weightGrams / 1000)} kg` : null,
    pet.color,
  ].filter(Boolean);

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center gap-4">
        <PetAvatar pet={pet} className="size-20" />
        <div className="grid flex-1 gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{pet.name}</h1>
          <p className="text-muted-foreground">{facts.join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={localeHref(locale, `${petPath(pet.id)}/edit`)} variant="outline" size="sm">
            <Pencil aria-hidden="true" />
            {t("common.edit")}
          </ButtonLink>
          <DeletePetButton petId={pet.id} name={pet.name} />
        </div>
      </header>

      {pet.notes ? (
        <p className="max-w-2xl rounded-(--control-radius) bg-muted px-4 py-3 text-sm">{pet.notes}</p>
      ) : null}

      <section className="grid gap-4" aria-labelledby="health-h">
        <h2 id="health-h" className="font-heading text-xl font-semibold">
          {t("health.heading")}
        </h2>
        <HealthRing
          label={t("health.ring", { v: pct("vaccine"), d: pct("deworm"), c: pct("checkup") })}
          parts={ring.map((r) => ({ label: t(KIND_KEYS[r.kind]), value: r.value }))}
        />
        <HealthRecordForm petId={pet.id} today={today} />
        {records.length === 0 ? (
          <p className="text-muted-foreground">{t("health.empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {records.map((r) => {
              const state = dueState(r.dueOn, today);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
                >
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-medium">
                      {r.title}{" "}
                      <span className="text-sm text-muted-foreground">· {t(KIND_KEYS[r.kind])}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {r.givenOn ? day(r.givenOn) : null}
                      {r.dueOn ? ` → ${t("health.dueDate", { date: day(r.dueOn) })}` : null}
                    </span>
                  </div>
                  <Badge className={STATE_TONE[state]}>{t(STATE_KEYS[state])}</Badge>
                  <DeleteRecordButton petId={pet.id} recordId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function PetPage({ params }: PageProps<"/[locale]/account/pets/[id]">) {
  return (
    <Private>
      <PetDetail params={params} />
    </Private>
  );
}
