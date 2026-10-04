export type AuthoritativeSourceKind =
  "merchant_web" | "merchant_social" | "issuer_platform";
export interface SocialScope {
  platform: "instagram";
  account: string;
  allowedContent: readonly ("profile" | "post" | "reel" | "tv")[];
  /** Accountless post URLs need independently reviewed, exact item/account evidence. */
  contentBindings?: readonly {
    url: string;
    account: string;
    evidenceRefs: readonly string[];
  }[];
}
export interface SourceScope {
  allowedHosts: readonly string[];
  sourceKind?: AuthoritativeSourceKind;
  socialScope?: SocialScope;
}
const reserved = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "accounts",
  "explore",
  "direct",
  "stories",
  "about",
  "developer",
  "api",
  "graphql",
  "challenge",
  "privacy",
  "legal",
]);
export function instagramIdentity(value: string) {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !["instagram.com", "www.instagram.com"].includes(u.hostname) ||
    /%|\\|\/\//.test(u.pathname)
  )
    return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const account = (v: string) =>
    /^[a-z0-9._]{1,30}$/i.test(v) && !reserved.has(v.toLowerCase());
  const content = (v: string) => ["p", "reel", "tv"].includes(v);
  if (parts.length === 1 && account(parts[0]))
    return {
      account: parts[0].toLowerCase(),
      kind: "profile" as const,
      nativeId: null,
      path: `/${parts[0].toLowerCase()}/`,
    };
  if (
    parts.length === 2 &&
    content(parts[0]) &&
    /^[a-zA-Z0-9_-]+$/.test(parts[1])
  )
    return {
      account: null,
      kind: parts[0] === "p" ? ("post" as const) : (parts[0] as "reel" | "tv"),
      nativeId: parts[1],
      path: `/${parts[0]}/${parts[1]}/`,
    };
  if (
    parts.length === 3 &&
    account(parts[0]) &&
    content(parts[1]) &&
    /^[a-zA-Z0-9_-]+$/.test(parts[2])
  )
    return {
      account: parts[0].toLowerCase(),
      kind: parts[1] === "p" ? ("post" as const) : (parts[1] as "reel" | "tv"),
      nativeId: parts[2],
      path: `/${parts[0].toLowerCase()}/${parts[1]}/${parts[2]}/`,
    };
  return null;
}
/** Shared by network grants/redirects and server publication provenance. */
export function assertSourceScope(source: SourceScope, value: string): URL {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !source.allowedHosts.includes(u.hostname)
  )
    throw new Error("untrusted_direct_source_url");
  const shared = /(?:^|\.)(?:instagram|facebook|tiktok)\.com$/.test(u.hostname);
  if (source.sourceKind !== "merchant_social") {
    if (shared || source.socialScope)
      throw new Error("social_account_scope_required");
    return u;
  }
  const scope = source.socialScope;
  if (!scope || scope.platform !== "instagram")
    throw new Error("social_account_scope_required");
  const id = instagramIdentity(u.href);
  const profile = instagramIdentity(
    `https://www.instagram.com/${scope.account}/`,
  );
  if (
    !id ||
    !profile ||
    profile.account !== scope.account ||
    !scope.allowedContent.includes(id.kind)
  )
    throw new Error("unsupported_social_path");
  if (id.account !== null) {
    if (id.account !== scope.account)
      throw new Error("social_account_mismatch");
  } else {
    const bindings =
      scope.contentBindings?.filter(
        (b) => instagramIdentity(b.url)?.path === id.path,
      ) ?? [];
    if (
      !bindings.length ||
      bindings.some(
        (b) =>
          b.account !== scope.account ||
          !b.evidenceRefs.length ||
          b.evidenceRefs.some((r) => !r.trim()),
      )
    )
      throw new Error("social_content_account_unproven");
  }
  // No endpoint/auth query can be smuggled through an otherwise supported path.
  if (
    [...u.searchParams.keys()].some(
      (key) =>
        !/^utm_/i.test(key) && !["hl", "img_index", "fbclid"].includes(key),
    )
  )
    throw new Error("unsupported_social_query");
  return u;
}
