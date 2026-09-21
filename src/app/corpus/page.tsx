import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
export default function CorpusPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Explorer mvp includeExpired />;
}
