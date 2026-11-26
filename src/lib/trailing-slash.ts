/**
 * The site uses `trailingSlash: true`, so `/en/chat/x` costs a 308 redirect to
 * `/en/chat/x/`. Links we generate outside <Link> (push and in-app
 * notifications, invite and share links) go through this to land in one hop.
 *
 * Adds "/" to the end of the path of a relative or absolute URL, keeping the
 * query and hash. File paths (last segment with a dot: `/sw.js`) and URLs
 * that already end in "/" are left alone; so is anything that isn't a URL.
 */
export function withTrailingSlash(url: string): string {
  const cut = url.search(/[?#]/);
  const path = cut === -1 ? url : url.slice(0, cut);
  const rest = cut === -1 ? "" : url.slice(cut);
  if (!path || path.endsWith("/")) return url;
  // An absolute URL without a path ("https://jotno.com?ref=X") gets the root path.
  const origin = /^[a-z][a-z\d+.-]*:\/\/[^/]+$/i.test(path);
  if (!origin) {
    if (!path.startsWith("/") && !/^[a-z][a-z\d+.-]*:\/\//i.test(path)) return url;
    const last = path.slice(path.lastIndexOf("/") + 1);
    if (last.includes(".")) return url;
  }
  return `${path}/${rest}`;
}
