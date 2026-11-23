import { account } from "./account";
import { admin } from "./admin";
import { auth } from "./auth";
import { call } from "./call";
import { common } from "./common";
import { consult } from "./consult";
import { manage } from "./manage";
import { monitor } from "./monitor";
import { vet } from "./vet";
import { qa } from "./qa";
import { rx } from "./rx";
import { pages } from "./pages";
import { pay } from "./pay";
import { store } from "./store";
import { work } from "./work";

/**
 * Jotno's UI text, one pack per area (both languages side by side).
 * Add a pack here when you create one.
 */
const PACKS = [
  common,
  auth,
  account,
  vet,
  consult,
  call,
  rx,
  admin,
  manage,
  monitor,
  work,
  qa,
  store,
  pages,
  pay,
] as const;

type Merge<T extends readonly { en: object }[]> = T extends readonly [infer H, ...infer R]
  ? H extends { en: infer E }
    ? E & (R extends readonly { en: object }[] ? Merge<R> : unknown)
    : unknown
  : unknown;

export const APP_EN = Object.assign({}, ...PACKS.map((p) => p.en)) as Merge<typeof PACKS>;
export const APP_BN = Object.assign({}, ...PACKS.map((p) => p.bn)) as Record<keyof typeof APP_EN, string>;
