/**
 * Request-time checks for Server Components. Pages render once per request,
 * so "now" is read here instead of with Date.now() in the component body
 * (react-hooks/purity flags that).
 */
export const isPast = (date: Date) => date.getTime() < Date.now();

/** True while now is inside [start, end). */
export const isCurrent = (start: Date, end: Date) => {
  const now = Date.now();
  return start.getTime() <= now && end.getTime() > now;
};
