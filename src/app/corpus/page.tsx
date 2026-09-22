import Explorer from "@/components/Explorer";
import { mvpPreviewOptions } from "@/server/mvp";
import { notFound } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const options = mvpPreviewOptions({
    get: (name) => (typeof params[name] === "string" ? params[name] : null),
  });
  return (
    <Explorer mvp viewMode="corpus" showSourceText={options.showSourceText} />
  );
}
