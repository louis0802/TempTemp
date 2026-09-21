import Explorer from "@/components/Explorer";
export default function Home() {
  return <Explorer mvp={process.env.PROMOTION_DATA_SOURCE === "mvp"} />;
}
