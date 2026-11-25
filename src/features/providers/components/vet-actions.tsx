"use client";

import { Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/button-link";
import { useT } from "@/i18n/client";
import { recordCallTap } from "../server/public-actions";
import { telHref } from "../tel";

/** Call and directions for a vet profile (plus `children`, e.g. share). Call taps are counted for the vet's dashboard. */
export function VetContactButtons({
  providerId,
  phone,
  lat,
  lon,
  children,
}: {
  providerId: string;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  children?: ReactNode;
}) {
  const t = useT();
  const tel = telHref(phone);

  return (
    <div className="flex flex-wrap gap-2">
      {tel ? (
        <ButtonAnchor
          variant="outline"
          size="sm"
          className="bg-card"
          href={tel}
          onClick={() => void recordCallTap(providerId)}
        >
          <Phone aria-hidden="true" />
          {t("vets.callNow")}
        </ButtonAnchor>
      ) : null}
      {lat !== null && lon !== null ? (
        <ButtonAnchor
          variant="outline"
          size="sm"
          className="bg-card"
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Navigation aria-hidden="true" />
          {t("vets.directions")}
        </ButtonAnchor>
      ) : null}
      {children}
    </div>
  );
}
