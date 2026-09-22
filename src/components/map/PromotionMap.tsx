"use client";
import { useEffect, useRef, useState } from "react";
import {
  MapLocationGroup,
  locationLabel,
  locationSelected,
  locationPinText,
} from "@/domain/map-locations";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
type Props = {
  groups: MapLocationGroup[];
  selected: string | null;
  onSelect: (group: MapLocationGroup) => void;
  bounds: [number, number, number, number];
  onBounds: (b: [number, number, number, number]) => void;
};
export default function PromotionMap({
  groups,
  selected,
  onSelect,
  bounds,
  onBounds,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    markers = useRef<Marker[]>([]);
  const handlers = useRef({ onSelect, onBounds, selected });
  useEffect(() => {
    handlers.current = { onSelect, onBounds, selected };
  }, [onSelect, onBounds, selected]);
  const [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const schematic = process.env.NEXT_PUBLIC_MAP_MODE === "schematic";
  const emittedBounds = useRef<number[] | null>(null);
  const initialBounds = useRef(bounds);
  useEffect(() => {
    if (schematic || !container.current) return;
    let disposed = false;
    import("maplibre-gl")
      .then(({ Map, NavigationControl }) => {
        if (disposed) return;
        try {
          const m = new Map({
            container: container.current!,
            style: key
              ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`
              : {
                  version: 8,
                  sources: {
                    osm: {
                      type: "raster",
                      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                      tileSize: 256,
                      maxzoom: 19,
                      attribution:
                        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
                    },
                  },
                  layers: [{ id: "osm", type: "raster", source: "osm" }],
                },
            center: [103.846, 1.29],
            zoom: 13,
            maxBounds: [
              [103.6, 1.15],
              [104.1, 1.5],
            ],
            attributionControl: { compact: false },
          });
          map.current = m;
          m.addControl(new NavigationControl(), "bottom-right");
          m.on("load", () => {
            if (!disposed) setReady(true);
          });
          m.fitBounds(
            [
              [initialBounds.current[0], initialBounds.current[1]],
              [initialBounds.current[2], initialBounds.current[3]],
            ],
            { duration: 0, padding: 0 },
          );
          const resize = new ResizeObserver(() => m.resize());
          resize.observe(container.current!);
          m.on("remove", () => resize.disconnect());
          m.on("error", () => {
            if (!disposed) {
              disposed = true;
              setFailed(true);
              m.remove();
              map.current = null;
            }
          });
          m.on("moveend", () => {
            const b = m.getBounds();
            const next: [number, number, number, number] = [
              Math.max(103.6, b.getWest()),
              Math.max(1.15, b.getSouth()),
              Math.min(104.1, b.getEast()),
              Math.min(1.5, b.getNorth()),
            ];
            emittedBounds.current = next;
            handlers.current.onBounds(next);
          });
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [key, schematic]);
  useEffect(() => {
    if (map.current && ready) {
      if (
        emittedBounds.current?.every(
          (v, i) => Math.abs(v - bounds[i]) < 0.000001,
        )
      )
        return;
      map.current.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 0, duration: 0 },
      );
    }
  }, [bounds, ready]);
  useEffect(() => {
    if (!map.current || !ready) return;
    let disposed = false;
    import("maplibre-gl").then(({ Marker }) => {
      if (disposed || !map.current) return;
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      groups.forEach((group) => {
        const el = document.createElement("button");
        el.className = `map-pin ${group.promotions.length > 1 ? "multiple" : ""} ${locationSelected(group, handlers.current.selected) ? "selected" : ""}`;
        el.textContent = locationPinText(group);
        el.setAttribute("aria-label", locationLabel(group));
        el.setAttribute("aria-haspopup", "dialog");
        el.dataset.locationKey = group.key;
        el.onclick = () => handlers.current.onSelect(group);
        markers.current.push(
          new Marker({ element: el })
            .setLngLat([group.lng, group.lat])
            .addTo(map.current!),
        );
      });
    });
    return () => {
      disposed = true;
    };
  }, [groups, ready]);
  useEffect(() => {
    for (const marker of markers.current) {
      const el = marker.getElement();
      const group = groups.find((g) => g.key === el.dataset.locationKey);
      el.classList.toggle(
        "selected",
        !!group && locationSelected(group, selected),
      );
    }
  }, [groups, selected]);
  if (!schematic && !failed)
    return (
      <div
        ref={container}
        className="live-map"
        aria-label="Singapore promotion map"
      />
    );
  const [w, s, e, n] = bounds;
  const project = (lng: number, lat: number) => ({
    x: ((lng - w) / (e - w)) * 1000,
    y: ((n - lat) / (n - s)) * 800,
  });
  const labels = [
    ["ORCHARD", 103.828, 1.309],
    ["BUGIS", 103.858, 1.303],
    ["CITY HALL", 103.856, 1.291],
    ["CHINATOWN", 103.844, 1.282],
    ["TIONG BAHRU", 103.822, 1.288],
    ["MARINA BAY", 103.86, 1.278],
    ["TANJONG PAGAR", 103.838, 1.273],
  ] as const;
  return (
    <div className="schematic">
      <svg viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern
            id="blocks"
            width="76"
            height="67"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-24)"
          >
            <rect width="76" height="67" fill="#e8ece7" />
            <rect x="5" y="5" width="65" height="56" rx="7" fill="#f3f4ef" />
          </pattern>
        </defs>
        <rect width="1000" height="800" fill="url(#blocks)" />
        <path
          d="M750 800L770 620Q620 580 765 440T940 340L1000 390V800Z"
          fill="#d6e7ec"
        />
        <path
          d="M130 40Q230 20 280 90L250 160L110 180L65 110Z M480 260Q550 230 610 300L570 355L475 330Z M50 610L170 580L200 680L110 740Z"
          fill="#d0dfcf"
        />
        <g fill="none" stroke="#fff" strokeWidth="17">
          <path d="M-30 530L1040 110M-30 150L860 820M210 -50L540 850M-30 700L790 -30M-20 360Q330 440 570 520T1010 540" />
        </g>
        <g fill="none" stroke="#c5cec4" strokeWidth="2">
          <path d="M-30 530L1040 110M-30 150L860 820M210 -50L540 850M-30 700L790 -30M-20 360Q330 440 570 520T1010 540" />
        </g>
      </svg>
      <div className="map-labels">
        {labels.map(([name, lng, lat]) => {
          const p = project(lng, lat);
          return (
            <span
              key={name}
              style={{ left: `${p.x / 10}%`, top: `${p.y / 8}%` }}
            >
              {name}
            </span>
          );
        })}
      </div>
      {groups.map((group) => {
        const point = project(group.lng, group.lat);
        return (
          <button
            key={group.key}
            data-location-key={group.key}
            aria-label={locationLabel(group)}
            aria-haspopup="dialog"
            className={`map-pin schematic-pin ${group.promotions.length > 1 ? "multiple" : ""} ${locationSelected(group, selected) ? "selected" : ""}`}
            style={{ left: `${point.x / 10}%`, top: `${point.y / 8}%` }}
            onClick={() => onSelect(group)}
          >
            {locationPinText(group)}
          </button>
        );
      })}
      <span className="map-disclaimer">
        {failed ? "Map unavailable · " : "Local preview · "}schematic, not for
        navigation
      </span>
    </div>
  );
}
