/**
 * The link-preview picture (Facebook, WhatsApp, Messenger cards). Pages with
 * their own photo (a vet, a product) use it; every other page gets the brand
 * card drawn by src/app/og.png/route.tsx.
 */
export const OG_IMAGE_PATH = "/og.png";
export const OG_SIZE = { width: 1200, height: 630 } as const;

export function ogImages(photoUrl?: string | null): ({ url: string } & Partial<typeof OG_SIZE>)[] {
  return photoUrl ? [{ url: photoUrl }] : [{ url: OG_IMAGE_PATH, ...OG_SIZE }];
}
