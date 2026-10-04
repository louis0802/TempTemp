"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Promotion } from "@/domain/promotion";
import PromotionForm, {
  draftPromotion,
} from "@/components/admin/PromotionForm";
type Candidate = {
  id: string;
  originKind: "telegram" | "direct";
  sourceId: string;
  data: Partial<Promotion>;
  issues: string[];
  permalink: string;
  label: string;
  existing: Promotion | null;
};
const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
let browserAuth: SupabaseClient | null = null;
function auth() {
  if (!configured) return null;
  return (browserAuth ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: true } },
  ));
}
export default function Admin() {
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [offers, setOffers] = useState<Promotion[]>([]),
    [candidates, setCandidates] = useState<Candidate[]>([]),
    [sources, setSources] = useState<Record<string, unknown>[]>([]),
    [editing, setEditing] = useState<{
      promotion: Promotion;
      candidateId?: string;
      originKind?: "telegram" | "direct";
    } | null>(null),
    [offerCursor, setOfferCursor] = useState<string | null>(null),
    [candidateCursor, setCandidateCursor] = useState<string | null>(null),
    [dismiss, setDismiss] = useState<Candidate | null>(null),
    [dismissReason, setDismissReason] = useState("");
  async function access() {
    return (
      (await auth()!.auth.getSession()).data.session?.access_token || token
    );
  }
  async function load(accessToken: string, kind?: "offers" | "candidates") {
    const q = new URLSearchParams();
    if (kind === "offers" && offerCursor) q.set("offerCursor", offerCursor);
    if (kind === "candidates" && candidateCursor)
      q.set("candidateCursor", candidateCursor);
    const responses = await Promise.all(
      [`/api/admin/review?${q}`, "/api/admin/sources"].map((url) =>
        fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ),
    );
    const [review, health] = await Promise.all(responses.map((r) => r.json()));
    if (!responses[0].ok || !responses[1].ok)
      throw new Error(review.error || health.error);
    if (!kind || kind === "offers") {
      setOffers((previous) =>
        kind
          ? [
              ...previous,
              ...review.offers.filter(
                (p: Promotion) => !previous.some((x) => x.id === p.id),
              ),
            ]
          : review.offers,
      );
      setOfferCursor(review.nextOfferCursor);
    }
    if (!kind || kind === "candidates") {
      setCandidates((previous) =>
        kind
          ? [
              ...previous,
              ...review.candidates.filter(
                (c: Candidate) => !previous.some((x) => x.id === c.id),
              ),
            ]
          : review.candidates,
      );
      setCandidateCursor(review.nextCandidateCursor);
    }
    setSources(health.sources);
  }
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function save(
    p: Promotion,
    reason: string,
    action: "correct" | "withdraw",
  ) {
    await task(async () => {
      const r = await fetch(
        editing!.candidateId
          ? `/api/admin/${editing!.originKind === "direct" ? "direct-candidates" : "candidates"}/${editing!.candidateId}/review`
          : `/api/admin/promotions/${editing!.promotion.id}/review`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await access()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: editing!.candidateId ? "approve" : action,
            promotion: p,
            expectedRevision: editing!.promotion.revision,
            reason,
          }),
        },
      );
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setEditing(null);
      setNotice(action === "withdraw" ? "Offer withdrawn." : "Offer approved.");
      await load(await access());
    });
  }
  async function importFile(file: File) {
    await task(async () => {
      if (file.size > 10_000_000)
        throw new Error("Choose a JSON export under 10 MB.");
      const text = await file.text();
      JSON.parse(text);
      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await access()}`,
          "Content-Type": "application/json",
        },
        body: text,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNotice(
        data.results
          .map(
            (x: { source: string; ok: boolean; count: number }) =>
              `${x.source}: ${x.ok ? `${x.count} posts stored` : "failed; checkpoint retained"}`,
          )
          .join(" · "),
      );
      await load(await access());
    });
  }
  return (
    <main className="admin-page">
      <header>
        <Link href="/" className="brand">
          around<span className="brand-dot">.</span>
        </Link>
        <Link href="/">← Explore deals</Link>
      </header>
      <h1>Curator workspace</h1>
      <p>Review evidence, resolve uncertainty, and keep the map trustworthy.</p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {!token ? (
        <form
          className="admin-login"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void task(async () => {
              const client = auth();
              if (!client)
                throw new Error("Run local setup to enable authentication.");
              const result = await client.auth.signInWithPassword({
                email: String(form.get("email")),
                password: String(form.get("password")),
              });
              if (result.error) throw result.error;
              await load(result.data.session!.access_token);
              setToken(result.data.session!.access_token);
            });
          }}
        >
          <h2>Administrator sign-in</h2>
          <p>Access is limited to invited administrators.</p>
          <label>
            Email
            <input type="email" name="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="admin-actions">
            <button
              disabled={busy}
              onClick={() => task(async () => load(await access()))}
            >
              Refresh
            </button>
            <button
              onClick={() => {
                void auth()?.auth.signOut();
                setToken("");
                setOffers([]);
                setCandidates([]);
                setSources([]);
                setEditing(null);
                setDismiss(null);
                setNotice("");
              }}
            >
              Sign out
            </button>
          </div>
          <section className="admin-box import-box">
            <h2>Import source posts</h2>
            <p>
              Choose an approved JSON export. Incomplete offers enter the review
              inbox.
            </p>
            <label className="upload-label">
              Approved JSON export
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="form-help">
              Live preview collection runs through{" "}
              <code>npm run ingest -- --live</code>. This page does not start a
              recurring job.
            </p>
          </section>
          {editing && (
            <PromotionForm
              key={`${editing.candidateId ?? editing.promotion.id}-${editing.promotion.revision}`}
              initial={editing.promotion}
              busy={busy}
              onSave={save}
              onCancel={() => setEditing(null)}
              canWithdraw={!editing.candidateId}
            />
          )}
          {dismiss && (
            <form
              className="admin-box"
              onSubmit={(e) => {
                e.preventDefault();
                void task(async () => {
                  const response = await fetch(
                    `/api/admin/${dismiss.originKind === "direct" ? "direct-candidates" : "candidates"}/${dismiss.id}/review`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${await access()}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        action: "exclude",
                        reason: dismissReason,
                      }),
                    },
                  );
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);
                  setDismiss(null);
                  setDismissReason("");
                  setNotice(
                    "Candidate dismissed. Evidence remains in the audit record.",
                  );
                  await load(await access());
                });
              }}
            >
              <h2>Dismiss this candidate</h2>
              <label className="dismiss-reason">
                Reason
                <input
                  required
                  minLength={3}
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                />
              </label>
              <div className="admin-actions">
                <button disabled={busy} type="submit">
                  Confirm dismissal
                </button>
                <button type="button" onClick={() => setDismiss(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="admin-grid">
            <section className="admin-box">
              <h2>Offers · {offers.length} loaded</h2>
              {!offers.length && (
                <p>
                  No published or structured offers yet. Resolve a candidate
                  below to create one.
                </p>
              )}
              {offers.map((p) => (
                <div className="admin-offer" key={p.id}>
                  <div>
                    <strong>
                      {p.merchant} · {p.benefit}
                    </strong>
                    <p>
                      {p.status} · revision {p.revision}
                    </p>
                  </div>
                  <button onClick={() => setEditing({ promotion: p })}>
                    Review
                  </button>
                </div>
              ))}
              {offerCursor && (
                <button
                  disabled={busy}
                  onClick={() =>
                    task(async () => load(await access(), "offers"))
                  }
                >
                  Load more offers
                </button>
              )}
            </section>
            <section className="admin-box">
              <h2>Source health</h2>
              {sources.map((s) => (
                <div className="source-row" key={String(s.id)}>
                  <strong>{String(s.label)}</strong>
                  <span>
                    {String(s.status)}
                    {s.stale ? " · stale" : ""}
                  </span>
                  <div>
                    Last successful check:{" "}
                    {s.last_success
                      ? new Date(String(s.last_success)).toLocaleString(
                          "en-SG",
                          { timeZone: "Asia/Singapore" },
                        )
                      : "Never"}
                  </div>
                  <div>
                    Last attempt:{" "}
                    {s.last_attempt
                      ? new Date(String(s.last_attempt)).toLocaleString(
                          "en-SG",
                          { timeZone: "Asia/Singapore" },
                        )
                      : "Never"}
                  </div>
                  <div>
                    {String(s.review_count ?? 0)} for review ·{" "}
                    {String(s.pending_count ?? 0)} pending or retrying
                  </div>
                </div>
              ))}
            </section>
          </div>
          <section className="admin-box">
            <h2>Review inbox · {candidates.length} loaded</h2>
            {!candidates.length && <p>No unresolved candidates.</p>}
            {candidates.map((c) => (
              <details className="source-row" key={c.id}>
                <summary>
                  {c.data?.merchant || c.label || "Source post"} ·{" "}
                  {c.data?.benefit || c.issues[0]?.replaceAll("_", " ")}
                </summary>
                <p>
                  {c.originKind === "direct"
                    ? "Direct source"
                    : "Telegram signal"}
                </p>
                <p>{c.issues.map((x) => x.replaceAll("_", " ")).join(" · ")}</p>
                <blockquote className="source-evidence">
                  {c.data?.description || JSON.stringify(c.data)}
                </blockquote>
                {c.permalink && (
                  <a href={c.permalink} target="_blank" rel="noreferrer">
                    {c.originKind === "direct"
                      ? "Open official source ↗"
                      : "Open original post ↗"}
                  </a>
                )}
                <div className="admin-actions">
                  <button
                    onClick={() => {
                      const base =
                        c.existing ??
                        draftPromotion(c.data, {
                          label: c.label,
                          url: c.permalink,
                          ...(c.originKind === "direct"
                            ? { kind: "direct" as const, sourceId: c.sourceId }
                            : {}),
                        });
                      setEditing({
                        promotion: base,
                        candidateId:
                          c.originKind === "direct" || !c.existing
                            ? c.id
                            : undefined,
                        originKind: c.originKind,
                      });
                      setDismiss(null);
                    }}
                  >
                    Resolve candidate
                  </button>
                  <button
                    onClick={() => {
                      setDismiss(c);
                      setDismissReason("");
                      setEditing(null);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </details>
            ))}
            {candidateCursor && (
              <button
                disabled={busy}
                onClick={() =>
                  task(async () => load(await access(), "candidates"))
                }
              >
                Load more candidates
              </button>
            )}
          </section>
        </>
      )}
    </main>
  );
}
