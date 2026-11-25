import { CircleDot, Clock, Inbox, Siren } from "lucide-react";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { AutoRefresh } from "@/features/payments";
import { requireVet } from "@/features/providers/server";
import { DutyForm, minutesLeft, onDuty, QuickAnswerForm } from "@/features/quick";
import { openPool, vetDuty } from "@/features/quick/server";
import { LevelBadge } from "@/features/referrals";
import { speciesName } from "@/content/places";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaMinute } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("quick.vetTitle"), robots: { index: false } };
}

/** Read once per request (outside the component body, see lib/time.ts). */
const requestNow = () => new Date();

async function Pool() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { viewer } = await requireVet(locale, localeHref(locale, ROUTES.vetQuick));
  const [duty, pool] = await Promise.all([vetDuty(viewer.id), openPool(viewer.id)]);
  const now = requestNow();
  const live = duty ? onDuty(duty, now, dhakaMinute(now)) : false;
  const earn = taka(fmt, business.quick.vetShare);

  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("quick.vetTitle")} sub={t("quick.vetSub", { amount: earn })} icon={Siren} />
      <AutoRefresh seconds={30} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="pool-h" className="grid gap-3">
          <h2 id="pool-h" className="font-heading text-lg font-bold">
            {t("quick.poolTitle", { n: fmt.number(pool.length) })}
          </h2>
          {pool.length === 0 ? (
            <EmptyState icon={Inbox} title={t("quick.poolEmpty")} body={t("quick.poolEmptySub")} />
          ) : (
            <ul className="grid gap-4">
              {pool.map((q) => (
                <li key={q.id}>
                  <SectionCard bodyClassName="grid gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {q.speciesId ? <StatusBadge>{speciesName(q.speciesId, locale)}</StatusBadge> : null}
                      {q.petName ? <StatusBadge tone="primary">{q.petName}</StatusBadge> : null}
                      <LevelBadge level={q.ownerLevel} t={t} />
                      <span className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {t("quick.leftMin", {
                          n:
                            minutesLeft(
                              { status: "open", openedAt: q.openedAt },
                              now,
                              business.quick.answerMinutes,
                            ) ?? 0,
                        })}
                      </span>
                    </div>
                    <p className="leading-relaxed text-pretty whitespace-pre-wrap">{q.summary}</p>
                    {q.photoUrls.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {q.photoUrls.map((src, n) => (
                          <li key={src}>
                            <a href={src} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private storage URL */}
                              <img
                                src={src}
                                alt={t("quick.photoN", { n: n + 1 })}
                                className="size-24 rounded-(--radius-lg) object-cover ring-1 ring-foreground/8"
                                loading="lazy"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <QuickAnswerForm requestId={q.id} />
                  </SectionCard>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SectionCard title={t("quick.dutyTitle")} icon={CircleDot} bodyClassName="grid gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden="true"
              className={
                live ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-muted-foreground/40"
              }
            />
            {t(live ? "quick.youOnDuty" : "quick.youOffDuty")}
          </p>
          <DutyForm start={duty?.dutyStart ?? null} end={duty?.dutyEnd ?? null} />
        </SectionCard>
      </div>
    </div>
  );
}

export default function VetQuickPage() {
  return (
    <Private rows={3}>
      <Pool />
    </Private>
  );
}
