/**
 * A pack of UI text in both languages side by side, so a feature's strings
 * live together and a missing translation is a type error. en.ts and bn.ts
 * spread every pack.
 */
export function pack<const T extends Record<string, string>>(en: T, bn: { [K in keyof T]: string }) {
  return { en, bn };
}
