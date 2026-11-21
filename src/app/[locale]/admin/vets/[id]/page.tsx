import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { adminVetPath } from "@/config/routes";
import { DocumentButton, ReviewActions } from "@/features/admin";
import { providerForReview } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Review", robots: { index: false } };

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, adminVetPath(id)));
  const r = await providerForReview(id);
  if (!r) notFound();
  const p = r.p;
  const facts: [string, string | null][] = [
    ["Email", r.email],
    ["Phone", r.phone],
    ["Public phone", p.phonePublic],
    ["BVC no.", p.registrationNo],
    ["Degrees", p.qualifications],
    ["Experience", p.experienceYears == null ? null : `${p.experienceYears} yrs`],
    ["Clinic", p.clinicName],
    ["Address", p.address],
    ["Area", [r.area, r.district].filter(Boolean).join(", ") || null],
    ["Chat fee", taka(fmt, p.consultFee)],
    ["Completeness", `${p.completeness}%`],
  ];
  return (
    <div className="grid gap-6">
      <PrivateHeading title={p.displayName} sub={p.title ?? undefined} action={<Badge>{p.status}</Badge>} />
      <p className="rounded-(--control-radius) bg-info/10 px-3 py-2 text-sm">{t("admin.checklist")}</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <div className="flex items-start gap-4">
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URL, admin only
              <img src={r.photoUrl} alt="" className="size-28 rounded-(--radius-xl) object-cover" />
            ) : null}
            <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
          {p.bio ? <p className="max-w-prose text-sm whitespace-pre-wrap">{p.bio}</p> : null}
          <section className="grid gap-2">
            <h2 className="font-heading text-lg font-semibold">{t("admin.documents")}</h2>
            {r.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("vet.docEmpty")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.documents.map((d) => (
                  <DocumentButton key={d.id} documentId={d.id} label={d.kind} />
                ))}
              </div>
            )}
          </section>
          <section className="grid gap-2">
            <h2 className="font-heading text-lg font-semibold">{t("admin.history")}</h2>
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {r.history.map((h) => (
                <li key={h.id}>
                  {fmt.dateTime(h.createdAt)} · {h.action}
                  {h.meta && typeof h.meta.reason === "string" ? ` · ${h.meta.reason}` : ""}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <ReviewActions providerId={p.id} status={p.status} />
      </div>
    </div>
  );
}

export default function AdminVetPage({ params }: PageProps<"/[locale]/admin/vets/[id]">) {
  return (
    <Private>
      <Review params={params} />
    </Private>
  );
}
