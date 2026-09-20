import { createClient } from "@supabase/supabase-js";
import { db } from "@/server/db";
import { HttpError } from "@/server/http";
export async function requireAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new HttpError(503, "Administrator sign-in is not configured.");
  const { data, error } = await createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session has expired. Sign in again.");
  const allowed = await db("admin").query(
    "SELECT 1 FROM app.administrators WHERE user_id=$1",
    [data.user.id],
  );
  if (!allowed.rowCount)
    throw new HttpError(403, "Administrator access is required.");
  return data.user.id;
}
