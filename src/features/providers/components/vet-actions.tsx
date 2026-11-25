"use client";

import { Navigation, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonAnchor } from "@/components/ui/button-link";
import { useT } from "@/i18n/client";
import { recordCallTap } from "../server/public-actions";

/** Call, directions and share for a vet profile. Call taps are counted for the vet's dashboard. */
export function VetContactButtons({
  providerId,
  phone,
  lat,
  lon,
  name,
}: {
  providerId: string;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  name: string;
}) {
  const t = useT();

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("common.copied"));
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <ButtonAnchor
          variant="outline"
          size="sm"
          className="bg-card"
          href={`tel:${phone}`}
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
      <Button variant="ghost" size="sm" onClick={share}>
        <Share2 aria-hidden="true" />
        {t("vets.share")}
      </Button>
    </div>
  );
}
