import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * A QR code for a link, drawn on the server as SVG. Always dark on white
 * (scanners need the contrast, in dark mode too), so it prints as it shows.
 */
export async function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    // An inline data URL: next/image adds nothing for a vector drawn on the server.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} className={cn("aspect-square rounded-md bg-white", className)} />
  );
}
