import { z } from "zod";
import { json, failure, HttpError } from "@/server/http";
const areas = [
  { name: "All Singapore", lat: 1.3, lng: 103.85 },
  { name: "Tanjong Pagar", lat: 1.277, lng: 103.846 },
  { name: "City Hall", lat: 1.2932, lng: 103.852 },
  { name: "Bugis", lat: 1.299, lng: 103.855 },
  { name: "Orchard", lat: 1.304, lng: 103.832 },
  { name: "Chinatown", lat: 1.285, lng: 103.844 },
  { name: "Tiong Bahru", lat: 1.286, lng: 103.827 },
  { name: "Tampines", lat: 1.353, lng: 103.945 },
];
export async function GET(req: Request) {
  try {
    const q = z
      .string()
      .trim()
      .min(2)
      .max(100)
      .parse(new URL(req.url).searchParams.get("q"));
    const local = areas.filter((a) =>
      a.name.toLowerCase().includes(q.toLowerCase()),
    );
    if (local.length) return json({ items: local });
    if (!process.env.ONEMAP_TOKEN)
      return json({
        items: [],
        message:
          "Try a neighbourhood such as Bugis or Orchard. Address search is not connected.",
      });
    const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
    url.search = new URLSearchParams({
      searchVal: q,
      returnGeom: "Y",
      getAddrDetails: "Y",
      pageNum: "1",
    }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.ONEMAP_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new HttpError(
        503,
        "Address search is unavailable. Try a neighbourhood.",
      );
    const data = z
      .object({
        results: z.array(
          z.object({
            SEARCHVAL: z.string(),
            LATITUDE: z.string(),
            LONGITUDE: z.string(),
          }),
        ),
      })
      .parse(await response.json());
    return json({
      items: data.results
        .slice(0, 8)
        .map((p) => ({
          name: p.SEARCHVAL,
          lat: Number(p.LATITUDE),
          lng: Number(p.LONGITUDE),
        }))
        .filter(
          (p) =>
            p.lat >= 1.15 && p.lat <= 1.5 && p.lng >= 103.6 && p.lng <= 104.1,
        ),
    });
  } catch (e) {
    return failure(e);
  }
}
