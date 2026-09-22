import Explorer from "@/components/Explorer";
import { mvpPreviewOptions } from "@/server/mvp";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const options = mvpPreviewOptions({
    get: (name) => (typeof params[name] === "string" ? params[name] : null),
  });
  return (
    <Explorer
      mvp
      viewMode={options.mode === "corpus" ? "live" : options.mode}
      showSourceText={options.showSourceText}
    />
  );
}
