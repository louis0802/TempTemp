import { load } from "cheerio";
import { instagramIdentity } from "../../../src/ingestion/direct-sources/source-scope";
import type { PublicSocialCapture } from "./assessment";

export type AccountOutcome =
  | "exact_account_verified"
  | "exact_account_unverified"
  | "exact_account_unresolved"
  | "contradictory_identity"
  | "blocked_access";
export function socialContentKey(url: string) {
  const ig = instagramIdentity(url);
  if (ig?.nativeId) return `instagram:${ig.nativeId}`;
  try {
    const u = new URL(url);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      /%|\\/.test(u.pathname) ||
      !["facebook.com", "www.facebook.com"].includes(u.hostname)
    )
      return null;
    const reel = u.pathname.match(/^\/reel\/(\d+)\/?$/);
    const video = u.pathname.match(/^\/\d+\/videos\/(?:[^/]+\/)?(\d+)\/?$/);
    return reel || video ? `facebook:${(reel ?? video)![1]}` : null;
  } catch {
    return null;
  }
}
/** Standard public identity metadata, independent of display name and merchant hint. */
export function resolvePublicAccount(
  url: string,
  capture: PublicSocialCapture | undefined,
) {
  if (!capture)
    return {
      outcome: "exact_account_unresolved" as AccountOutcome,
      account: null,
    };
  const $ = load(capture.body);
  $("script,style,noscript").remove();
  const text = `${$("title").text()} ${$("body").text()}`;
  if (
    capture.error ||
    capture.status !== 200 ||
    capture.redirectTo ||
    /login required|log in to (?:continue|instagram)|challenge|captcha|unsupported browser/i.test(
      text,
    ) ||
    $("form[action*='login'],form[action*='challenge'],input[type='password']")
      .length
  )
    return { outcome: "blocked_access" as AccountOutcome, account: null };
  const key = socialContentKey(url);
  const canonical = $("link[rel='canonical']").attr("href");
  const og = $("meta[property='og:url']").attr("content");
  if (
    !key ||
    !canonical ||
    !og ||
    socialContentKey(canonical) !== key ||
    socialContentKey(og) !== key
  )
    return {
      outcome: "exact_account_unresolved" as AccountOutcome,
      account: null,
    };
  const account = (v: string) => {
    const ig = instagramIdentity(v);
    if (ig) return ig.account;
    try {
      const u = new URL(v);
      return ["facebook.com", "www.facebook.com"].includes(u.hostname)
        ? (u.pathname.match(/^\/(\d+)\/videos\//)?.[1] ?? null)
        : null;
    } catch {
      return null;
    }
  };
  const scoped = account(og),
    canon = account(canonical);
  const authors = $("a[rel='author'][href]")
    .toArray()
    .map((a) => {
      try {
        return instagramIdentity(new URL($(a).attr("href")!, url).href)
          ?.account;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => typeof value === "string");
  const requestedAccount = instagramIdentity(url)?.account ?? null;
  const expected = scoped ?? canon ?? requestedAccount;
  if (
    (requestedAccount && scoped && requestedAccount !== scoped) ||
    (requestedAccount && canon && requestedAccount !== canon) ||
    (scoped && canon && scoped !== canon) ||
    authors.some((a) => expected && a !== expected) ||
    new Set(authors).size > 1
  )
    return {
      outcome: "contradictory_identity" as AccountOutcome,
      account: null,
    };
  const exact =
    scoped ??
    canon ??
    (key.startsWith("instagram:") && new Set(authors).size === 1
      ? authors[0]
      : null);
  return {
    outcome: exact
      ? ("exact_account_unverified" as AccountOutcome)
      : ("exact_account_unresolved" as AccountOutcome),
    account: exact,
  };
}
