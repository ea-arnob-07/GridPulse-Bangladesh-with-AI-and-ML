"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BatteryCharging,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CloudSun,
  Database,
  FlaskConical,
  Gauge,
  Home as HomeIcon,
  Info,
  Leaf,
  Layers3,
  Lightbulb,
  Linkedin,
  LocateFixed,
  MapPinned,
  Menu,
  Moon,
  Radio,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Wheat,
  X,
  Zap,
} from "lucide-react";
import { bdAdm2 } from "bdatlas";
import type { FeatureCollection as GeoJSONFeatureCollection, MultiPolygon, Polygon } from "geojson";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMapType,
  Marker as MapLibreMarkerType,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

type MetricKey = "stress" | "equity" | "demand" | "solar";
type TabKey = "overview" | "map" | "equity" | "forecast" | "simulator" | "community" | "data";
type ThemeMode = "dark" | "light";
type CommunityReport = {
  id: string;
  district: string;
  location: string;
  issue: string;
  severity: string;
  time: string;
  duration: string;
};

type LiveLocation = {
  displayName: string;
  locality: string;
  district: string;
  division: string;
  latitude: number;
  longitude: number;
  postcode?: string;
  category?: string;
};

type GeocodeResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  category?: string;
  address?: Record<string, string>;
};

type District = {
  name: string;
  division: string;
};

type GeoGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown[];
};

type GeoFeature = {
  type: "Feature";
  properties: { shapeName?: string };
  geometry: GeoGeometry;
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

const BUNDLED_BANGLADESH_ADM2 = bdAdm2 as unknown as GeoCollection;
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_LABEL_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  "© Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  Dhaka: [
    "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj",
    "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi",
    "Rajbari", "Shariatpur", "Tangail",
  ],
  Chattogram: [
    "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla",
    "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati",
  ],
  Rajshahi: [
    "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj",
    "Pabna", "Rajshahi", "Sirajganj",
  ],
  Khulna: [
    "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna",
    "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira",
  ],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: [
    "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari",
    "Panchagarh", "Rangpur", "Thakurgaon",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

const DISTRICTS: District[] = Object.entries(DISTRICTS_BY_DIVISION).flatMap(
  ([division, names]) => names.map((name) => ({ name, division })),
);

const NAME_ALIASES: Record<string, string> = {
  barisal: "Barishal",
  brahamanbaria: "Brahmanbaria",
  bogra: "Bogura",
  "chapai nawabganj": "Chapainawabganj",
  chittagong: "Chattogram",
  comilla: "Cumilla",
  jessore: "Jashore",
  jaipurhat: "Joypurhat",
  jhalakati: "Jhalokati",
  khagrachari: "Khagrachhari",
  maulvibazar: "Moulvibazar",
  "moulvi bazar": "Moulvibazar",
  netrakona: "Netrokona",
  nawabganj: "Chapainawabganj",
  "cox s bazar": "Cox's Bazar",
};

const URBAN_OVERRIDES: Record<string, number> = {
  Dhaka: 88,
  Narayanganj: 75,
  Gazipur: 68,
  Chattogram: 69,
  Khulna: 55,
  Rajshahi: 51,
  Sylhet: 47,
  Cumilla: 37,
  Mymensingh: 35,
  Rangpur: 34,
  Faridpur: 30,
  "Cox's Bazar": 32,
};

const METRIC_META: Record<MetricKey, { label: string; description: string }> = {
  stress: {
    label: "Grid stress",
    description: "AI-estimated pressure during the selected time window",
  },
  equity: {
    label: "Energy equity gap",
    description: "Estimated rural–urban reliability difference",
  },
  demand: {
    label: "Demand estimate",
    description: "Spatial allocation from zone demand and activity proxies",
  },
  solar: {
    label: "Solar potential",
    description: "Daily photovoltaic resource scenario",
  },
};

const TAB_LABELS: Record<TabKey, string> = {
  overview: "National overview",
  map: "Energy map",
  equity: "Rural–urban equity",
  forecast: "Forecast centre",
  simulator: "Smart simulator",
  community: "Community pulse",
  data: "Data & AI transparency",
};

const SYSTEM_DEMAND = [
  10.4, 9.9, 9.5, 9.3, 9.5, 10.2, 11.6, 12.8, 13.7, 14.2, 14.5, 14.8,
  14.6, 14.4, 14.8, 15.2, 15.7, 16.1, 16.4, 16.2, 15.5, 14.6, 13.4, 11.8,
];

const MODEL_WINDOW = {
  history: "365 days",
  equivalent: "52 weeks · 12 months",
  samples: "8,760 hourly points",
  training: "335 days",
  validation: "30 days",
  horizon: "Next 24 hours",
  riskWindow: "6:00 PM–8:00 PM",
  cutoff: "22 Aug 2026 · 7:30 PM",
} as const;

const DEMO_REPORTS = [
  { id: "demo-1", district: "Dhaka", location: "Mirpur 10", issue: "Power outage", severity: "High", time: "18 min ago", duration: "45–90 min" },
  { id: "demo-2", district: "Faridpur", location: "Saltha", issue: "Low voltage", severity: "Medium", time: "31 min ago", duration: "15–45 min" },
  { id: "demo-3", district: "Chattogram", location: "Pahartali", issue: "Frequent fluctuation", severity: "Medium", time: "46 min ago", duration: "Under 15 min" },
  { id: "demo-4", district: "Rangpur", location: "Mithapukur", issue: "Power outage", severity: "High", time: "1 hr ago", duration: "Over 90 min" },
];

function hashString(value: string) {
  return value.split("").reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function formatClock12(hour: number, minute = 0) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const displayHour = normalizedHour % 12 || 12;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

const DHAKA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function LiveDhakaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span className="snapshot-time" aria-label="Current date and time in Dhaka">
      <Clock3 size={15} />
      <span><i className="live-clock-dot" />Live Dhaka · {now ? DHAKA_DATE_TIME_FORMATTER.format(now).replace(" at ", ", ") : "Syncing…"}</span>
    </span>
  );
}

function normalizeDistrictName(value: string) {
  const key = value
    .toLowerCase()
    .replace(/district|zila/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
  if (NAME_ALIASES[key]) return NAME_ALIASES[key];
  return (
    DISTRICTS.find(
      (district) =>
        district.name.toLowerCase().replace(/[^a-z]+/g, " ").trim() === key,
    )?.name ?? value
  );
}

function rawDistrictDemand(name: string, seed: number) {
  const demandBase = 105 + ((seed >>> 2) % 520);
  return name === "Dhaka"
    ? 3780
    : name === "Chattogram"
      ? 1280
      : name === "Gazipur"
        ? 890
        : demandBase;
}

const DISTRICT_DEMAND_SCALE = 16_200 / DISTRICTS.reduce(
  (total, district) => total + rawDistrictDemand(district.name, hashString(district.name)),
  0,
);

function districtMetrics(name: string) {
  const district =
    DISTRICTS.find((item) => item.name === normalizeDistrictName(name)) ?? DISTRICTS[0];
  const seed = hashString(district.name);
  const urbanBase =
    URBAN_OVERRIDES[district.name] ??
    ({
      Dhaka: 34,
      Chattogram: 31,
      Rajshahi: 25,
      Khulna: 27,
      Barishal: 22,
      Sylhet: 24,
      Rangpur: 19,
      Mymensingh: 18,
    }[district.division] as number);
  const semiDense = district.name === "Dhaka" ? 7 : 9 + (seed % 10);
  const urban = Math.min(88, urbanBase + (seed % 7) - 3);
  const rural = Math.max(5, 100 - urban - semiDense);
  const stress = 42 + (seed % 47);
  const equityGap = 6 + ((seed >>> 3) % 21);
  const solar = 3.8 + ((seed >>> 4) % 14) / 10;
  const demand = Math.max(
    35,
    Math.round(rawDistrictDemand(district.name, seed) * DISTRICT_DEMAND_SCALE),
  );
  const urbanReliability = Math.max(66, 94 - ((seed >>> 5) % 12));
  const ruralReliability = Math.max(52, urbanReliability - equityGap);
  return {
    ...district,
    districtName: district.name,
    scope: "district" as "district" | "locality",
    areaKey: district.name,
    stress,
    equityGap,
    solar: Number(solar.toFixed(1)),
    demand,
    urban,
    rural,
    semiDense,
    confidence: 64 + ((seed >>> 7) % 25),
    outageReports: (seed >>> 4) % 19,
    urbanReliability,
    ruralReliability,
    peakHour: formatClock12(18 + ((seed >>> 6) % 3), (seed % 2) * 30),
    population: Number((0.8 + ((seed >>> 8) % 52) / 10).toFixed(1)),
  };
}

function localityMetrics(location: LiveLocation): ReturnType<typeof districtMetrics> {
  const base = districtMetrics(location.district);
  const seed = hashString(`${location.locality}:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`);
  const category = (location.category ?? "").toLowerCase();
  const ruralPlace = ["village", "hamlet", "isolated_dwelling", "farmland"].some((type) => category.includes(type));
  const demandShare = 0.035 + (seed % 56) / 1000;
  const semiDense = ruralPlace ? 12 + ((seed >>> 4) % 14) : 5 + ((seed >>> 4) % 10);
  const urbanCandidate = ruralPlace
    ? 8 + ((seed >>> 7) % 20)
    : Math.max(48, base.urban + ((seed >>> 6) % 13) - 3);
  const urban = Math.min(95 - semiDense, urbanCandidate);
  const rural = 100 - urban - semiDense;
  const localityAdjustment = (seed % 13) - 6;

  return {
    ...base,
    name: location.locality,
    districtName: location.district,
    division: location.division,
    scope: "locality",
    areaKey: `${location.district}:${location.locality}:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`,
    stress: Math.max(28, Math.min(94, base.stress + localityAdjustment)),
    equityGap: Math.max(4, Math.min(30, base.equityGap + ((seed >>> 5) % 7) - 3)),
    solar: Number(Math.max(3.4, Math.min(5.8, base.solar + (((seed >>> 8) % 7) - 3) / 10)).toFixed(1)),
    demand: Math.max(6, Math.round(base.demand * demandShare)),
    urban,
    semiDense,
    rural,
    confidence: Math.max(58, Math.min(86, base.confidence - 3 + ((seed >>> 9) % 6))),
    outageReports: Math.max(0, base.outageReports + ((seed >>> 10) % 7) - 3),
    urbanReliability: Math.max(62, Math.min(96, base.urbanReliability + ((seed >>> 11) % 5) - 2)),
    ruralReliability: Math.max(48, Math.min(91, base.ruralReliability + ((seed >>> 12) % 7) - 3)),
    population: Number((0.04 + ((seed >>> 13) % 58) / 100).toFixed(2)),
  };
}

const LOAD_SHEDDING_SLOTS = [
  { label: "12:00 AM–2:00 AM", adjustment: -15, demand: "Overnight low demand" },
  { label: "2:00 AM–4:00 AM", adjustment: -18, demand: "Deep-night low demand" },
  { label: "4:00 AM–6:00 AM", adjustment: -14, demand: "Pre-morning low demand" },
  { label: "6:00 AM–8:00 AM", adjustment: -5, demand: "Morning ramp-up" },
  { label: "8:00 AM–10:00 AM", adjustment: 1, demand: "Business-hour demand" },
  { label: "10:00 AM–12:00 PM", adjustment: 4, demand: "Midday demand" },
  { label: "12:00 PM–2:00 PM", adjustment: 6, demand: "Afternoon demand" },
  { label: "2:00 PM–4:00 PM", adjustment: 8, demand: "Late-afternoon demand" },
  { label: "4:00 PM–6:00 PM", adjustment: 13, demand: "Evening ramp-up" },
  { label: "6:00 PM–8:00 PM", adjustment: 20, demand: "Peak evening demand" },
  { label: "8:00 PM–10:00 PM", adjustment: 15, demand: "High evening demand" },
  { label: "10:00 PM–12:00 AM", adjustment: 3, demand: "Demand easing" },
] as const;

function loadSheddingEstimate(
  profile: ReturnType<typeof districtMetrics>,
  slotIndex: number,
  areaKey: string,
) {
  const safeSlotIndex = Math.max(0, Math.min(LOAD_SHEDDING_SLOTS.length - 1, slotIndex));
  const slot = LOAD_SHEDDING_SLOTS[safeSlotIndex];
  const localityAdjustment = (hashString(areaKey) % 11) - 5;
  const averageReliability = (profile.urbanReliability + profile.ruralReliability) / 2;
  const stressContribution = Math.max(0, (profile.stress - 40) * 0.5);
  const reliabilityPenalty = Math.max(0, (86 - averageReliability) * 0.85);
  const equityContribution = profile.equityGap * 0.35;
  const communityContribution = Math.min(9, profile.outageReports * 0.55);
  const probability = Math.max(
    4,
    Math.min(
      92,
      Math.round(
        10 +
          stressContribution +
          reliabilityPenalty +
          equityContribution +
          communityContribution +
          slot.adjustment +
          localityAdjustment,
      ),
    ),
  );
  const confidence = Math.max(
    58,
    Math.min(86, Math.round(48 + profile.confidence * 0.36 + profile.outageReports * 0.35)),
  );
  const level = probability >= 70
    ? "Very high"
    : probability >= 50
      ? "High"
      : probability >= 27
        ? "Moderate"
        : "Low";
  const tone = probability >= 70 ? "critical" : probability >= 50 ? "high" : probability >= 27 ? "moderate" : "low";
  const factors = [
    slot.demand,
    profile.stress >= 70 ? "Elevated district grid stress" : "District grid-stress baseline",
    profile.outageReports >= 8 ? "Recent community outage signals" : "Limited community outage signals",
  ];
  return { probability, confidence, level, tone, factors, slot };
}

const DISTRICT_ENERGY_WATCHLIST = DISTRICTS.map((district) => {
  const profile = districtMetrics(district.name);
  const eveningRisk = loadSheddingEstimate(profile, 9, district.name);
  const loadFactor = 0.62 + ((hashString(district.name) >>> 10) % 9) / 100;
  const dailyEnergyGWh = Number(((profile.demand * 24 * loadFactor) / 1000).toFixed(1));

  return {
    name: district.name,
    division: district.division,
    stress: profile.stress,
    peakDemandMw: profile.demand,
    dailyEnergyGWh,
    loadSheddingChance: eveningRisk.probability,
    loadSheddingTone: eveningRisk.tone,
    confidence: eveningRisk.confidence,
  };
}).sort((a, b) => b.stress - a.stress || b.loadSheddingChance - a.loadSheddingChance);

function matchDistrict(value: string | undefined) {
  if (!value) return null;
  const normalized = normalizeDistrictName(value);
  const direct = DISTRICTS.find((district) => district.name === normalized);
  if (direct) return direct.name;

  const searchable = value.toLowerCase().replace(/[^a-z]+/g, " ");
  const embedded = DISTRICTS.find((district) => {
    const name = district.name.toLowerCase().replace(/[^a-z]+/g, " ");
    return searchable.includes(name);
  });
  if (embedded) return embedded.name;

  const alias = Object.entries(NAME_ALIASES).find(([legacy]) => searchable.includes(legacy));
  return alias?.[1] ?? null;
}

function buildLiveLocation(result: GeocodeResult, fallbackDistrict: string): LiveLocation {
  const address = result.address ?? {};
  const districtCandidates = [
    address.state_district,
    address.district,
    address.county,
    address.city_district,
    address.municipality,
    result.display_name,
  ];
  const district =
    districtCandidates.map(matchDistrict).find((candidate): candidate is string => Boolean(candidate)) ??
    fallbackDistrict;
  const profile = districtMetrics(district);
  const divisionCandidate = (address.state ?? address.region ?? profile.division)
    .replace(/division/gi, "")
    .trim();
  const division =
    Object.keys(DISTRICTS_BY_DIVISION).find(
      (name) => name.toLowerCase() === divisionCandidate.toLowerCase(),
    ) ?? profile.division;
  const locality =
    address.village ??
    address.hamlet ??
    address.neighbourhood ??
    address.suburb ??
    address.quarter ??
    address.town ??
    address.city ??
    address.municipality ??
    address.county ??
    district;

  return {
    displayName: result.display_name,
    locality,
    district,
    division,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    postcode: address.postcode,
    category: result.type ?? result.category,
  };
}

function formatMetric(value: ReturnType<typeof districtMetrics>, metric: MetricKey) {
  if (metric === "stress") return `${value.stress}/100`;
  if (metric === "equity") return `${value.equityGap} pts`;
  if (metric === "demand") return `${value.demand.toLocaleString()} MW`;
  return `${value.solar} kWh/m²`;
}

function metricColor(value: ReturnType<typeof districtMetrics>, metric: MetricKey) {
  if (metric === "stress") {
    if (value.stress >= 76) return "#f3654a";
    if (value.stress >= 61) return "#f4ae3d";
    return "#36c58c";
  }
  if (metric === "equity") {
    if (value.equityGap >= 20) return "#9168ed";
    if (value.equityGap >= 13) return "#43a6bc";
    return "#47c990";
  }
  if (metric === "demand") {
    if (value.demand >= 800) return "#ef6d4c";
    if (value.demand >= 380) return "#e9b93f";
    return "#59c8a0";
  }
  if (value.solar >= 4.8) return "#f5bd42";
  if (value.solar >= 4.3) return "#7ccf88";
  return "#65aebf";
}

type DistrictMapProperties = {
  shapeName?: string;
  district: string;
  division: string;
  metricColor: string;
  metricLabel: string;
};

function districtMapGeoData(
  metric: MetricKey,
): GeoJSONFeatureCollection<Polygon | MultiPolygon, DistrictMapProperties> {
  return {
    type: "FeatureCollection",
    features: BUNDLED_BANGLADESH_ADM2.features.map((feature, index) => {
      const rawName = feature.properties.shapeName ?? `District ${index + 1}`;
      const district = normalizeDistrictName(rawName);
      const metrics = districtMetrics(district);
      return {
        type: "Feature",
        properties: {
          shapeName: rawName,
          district,
          division: metrics.division,
          metricColor: metricColor(metrics, metric),
          metricLabel: formatMetric(metrics, metric),
        },
        geometry: feature.geometry as unknown as Polygon | MultiPolygon,
      };
    }),
  };
}

function BangladeshMap({
  metric,
  selected,
  onSelect,
}: {
  metric: MetricKey;
  selected: string;
  onSelect: (district: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
  const onSelectRef = useRef(onSelect);
  const metricRef = useRef(metric);
  const selectedRef = useRef(selected);
  const selectedDivision = districtMetrics(selected).division;
  const selectedDivisionRef = useRef(selectedDivision);
  const mapData = useMemo(() => districtMapGeoData(metric), [metric]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  onSelectRef.current = onSelect;
  metricRef.current = metric;
  selectedRef.current = selected;
  selectedDivisionRef.current = selectedDivision;

  useEffect(() => {
    let disposed = false;
    if (!mapContainerRef.current) return;

    void import("maplibre-gl")
      .then(({ Map, NavigationControl, setWorkerUrl }) => {
        if (disposed || !mapContainerRef.current) return;
        setWorkerUrl(maplibreWorkerUrl);
        const initialDivisionFilter = [
          "==",
          ["get", "division"],
          selectedDivisionRef.current,
        ] as FilterSpecification;
        const initialDistrictFilter = [
          "==",
          ["get", "district"],
          selectedRef.current,
        ] as FilterSpecification;
        const map = new Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              "dashboard-esri-imagery": {
                type: "raster",
                tiles: [SATELLITE_TILE_URL],
                tileSize: 256,
                maxzoom: 19,
                attribution: SATELLITE_ATTRIBUTION,
              },
              "dashboard-districts": {
                type: "geojson",
                data: districtMapGeoData(metricRef.current),
              },
              "dashboard-esri-labels": {
                type: "raster",
                tiles: [SATELLITE_LABEL_TILE_URL],
                tileSize: 256,
                maxzoom: 19,
                attribution: "Places and boundaries © Esri",
              },
            },
            layers: [
              {
                id: "dashboard-satellite-imagery",
                type: "raster",
                source: "dashboard-esri-imagery",
              },
              {
                id: "dashboard-district-fill",
                type: "fill",
                source: "dashboard-districts",
                paint: {
                  "fill-color": ["get", "metricColor"],
                  "fill-opacity": 0.2,
                },
              },
              {
                id: "dashboard-district-lines",
                type: "line",
                source: "dashboard-districts",
                paint: {
                  "line-color": "rgba(255,255,255,.78)",
                  "line-width": 1.05,
                },
              },
              {
                id: "dashboard-selected-division-fill",
                type: "fill",
                source: "dashboard-districts",
                filter: initialDivisionFilter,
                paint: {
                  "fill-color": "#f51654",
                  "fill-opacity": 0.36,
                },
              },
              {
                id: "dashboard-selected-division-line",
                type: "line",
                source: "dashboard-districts",
                filter: initialDivisionFilter,
                paint: {
                  "line-color": "#ff5d89",
                  "line-width": 2.2,
                  "line-blur": 0.2,
                },
              },
              {
                id: "dashboard-selected-district-line",
                type: "line",
                source: "dashboard-districts",
                filter: initialDistrictFilter,
                paint: {
                  "line-color": "#ffffff",
                  "line-width": 3.2,
                },
              },
              {
                id: "dashboard-place-labels",
                type: "raster",
                source: "dashboard-esri-labels",
              },
            ],
          },
          center: [90.35, 23.75],
          zoom: 6.15,
          minZoom: 5.2,
          maxZoom: 14,
          maxBounds: [[87.7, 19.9], [93.5, 27.5]],
          attributionControl: true,
          renderWorldCopies: false,
        });
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        map.scrollZoom.disable();
        map.on("load", () => {
          if (disposed) return;
          setMapReady(true);
          const source = map.getSource("dashboard-districts") as GeoJSONSource | undefined;
          source?.setData(districtMapGeoData(metricRef.current));
        });
        map.on("click", "dashboard-district-fill", (event) => {
          const district = event.features?.[0]?.properties?.district;
          if (typeof district === "string") onSelectRef.current(district);
        });
        map.on("mouseenter", "dashboard-district-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "dashboard-district-fill", () => {
          map.getCanvas().style.cursor = "grab";
        });
        mapRef.current = map;
      })
      .catch(() => setMapError("The satellite district map could not start in this browser."));

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateSelection = () => {
      if (!map.getLayer("dashboard-selected-division-fill")) return;
      const divisionFilter = [
        "==",
        ["get", "division"],
        selectedDivision,
      ] as FilterSpecification;
      const districtFilter = [
        "==",
        ["get", "district"],
        selected,
      ] as FilterSpecification;
      map.setFilter("dashboard-selected-division-fill", divisionFilter);
      map.setFilter("dashboard-selected-division-line", divisionFilter);
      map.setFilter("dashboard-selected-district-line", districtFilter);
    };
    if (map.isStyleLoaded()) updateSelection();
    else map.once("load", updateSelection);
    return () => {
      map.off("load", updateSelection);
    };
  }, [selected, selectedDivision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateMetric = () => {
      const source = map.getSource("dashboard-districts") as GeoJSONSource | undefined;
      source?.setData(mapData);
    };
    if (map.isStyleLoaded()) updateMetric();
    else map.once("load", updateMetric);
    return () => {
      map.off("load", updateMetric);
    };
  }, [mapData]);

  return (
    <div className="dashboard-map-shell">
      <div
        ref={mapContainerRef}
        className="dashboard-map"
        role="application"
        aria-label={`Interactive satellite map of Bangladesh showing ${METRIC_META[metric].label}`}
      />
      {!mapReady && !mapError && (
        <div className="dashboard-map-loading" aria-live="polite">
          <span className="live-pulse" />Loading satellite district map…
        </div>
      )}
      {mapError && (
        <div className="dashboard-map-loading dashboard-map-error" role="alert">
          <AlertTriangle size={18} />{mapError}
        </div>
      )}
      <div className="dashboard-map-mode"><Layers3 size={13} />Satellite + district intelligence</div>
    </div>
  );
}

function LoadSheddingChanceCard({
  profile,
  slotIndex,
  onSlotChange,
  areaLabel,
  areaKey,
  compact = false,
}: {
  profile: ReturnType<typeof districtMetrics>;
  slotIndex: number;
  onSlotChange: (slotIndex: number) => void;
  areaLabel: string;
  areaKey: string;
  compact?: boolean;
}) {
  const estimate = loadSheddingEstimate(profile, slotIndex, areaKey);
  return (
    <section className={`loadshedding-card ${estimate.tone} ${compact ? "compact" : ""}`}>
      <div className="loadshedding-card-header">
        <div>
          <span className="loadshedding-icon"><Zap size={17} /></span>
          <div><span>Time-slot outlook</span><strong>Load-shedding chance</strong></div>
        </div>
        <ConfidenceBadge>AI-assisted estimate</ConfidenceBadge>
      </div>

      <label className="loadshedding-slot-picker">
        <span><Clock3 size={14} />Choose a 2-hour time slot</span>
        <select
          value={slotIndex}
          onChange={(event) => onSlotChange(Number(event.target.value))}
          aria-label="Choose a two-hour time slot for load-shedding chance"
        >
          {LOAD_SHEDDING_SLOTS.map((slot, index) => (
            <option key={slot.label} value={index}>{slot.label}</option>
          ))}
        </select>
      </label>

      <div className="loadshedding-result">
        <div
          className="loadshedding-ring"
          style={{ "--chance": `${estimate.probability * 3.6}deg` } as React.CSSProperties}
          aria-label={`${estimate.probability} percent modelled load-shedding chance`}
        >
          <div><strong>{estimate.probability}%</strong><span>chance</span></div>
        </div>
        <div className="loadshedding-summary">
          <span className="loadshedding-level">{estimate.level} chance</span>
          <h3>{areaLabel}</h3>
          <p>{estimate.slot.label} · {estimate.slot.demand}</p>
          <div className="loadshedding-confidence">
            <span>Model confidence</span><strong>{estimate.confidence}%</strong>
            <div><span style={{ width: `${estimate.confidence}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="loadshedding-factors" aria-label="Main factors behind this estimate">
        {estimate.factors.map((factor) => <span key={factor}>{factor}</span>)}
      </div>
      <p className="loadshedding-disclaimer">
        <Info size={13} />Prototype probability score—not an official feeder outage schedule. It combines district indicators, the selected time slot and a locality proxy.
      </p>
    </section>
  );
}

function AreaProfileModal({
  profile,
  slotIndex,
  onSlotChange,
  onClose,
}: {
  profile: ReturnType<typeof districtMetrics>;
  slotIndex: number;
  onSlotChange: (slotIndex: number) => void;
  onClose: () => void;
}) {
  const seed = hashString(profile.name);
  const factorRows = [
    { label: "District grid stress", value: profile.stress, note: `${profile.stress}/100` },
    { label: "Rural reliability pressure", value: 100 - profile.ruralReliability, note: `${profile.ruralReliability}% reliability` },
    { label: "Energy-equity gap", value: Math.min(100, profile.equityGap * 3.6), note: `${profile.equityGap} points` },
    { label: "Community outage signals", value: Math.min(100, profile.outageReports * 5.5), note: `${profile.outageReports} reports` },
  ];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="area-profile-modal" role="dialog" aria-modal="true" aria-labelledby="area-profile-title">
      <button className="modal-scrim" onClick={onClose} aria-label="Close full area profile" />
      <section className="area-profile-dialog">
        <header className="area-profile-dialog-header">
          <div>
            <span>Complete district intelligence</span>
            <h2 id="area-profile-title">{profile.name} Area Profile</h2>
            <p>{profile.division} Division · modelled population {profile.population}M</p>
          </div>
          <div>
            <ConfidenceBadge>AI-assisted district profile</ConfidenceBadge>
            <button className="icon-button" onClick={onClose} aria-label="Close full area profile"><X size={20} /></button>
          </div>
        </header>

        <div className="area-profile-dialog-body">
          <section className="area-profile-stat-grid">
            <article><Gauge size={18} /><span>Grid stress</span><strong>{profile.stress}<small>/100</small></strong></article>
            <article><Zap size={18} /><span>Demand estimate</span><strong>{profile.demand.toLocaleString()}<small> MW</small></strong></article>
            <article><Sun size={18} /><span>Solar potential</span><strong>{profile.solar}<small> kWh/m²/day</small></strong></article>
            <article><Radio size={18} /><span>Community signals</span><strong>{profile.outageReports}<small> reports</small></strong></article>
          </section>

          <div className="area-profile-detail-grid">
            <LoadSheddingChanceCard
              profile={profile}
              slotIndex={slotIndex}
              onSlotChange={onSlotChange}
              areaLabel={profile.scope === "locality" ? profile.name : `${profile.name} District`}
              areaKey={profile.areaKey}
            />

            <section className="area-reliability-card">
              <div className="area-reliability-heading">
                <div><span>Reliability and equity</span><h3>Urban–rural comparison</h3></div>
                <Building2 size={20} />
              </div>
              <div className="reliability-row">
                <div><span>Urban reliability</span><strong>{profile.urbanReliability}%</strong></div>
                <div><span style={{ width: `${profile.urbanReliability}%` }} /></div>
              </div>
              <div className="reliability-row rural">
                <div><span>Rural reliability</span><strong>{profile.ruralReliability}%</strong></div>
                <div><span style={{ width: `${profile.ruralReliability}%` }} /></div>
              </div>
              <div className="area-equity-summary">
                <Wheat size={18} />
                <div><span>Estimated reliability gap</span><strong>{profile.equityGap} percentage points</strong></div>
              </div>
              <div className="profile-settlement-summary">
                <div><span>Urban {profile.urban}%</span><span>Town {profile.semiDense}%</span><span>Rural {profile.rural}%</span></div>
                <div className="settlement-bar">
                  <span className="urban-bar" style={{ width: `${profile.urban}%` }} />
                  <span className="semi-bar" style={{ width: `${profile.semiDense}%` }} />
                  <span className="rural-bar" style={{ width: `${profile.rural}%` }} />
                </div>
              </div>
            </section>
          </div>

          <section className="area-profile-explanation">
            <div className="area-profile-explanation-copy">
              <span><BrainCircuit size={17} />Explainable model summary</span>
              <h3>Why is {profile.name} receiving this risk profile?</h3>
              <p>
                Estimated evening demand rises {9 + (seed % 8)}%, while the simulated supply margin falls below {5 + (seed % 4)}% near {profile.peakHour}. The bars show the relative strength of the prototype model inputs.
              </p>
            </div>
            <div className="area-profile-factor-list">
              {factorRows.map((factor) => (
                <article key={factor.label}>
                  <div><span>{factor.label}</span><strong>{factor.note}</strong></div>
                  <div><span style={{ width: `${factor.value}%` }} /></div>
                </article>
              ))}
            </div>
          </section>

          <div className="area-profile-guardrail">
            <ShieldCheck size={18} />
            <p><strong>Decision-support guardrail:</strong> district demand, stress and load-shedding probability are prototype estimates until utility-grade feeder measurements and labelled outage history are connected.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function LiveMapExplorer({
  selectedDistrict,
  loadSlotIndex,
  onLoadSlotChange,
  onAreaSelect,
  onClose,
}: {
  selectedDistrict: string;
  loadSlotIndex: number;
  onLoadSlotChange: (slotIndex: number) => void;
  onAreaSelect: (location: LiveLocation) => void;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
  const markerRef = useRef<MapLibreMarkerType | null>(null);
  const placeMarkerRef = useRef<((longitude: number, latitude: number) => void) | null>(null);
  const requestCacheRef = useRef(new Map<string, unknown>());
  const lastRequestAtRef = useRef(0);
  const autocompleteRequestRef = useRef(0);
  const suppressAutocompleteRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const liveProfile = location ? localityMetrics(location) : districtMetrics(selectedDistrict);

  async function rateLimitedRequest<T>(url: string, cacheKey: string): Promise<T> {
    const cached = requestCacheRef.current.get(cacheKey);
    if (cached) return cached as T;

    const elapsed = Date.now() - lastRequestAtRef.current;
    if (elapsed < 1100) {
      await new Promise((resolve) => window.setTimeout(resolve, 1100 - elapsed));
    }
    lastRequestAtRef.current = Date.now();
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en,bn;q=0.8",
      },
    });
    if (!response.ok) throw new Error("Place service is temporarily unavailable.");
    const data = (await response.json()) as T;
    requestCacheRef.current.set(cacheKey, data);
    return data;
  }

  async function resolveCoordinates(latitude: number, longitude: number) {
    setLocationLoading(true);
    setSearchError("");
    const roundedLatitude = latitude.toFixed(5);
    const roundedLongitude = longitude.toFixed(5);
    try {
      const result = await rateLimitedRequest<GeocodeResult>(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLatitude}&lon=${roundedLongitude}&zoom=18&addressdetails=1&accept-language=en%2Cbn`,
        `reverse:${roundedLatitude}:${roundedLongitude}`,
      );
      if (result.address?.country_code && result.address.country_code.toLowerCase() !== "bd") {
        setSearchError("That point is outside Bangladesh. Choose a location inside the national boundary.");
        return false;
      }
      const nextLocation = buildLiveLocation(result, selectedDistrict);
      setLocation(nextLocation);
      return true;
    } catch {
      const fallback = districtMetrics(selectedDistrict);
      setLocation({
        displayName: `Selected point at ${roundedLatitude}, ${roundedLongitude}`,
        locality: "Location name unavailable",
        district: fallback.name,
        division: fallback.division,
        latitude,
        longitude,
      });
      setSearchError("The point was selected, but its place name could not be loaded.");
      return true;
    } finally {
      setLocationLoading(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    if (!mapContainerRef.current) return;

    void import("maplibre-gl")
      .then(({ Map, Marker, NavigationControl, ScaleControl, setWorkerUrl }) => {
        if (disposed || !mapContainerRef.current) return;
        setWorkerUrl(maplibreWorkerUrl);
        const map = new Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              "esri-world-imagery": {
                type: "raster",
                tiles: [SATELLITE_TILE_URL],
                tileSize: 256,
                maxzoom: 19,
                attribution: SATELLITE_ATTRIBUTION,
              },
              "esri-place-labels": {
                type: "raster",
                tiles: [SATELLITE_LABEL_TILE_URL],
                tileSize: 256,
                maxzoom: 19,
                attribution: "Places and boundaries © Esri",
              },
            },
            layers: [
              {
                id: "satellite-imagery",
                type: "raster",
                source: "esri-world-imagery",
                minzoom: 0,
                maxzoom: 19,
              },
              {
                id: "satellite-place-labels",
                type: "raster",
                source: "esri-place-labels",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [90.35, 23.75],
          zoom: 6.15,
          minZoom: 5.2,
          maxZoom: 18,
          maxBounds: [[87.7, 19.9], [93.5, 27.5]],
          attributionControl: true,
        });
        map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
        map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
        map.on("load", () => setMapReady(true));
        map.on("error", () => {
          if (!map.loaded()) setMapError("The live basemap could not finish loading.");
        });
        placeMarkerRef.current = (longitude, latitude) => {
          if (markerRef.current) {
            markerRef.current.setLngLat([longitude, latitude]);
          } else {
            markerRef.current = new Marker({ color: "#ff1f5a", scale: 1.08 })
              .setLngLat([longitude, latitude])
              .addTo(map);
          }
        };
        map.on("click", ({ lngLat }) => {
          placeMarkerRef.current?.(lngLat.lng, lngLat.lat);
          void resolveCoordinates(lngLat.lat, lngLat.lng);
        });
        mapRef.current = map;
      })
      .catch(() => setMapError("Your browser could not start the interactive map."));

    return () => {
      disposed = true;
      placeMarkerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const performPlaceSearch = async (cleanedQuery: string, requestId: number) => {
    setSearching(true);
    setSearchError("");
    try {
      const found = await rateLimitedRequest<GeocodeResult[]>(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=bd&limit=6&addressdetails=1&q=${encodeURIComponent(cleanedQuery)}`,
        `search:${cleanedQuery.toLowerCase()}`,
      );
      if (requestId !== autocompleteRequestRef.current) return;
      setResults(found);
      if (!found.length) setSearchError("No place matched inside Bangladesh. Try an upazila, village or landmark name.");
    } catch {
      if (requestId !== autocompleteRequestRef.current) return;
      setSearchError("Place search is temporarily unavailable. You can still click directly on the map.");
    } finally {
      if (requestId === autocompleteRequestRef.current) setSearching(false);
    }
  };

  useEffect(() => {
    const cleanedQuery = query.trim();
    const requestId = ++autocompleteRequestRef.current;

    if (suppressAutocompleteRef.current) {
      suppressAutocompleteRef.current = false;
      setSearching(false);
      return;
    }

    if (cleanedQuery.length < 2) {
      setResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    setResults([]);
    setSearchError("");
    const timeoutId = window.setTimeout(() => {
      void performPlaceSearch(cleanedQuery, requestId);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const searchPlace = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedQuery = query.trim();
    if (cleanedQuery.length < 2) {
      setSearchError("Write at least two letters to search.");
      return;
    }
    const requestId = ++autocompleteRequestRef.current;
    void performPlaceSearch(cleanedQuery, requestId);
  };

  const chooseSearchResult = (result: GeocodeResult) => {
    const nextLocation = buildLiveLocation(result, selectedDistrict);
    setLocation(nextLocation);
    setResults([]);
    suppressAutocompleteRef.current = true;
    setQuery(nextLocation.locality);
    placeMarkerRef.current?.(nextLocation.longitude, nextLocation.latitude);
    mapRef.current?.flyTo({
      center: [nextLocation.longitude, nextLocation.latitude],
      zoom: result.type === "village" || result.type === "neighbourhood" ? 13.5 : 11.5,
      duration: 1200,
    });
  };

  const resetBangladesh = () => {
    setResults([]);
    mapRef.current?.fitBounds([[88.0, 20.4], [92.9, 26.7]], { padding: 40, duration: 1000 });
  };

  const goToLiveLocation = () => {
    setResults([]);
    setSearchError("");

    if (!("geolocation" in navigator)) {
      setSearchError("Live location is not supported by this browser. Search or click on the map instead.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        void resolveCoordinates(latitude, longitude)
          .then((isInsideBangladesh) => {
            if (!isInsideBangladesh) return;
            placeMarkerRef.current?.(longitude, latitude);
            mapRef.current?.flyTo({
              center: [longitude, latitude],
              zoom: accuracy > 1500 ? 11 : 14.5,
              duration: 1400,
            });
          })
          .finally(() => setLocatingUser(false));
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access in your browser and try again."
          : error.code === error.TIMEOUT
            ? "Your live location took too long to respond. Please try again."
            : "Your live location is unavailable right now. Search or click on the map instead.";
        setSearchError(message);
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  return (
    <div className="live-map-modal" role="dialog" aria-modal="true" aria-label="GridPulse BD live Bangladesh map explorer">
      <header className="live-map-header">
        <div className="live-map-brand">
          <AppLogo />
          <div><strong>GridPulse BD</strong><span>Satellite area explorer</span></div>
        </div>
        <form className="live-place-search" onSubmit={searchPlace}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search village, upazila, road or landmark…"
            aria-label="Search any place in Bangladesh"
            aria-autocomplete="list"
            aria-controls="live-place-suggestions"
          />
          <button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
          {results.length > 0 && (
            <div className="live-search-results" id="live-place-suggestions" role="listbox">
              {results.map((result) => {
                const preview = buildLiveLocation(result, selectedDistrict);
                return (
                  <button key={result.place_id} type="button" role="option" aria-selected="false" onClick={() => chooseSearchResult(result)}>
                    <MapPinned size={16} />
                    <span><strong>{preview.locality}</strong><small>{result.display_name}</small></span>
                    <ArrowRight size={14} />
                  </button>
                );
              })}
            </div>
          )}
        </form>
        <button className="live-map-close" onClick={onClose} aria-label="Close live map"><X size={21} /></button>
      </header>

      <div className="live-map-body">
        <div className="live-map-canvas-wrap">
          <div ref={mapContainerRef} className="live-map-canvas" />
          {!mapReady && !mapError && <div className="live-map-loading"><span className="live-pulse" />Loading Bangladesh live map…</div>}
          {mapError && <div className="live-map-error"><AlertTriangle size={20} /><span>{mapError}</span></div>}
          <div className="click-map-hint"><LocateFixed size={16} /><span><strong>Click anywhere</strong> to inspect that exact area</span></div>
          <div className="map-quick-actions">
            <button
              className={`live-location-button${locatingUser ? " is-locating" : ""}`}
              onClick={goToLiveLocation}
              disabled={!mapReady || locatingUser}
              aria-label="Go to my live location"
            >
              <LocateFixed size={15} />{locatingUser ? "Locating…" : "Live location"}
            </button>
            <button className="reset-map-button" onClick={resetBangladesh}><MapPinned size={15} />Full Bangladesh</button>
          </div>
        </div>

        <aside className="live-detail-panel" aria-live="polite">
          <div className="live-detail-kicker"><span className="status-dot" />Selected place intelligence</div>
          {searchError && <div className="geocode-warning"><Info size={15} />{searchError}</div>}
          {locationLoading ? (
            <div className="location-loading"><span /><span /><span /><p>Finding area and district…</p></div>
          ) : location ? (
            <>
              <div className="selected-place-title">
                <div className="selected-pin"><MapPinned size={22} /></div>
                <div><span>{location.category ?? "Selected place"}</span><h2>{location.locality}</h2><p>{location.displayName}</p></div>
              </div>
              <div className="place-facts">
                <article><span>District</span><strong>{location.district}</strong></article>
                <article><span>Division</span><strong>{location.division}</strong></article>
                <article><span>Coordinates</span><strong>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</strong></article>
                <article><span>Postcode</span><strong>{location.postcode ?? "Not available"}</strong></article>
              </div>
              <div className="live-energy-heading"><div><Sparkles size={16} /><strong>{location.locality} energy intelligence</strong></div><ConfidenceBadge>Area model estimate</ConfidenceBadge></div>
              <div className="live-energy-grid">
                <article><Gauge size={18} /><span>Grid stress</span><strong>{liveProfile.stress}<small>/100</small></strong></article>
                <article><Zap size={18} /><span>Demand</span><strong>{liveProfile.demand.toLocaleString()}<small> MW</small></strong></article>
                <article><Sun size={18} /><span>Solar potential</span><strong>{liveProfile.solar}<small> kWh/m²</small></strong></article>
                <article><Building2 size={18} /><span>Settlement</span><strong>{liveProfile.urban >= 55 ? "Urban-led" : liveProfile.rural >= 55 ? "Rural-led" : "Mixed"}</strong></article>
              </div>
              <LoadSheddingChanceCard
                profile={liveProfile}
                slotIndex={loadSlotIndex}
                onSlotChange={onLoadSlotChange}
                areaLabel={location.locality}
                areaKey={`${location.district}:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`}
                compact
              />
              <div className="live-settlement-card">
                <div><span>Urban {liveProfile.urban}%</span><span>Town {liveProfile.semiDense}%</span><span>Rural {liveProfile.rural}%</span></div>
                <div className="settlement-bar">
                  <span className="urban-bar" style={{ width: `${liveProfile.urban}%` }} />
                  <span className="semi-bar" style={{ width: `${liveProfile.semiDense}%` }} />
                  <span className="rural-bar" style={{ width: `${liveProfile.rural}%` }} />
                </div>
              </div>
              <button
                className="use-area-button"
                onClick={() => {
                  onAreaSelect(location);
                  onClose();
                }}
              >
                <CheckCircle2 size={16} />Use {location.locality} in dashboard
              </button>
            </>
          ) : (
            <div className="empty-live-selection">
              <div><LocateFixed size={28} /></div>
              <h2>Select any place in Bangladesh</h2>
              <p>Search by name or click a precise point on the map. GridPulse BD will identify its locality, district and show the area's modelled energy profile.</p>
              <ul><li><Search size={14} />Search a village, upazila or landmark</li><li><MapPinned size={14} />Click any road, town or rural location</li><li><Clock3 size={14} />Choose a 2-hour load-shedding outlook</li><li><Sparkles size={14} />View energy details with confidence labels</li></ul>
            </div>
          )}
          <footer className="live-map-attribution">
            <span>
              Satellite imagery, place labels and boundaries: <a href="https://www.esri.com/en-us/legal/terms/full-master-agreement" target="_blank" rel="noreferrer">© Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community
            </span>
            <span>Place search: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · Nominatim</span>
            <span>Energy indicators: GridPulse BD prototype estimates</span>
            <span>Suggestions appear after a short typing pause; place requests are limited to one per second. Map clicks also support reverse lookup. <a href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noreferrer">Usage policy</a></span>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function ConfidenceBadge({ children = "AI-assisted estimate" }: { children?: string }) {
  return (
    <span className="confidence-badge">
      <Sparkles size={12} aria-hidden="true" />
      {children}
    </span>
  );
}

function MiniTrend({ values }: { values: number[] }) {
  const width = 180;
  const height = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / Math.max(1, max - min)) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="mini-trend" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function AppLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg className="brand-pulse-icon" viewBox="0 0 40 40">
        <circle className="logo-ring" cx="20" cy="20" r="14.5" />
        <path className="logo-pulse" d="M6.5 21h7l3.2-9.5 6.1 19 3.3-9.5h7.4" />
        <circle className="logo-node" cx="33.5" cy="21" r="2" />
      </svg>
      <span className="brand-glint" />
    </div>
  );
}

function ViewHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-heading view-heading">
      <div>
        <div className="eyebrow"><span className="live-pulse" />{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function DemandLineChart({
  values,
  comparison,
  unit = "GW",
  forecastStart,
}: {
  values: number[];
  comparison?: number[];
  unit?: string;
  forecastStart?: number;
}) {
  const width = 760;
  const height = 278;
  const paddingX = 32;
  const paddingTop = 24;
  const paddingBottom = 31;
  const allValues = comparison ? [...values, ...comparison] : values;
  const minimum = Math.min(...allValues) * 0.9;
  const maximum = Math.max(...allValues) * 1.06;
  const x = (index: number) =>
    paddingX + (index / Math.max(1, values.length - 1)) * (width - paddingX * 2);
  const y = (value: number) =>
    paddingTop +
    ((maximum - value) / Math.max(0.1, maximum - minimum)) *
      (height - paddingTop - paddingBottom);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const comparisonPoints = comparison
    ?.map((value, index) => `${x(index)},${y(value)}`)
    .join(" ");
  const areaPath = `M${x(0)},${height - paddingBottom} L${points.replaceAll(" ", " L")} L${x(values.length - 1)},${height - paddingBottom} Z`;
  const peakIndex = values.indexOf(Math.max(...values));
  const lowIndex = values.indexOf(Math.min(...values));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const [activeIndex, setActiveIndex] = useState(peakIndex);
  const gradientId = `demand-area-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const lineGradientId = `demand-line-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const confidenceGradientId = `demand-confidence-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const glowId = `demand-glow-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const baselineGradientId = `demand-baseline-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const baselineGlowId = `demand-baseline-glow-${unit.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const eveningStart = Math.min(values.length - 1, 18);
  const eveningEnd = Math.min(values.length - 1, 21);
  const activeValue = values[activeIndex] ?? values[peakIndex];
  const activeComparison = comparison?.[activeIndex];
  const tooltipWidth = 116;
  const tooltipX = Math.min(width - paddingX - tooltipWidth, Math.max(paddingX, x(activeIndex) - tooltipWidth / 2));
  const tooltipY = Math.max(paddingTop + 8, y(activeValue) - 58);
  const confidenceBandPath = typeof forecastStart === "number"
    ? (() => {
        const start = Math.max(0, Math.min(values.length - 1, forecastStart));
        const indices = values.map((_, index) => index).slice(start);
        const upper = indices.map((index) => `${x(index)},${y(values[index] * 1.025)}`).join(" L");
        const lower = [...indices].reverse().map((index) => `${x(index)},${y(values[index] * 0.975)}`).join(" L");
        return `M${upper} L${lower} Z`;
      })()
    : "";

  useEffect(() => {
    setActiveIndex(peakIndex);
  }, [peakIndex]);

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * width;
    const nextIndex = Math.round(
      ((pointerX - paddingX) / (width - paddingX * 2)) * Math.max(1, values.length - 1),
    );
    setActiveIndex(Math.max(0, Math.min(values.length - 1, nextIndex)));
  };

  return (
    <div className="line-chart-wrap">
      <div className="demand-chart-metrics">
        <article>
          <span>Daily average</span>
          <strong>{average.toFixed(unit === "MW" ? 0 : 1)} <small>{unit}</small></strong>
        </article>
        <article className="peak-metric">
          <span>Forecast peak</span>
          <strong>{values[peakIndex].toFixed(unit === "MW" ? 0 : 1)} <small>{unit}</small></strong>
          <em>{formatClock12(peakIndex)}</em>
        </article>
        <article>
          <span>Daily swing</span>
          <strong>{(values[peakIndex] - values[lowIndex]).toFixed(unit === "MW" ? 0 : 1)} <small>{unit}</small></strong>
          <em>low at {formatClock12(lowIndex)}</em>
        </article>
      </div>
      <div className="line-chart-stage">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="line-chart"
        role="img"
        aria-label={`Interactive hourly energy demand chart in ${unit}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIndex(peakIndex)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2d62" stopOpacity=".34" />
            <stop offset="52%" stopColor="#b52568" stopOpacity=".14" />
            <stop offset="100%" stopColor="#4cc49a" stopOpacity=".015" />
          </linearGradient>
          <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#37b88c" />
            <stop offset="55%" stopColor="#5bd0a6" />
            <stop offset="100%" stopColor="#ff496f" />
          </linearGradient>
          <linearGradient id={confidenceGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8e74df" stopOpacity=".08" />
            <stop offset="55%" stopColor="#b0488a" stopOpacity=".17" />
            <stop offset="100%" stopColor="#ff496f" stopOpacity=".2" />
          </linearGradient>
          <linearGradient id={baselineGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9f91ba" />
            <stop offset="48%" stopColor="#d8b9df" />
            <stop offset="100%" stopColor="#ef789f" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={baselineGlowId} x="-20%" y="-35%" width="140%" height="170%">
            <feGaussianBlur stdDeviation="2.1" result="baselineBlur" />
            <feMerge><feMergeNode in="baselineBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect
          x={x(eveningStart)}
          y={paddingTop}
          width={Math.max(1, x(eveningEnd) - x(eveningStart))}
          height={height - paddingTop - paddingBottom}
          rx="8"
          className="evening-risk-band"
        />
        <text x={x(eveningStart) + 8} y={paddingTop + 13} className="evening-risk-label">EVENING PEAK WINDOW</text>
        {[0, 1, 2, 3, 4].map((line) => {
          const lineY = paddingTop + (line / 4) * (height - paddingTop - paddingBottom);
          const value = maximum - (line / 4) * (maximum - minimum);
          return (
            <g key={line}>
              <line x1={paddingX} x2={width - paddingX} y1={lineY} y2={lineY} className="chart-gridline" />
              <text x={paddingX} y={lineY - 5} className="chart-y-label">{value.toFixed(unit === "MW" ? 0 : 1)} {unit}</text>
            </g>
          );
        })}
        {typeof forecastStart === "number" && (
          <g>
            <rect
              x={x(forecastStart)}
              y={paddingTop}
              width={width - paddingX - x(forecastStart)}
              height={height - paddingTop - paddingBottom}
              fill="#8b70df"
              opacity=".055"
            />
            <line x1={x(forecastStart)} x2={x(forecastStart)} y1={paddingTop} y2={height - paddingBottom} stroke="#8b70df" strokeDasharray="4 5" />
            <text x={x(forecastStart) + 7} y={paddingTop + 13} className="forecast-label">AI forecast</text>
          </g>
        )}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        {confidenceBandPath && <path d={confidenceBandPath} fill={`url(#${confidenceGradientId})`} className="forecast-confidence-band" />}
        {comparisonPoints && (
          <g className="chart-baseline-series" aria-hidden="true">
            <polyline points={comparisonPoints} className="chart-baseline-glow" />
            <polyline
              points={comparisonPoints}
              className="chart-baseline-line"
              stroke={`url(#${baselineGradientId})`}
              filter={`url(#${baselineGlowId})`}
            />
          </g>
        )}
        <polyline
          points={points}
          fill="none"
          stroke={`url(#${lineGradientId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        {values.map((value, index) => index % 3 === 0 ? (
          <circle key={index} cx={x(index)} cy={y(value)} r="2.1" className="chart-sample-point" />
        ) : null)}
        <line x1={x(activeIndex)} x2={x(activeIndex)} y1={paddingTop} y2={height - paddingBottom} className="chart-crosshair" />
        <circle cx={x(activeIndex)} cy={y(activeValue)} r="8" className="chart-active-halo" />
        <circle cx={x(activeIndex)} cy={y(activeValue)} r="4.6" className="chart-active-point" />
        <g className="chart-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
          <rect width={tooltipWidth} height={42} rx="9" />
          <text x="10" y="15" className="chart-tooltip-time">{formatClock12(activeIndex)}</text>
          <text x="10" y="31" className="chart-tooltip-value">
            {activeValue.toFixed(unit === "MW" ? 0 : 1)} {unit}
          </text>
          {typeof activeComparison === "number" && (
            <text x={tooltipWidth - 9} y="31" textAnchor="end" className="chart-tooltip-compare">
              base {activeComparison.toFixed(0)}
            </text>
          )}
        </g>
      </svg>
      </div>
      <div className="chart-x-labels">
        {values.map((_, index) =>
          index % Math.max(1, Math.floor(values.length / 6)) === 0 ? (
            <span key={index} style={{ left: `${4.2 + (index / (values.length - 1)) * 91.6}%` }}>
              {formatClock12(index)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function OverviewView({
  onOpenMap,
  onSelectDistrict,
}: {
  onOpenMap: () => void;
  onSelectDistrict: (district: string) => void;
}) {
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [watchlistDivision, setWatchlistDivision] = useState("All divisions");
  const filteredDistricts = useMemo(() => {
    const query = watchlistQuery.trim().toLowerCase();
    return DISTRICT_ENERGY_WATCHLIST.filter((district) => {
      const matchesQuery = !query || `${district.name} ${district.division}`.toLowerCase().includes(query);
      const matchesDivision = watchlistDivision === "All divisions" || district.division === watchlistDivision;
      return matchesQuery && matchesDivision;
    });
  }, [watchlistDivision, watchlistQuery]);

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="National model snapshot"
        title="Bangladesh's power pulse, in one clear view."
        description="Track the system-level balance, identify stressed grid zones and move from national signals to district-level action. All figures on this prototype are labelled by source status."
        action={
          <button className="primary-action" onClick={onOpenMap}>
            <MapPinned size={17} /> Open district map
          </button>
        }
      />

      <section className="overview-stat-grid">
        <article><div className="stat-icon mint"><Activity size={20} /></div><span>Modelled demand</span><strong>16.2 <small>GW</small></strong><em><TrendingUp size={13} /> 6.8% above 24h average</em></article>
        <article><div className="stat-icon blue"><Zap size={20} /></div><span>Available supply</span><strong>15.4 <small>GW</small></strong><em className="warn"><TrendingDown size={13} /> 0.8 GW simulated gap</em></article>
        <article><div className="stat-icon coral"><AlertTriangle size={20} /></div><span>High-stress zones</span><strong>3 <small>/ 9</small></strong><em className="warn"><Clock3 size={13} /> evening risk window</em></article>
        <article><div className="stat-icon amber"><Sun size={20} /></div><span>Solar opportunity</span><strong>4.6 <small>kWh/m²</small></strong><em><CloudSun size={13} /> national daily proxy</em></article>
      </section>

      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="section-title-row">
            <div><span>24-hour profile</span><h2>National demand curve</h2><p>Demonstration series shaped like a typical evening-peak day</p></div>
            <div className="chart-legend"><span><i className="legend-mint" /> Model demand</span><ConfidenceBadge /></div>
          </div>
          <DemandLineChart values={SYSTEM_DEMAND} />
        </section>

        <section className="panel model-window-panel">
          <div className="section-title-row compact">
            <div><span>Prediction data window</span><h2>How much history powers this demo?</h2><p>Time-based validation is shown separately from the forecast period.</p></div>
            <span className="model-badge"><BrainCircuit size={13} /> XGBoost demo</span>
          </div>
          <div className="model-window-grid">
            <article><span>Configured history</span><strong>{MODEL_WINDOW.history}</strong><small>{MODEL_WINDOW.equivalent}</small></article>
            <article><span>Hourly observations</span><strong>{MODEL_WINDOW.samples}</strong><small>national reference series</small></article>
            <article><span>Training / validation</span><strong>{MODEL_WINDOW.training}</strong><small>+ {MODEL_WINDOW.validation} holdout</small></article>
            <article><span>Prediction horizon</span><strong>{MODEL_WINDOW.horizon}</strong><small>cut-off {MODEL_WINDOW.cutoff}</small></article>
          </div>
          <div className="model-window-note"><Info size={15} /><p><strong>Prototype configuration:</strong> national load history, weather and calendar features inform the forecast. District electricity use is spatially allocated with population, urbanisation and night-light proxies—not read from district utility meters.</p></div>
        </section>
      </div>

      <section className="panel district-watchlist-panel">
        <div className="section-title-row district-watchlist-title">
          <div><span>64-district energy watchlist</span><h2>Highest estimated stress first</h2><p>Daily electricity use, peak demand and {MODEL_WINDOW.riskWindow} load-shedding probability</p></div>
          <span className="model-badge"><BrainCircuit size={13} /> AI-assisted spatial estimate</span>
        </div>

        <div className="district-watchlist-controls">
          <label>
            <Search size={15} />
            <input
              value={watchlistQuery}
              onChange={(event) => setWatchlistQuery(event.target.value)}
              placeholder="Search district or division"
              aria-label="Search district watchlist"
            />
          </label>
          <label>
            <Layers3 size={15} />
            <select
              value={watchlistDivision}
              onChange={(event) => setWatchlistDivision(event.target.value)}
              aria-label="Filter watchlist by division"
            >
              <option>All divisions</option>
              {Object.keys(DISTRICTS_BY_DIVISION).map((division) => <option key={division}>{division}</option>)}
            </select>
          </label>
          <span>{filteredDistricts.length} of {DISTRICTS.length} districts</span>
        </div>

        <div className="district-watchlist-scroll">
          <div className="district-watchlist-head" aria-hidden="true">
            <span>#</span><span>District</span><span>Electricity use</span><span>Peak demand</span><span>Load-shedding chance</span><span>Stress</span>
          </div>
          <div className="district-watchlist-rows">
            {filteredDistricts.map((district) => {
              const nationalRank = DISTRICT_ENERGY_WATCHLIST.findIndex((item) => item.name === district.name) + 1;
              return (
                <button key={district.name} type="button" onClick={() => onSelectDistrict(district.name)}>
                  <span className="district-rank">{nationalRank}</span>
                  <span className="district-identity"><strong>{district.name}</strong><small>{district.division} Division</small></span>
                  <span className="district-energy"><strong>{district.dailyEnergyGWh} GWh</strong><small>modelled per day</small></span>
                  <span className="district-demand"><strong>{district.peakDemandMw.toLocaleString()} MW</strong><small>spatial peak estimate</small></span>
                  <span className={`district-outage ${district.loadSheddingTone}`}><strong>{district.loadSheddingChance}%</strong><small>{MODEL_WINDOW.riskWindow} · {district.confidence}% confidence</small></span>
                  <span className="district-stress"><strong>{district.stress}/100</strong><i><span style={{ width: `${district.stress}%` }} /></i></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="district-watchlist-footer">
          <Info size={15} />
          <p><strong>Transparent estimate:</strong> the 64 district values are calibrated to the 16.2 GW national demonstration reference. The percentage is a modelled chance for the stated time window, not an official historical outage rate or feeder schedule.</p>
        </div>
      </section>

      <section className="opportunity-grid">
        <article className="opportunity-card">
          <div className="opportunity-icon purple"><UsersRound size={21} /></div>
          <div><span>Equity signal</span><h3>Rural reliability gap deserves attention</h3><p>Compare reliability and outage exposure without labelling an entire district as only rural or urban.</p></div>
        </article>
        <article className="opportunity-card">
          <div className="opportunity-icon green"><BatteryCharging size={21} /></div>
          <div><span>Planning signal</span><h3>Peak shaving can reduce evening stress</h3><p>Test solar, batteries, efficiency and flexible loads in the scenario simulator.</p></div>
        </article>
        <article className="opportunity-card">
          <div className="opportunity-icon blue"><Radio size={21} /></div>
          <div><span>Community signal</span><h3>Reports reveal local blind spots</h3><p>Cluster citizen reports as a separate evidence layer—not as official outage data.</p></div>
        </article>
      </section>
    </div>
  );
}

function EquityView({
  profile,
  onChooseArea,
}: {
  profile: ReturnType<typeof districtMetrics>;
  onChooseArea: () => void;
}) {
  const ruralDemand = Number((1.05 + (hashString(profile.name) % 31) / 100).toFixed(2));
  const urbanDemand = Number((1.82 + (hashString(profile.division) % 42) / 100).toFixed(2));
  const ruralOutage = 4.1 + (hashString(profile.name) % 25) / 10;
  const urbanOutage = Math.max(1.4, ruralOutage - profile.equityGap / 8);
  const comparison = [
    { label: "Reliability index", rural: profile.ruralReliability, urban: profile.urbanReliability, max: 100, unit: "%", better: "urban" },
    { label: "Demand / person", rural: ruralDemand, urban: urbanDemand, max: 3, unit: " kWh/day", better: "context" },
    { label: "Reported outage exposure", rural: Number(ruralOutage.toFixed(1)), urban: Number(urbanOutage.toFixed(1)), max: 8, unit: " hr/month", better: "urban" },
    { label: "Solar suitability", rural: Math.min(94, 66 + profile.rural / 3), urban: Math.min(90, 58 + profile.urban / 3), max: 100, unit: "/100", better: "rural" },
  ];

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="Energy equity analyzer"
        title={`How different are rural and urban energy realities in ${profile.name}?`}
        description="The district is not reduced to a single label. GridPulse BD separates urban centres, towns / semi-dense areas and rural settlements, then compares their estimated reliability and solution fit."
        action={
          <button className="district-selector" onClick={onChooseArea}>
            <MapPinned size={17} />
            <span><span>Compare area</span><strong>{profile.name}</strong></span>
            <ChevronDown size={17} />
          </button>
        }
      />

      <section className="equity-hero-grid">
        <article className="panel equity-score-card">
          <div className="equity-score-top">
            <div><span>Estimated reliability gap</span><strong>{profile.equityGap}<small> points</small></strong></div>
            <div className={`equity-status ${profile.equityGap >= 20 ? "high" : "watch"}`}>
              {profile.equityGap >= 20 ? "Priority gap" : "Needs attention"}
            </div>
          </div>
          <div className="equity-scale"><span style={{ width: `${Math.min(100, profile.equityGap * 4)}%` }} /></div>
          <p>Difference between modelled urban and rural reliability indices. A larger value indicates a stronger equity concern.</p>
          <ConfidenceBadge>AI-assisted spatial estimate</ConfidenceBadge>
        </article>

        <article className="panel composition-card">
          <div className="section-title-row compact">
            <div><span>Degree of urbanisation</span><h2>Population settlement mix</h2></div>
            <span className="source-chip">BBS + WorldPop proxy</span>
          </div>
          <div className="composition-layout">
            <div className="composition-visual">
              <div className="composition-donut" style={{
                background: `conic-gradient(#45c4dc 0 ${profile.urban}%, #a98bff ${profile.urban}% ${profile.urban + profile.semiDense}%, #60dc9d ${profile.urban + profile.semiDense}% 100%)`,
              }}>
                <div><span>Population</span><strong>{profile.population}M</strong><small>modelled people</small></div>
              </div>
              <div className="composition-orbit"><span>100%</span><small>area mix</small></div>
            </div>
            <div className="composition-list">
              <article className="urban-composition">
                <div className="composition-type-icon"><Building2 size={15} /></div>
                <div><span>Urban centre</span><strong>{profile.urban}%</strong></div>
                <div className="composition-mini-track"><i style={{ width: `${profile.urban}%` }} /></div>
              </article>
              <article className="semi-composition">
                <div className="composition-type-icon"><UsersRound size={15} /></div>
                <div><span>Town / semi-dense</span><strong>{profile.semiDense}%</strong></div>
                <div className="composition-mini-track"><i style={{ width: `${profile.semiDense}%` }} /></div>
              </article>
              <article className="rural-composition">
                <div className="composition-type-icon"><Wheat size={15} /></div>
                <div><span>Rural settlement</span><strong>{profile.rural}%</strong></div>
                <div className="composition-mini-track"><i style={{ width: `${profile.rural}%` }} /></div>
              </article>
            </div>
          </div>
          <div className="composition-insight">
            <Sparkles size={15} />
            <span><strong>{profile.urban >= 55 ? "Urban-led" : profile.rural >= 55 ? "Rural-led" : "Mixed settlement pattern"}</strong><small>Largest share: {Math.max(profile.urban, profile.semiDense, profile.rural)}% · modelled spatial proxy</small></span>
          </div>
        </article>
      </section>

      <section className="panel equity-comparison-panel">
        <div className="section-title-row">
          <div><span>Side-by-side evidence</span><h2>Rural vs urban energy status</h2><p>Dynamic indicators for {profile.name}; values marked as estimates are not utility measurements.</p></div>
          <div className="segment-legend"><span><i className="urban-dot" /> Urban</span><span><i className="rural-dot" /> Rural</span></div>
        </div>
        <div className="comparison-table">
          <div className="comparison-head"><span>Indicator</span><span>Urban estimate</span><span>Rural estimate</span><span>Gap / interpretation</span></div>
          {comparison.map((metric) => {
            const difference = Math.abs(Number(metric.urban) - Number(metric.rural));
            return (
              <article key={metric.label} className="comparison-row">
                <div><strong>{metric.label}</strong><ConfidenceBadge /></div>
                <div className="comparison-value"><strong>{metric.urban}{metric.unit}</strong><span><i className="urban-fill" style={{ width: `${(Number(metric.urban) / metric.max) * 100}%` }} /></span></div>
                <div className="comparison-value"><strong>{metric.rural}{metric.unit}</strong><span><i className="rural-fill" style={{ width: `${(Number(metric.rural) / metric.max) * 100}%` }} /></span></div>
                <div className="comparison-note">
                  {metric.better === "context" ? "Different usage pattern" : `${difference.toFixed(metric.unit.includes("hr") ? 1 : 0)}${metric.unit} ${metric.better} advantage`}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="solution-grid">
        <section className="panel solution-panel urban-solution">
          <div className="solution-heading"><div className="solution-icon"><Building2 size={21} /></div><div><span>Urban planning fit</span><h2>Reduce the evening peak</h2></div></div>
          <ul>
            <li><CheckCircle2 size={16} /><span><strong>Rooftop solar portfolios</strong> for commercial and institutional buildings</span></li>
            <li><CheckCircle2 size={16} /><span><strong>Battery peak shaving</strong> during the 6:00 PM–9:00 PM risk window</span></li>
            <li><CheckCircle2 size={16} /><span><strong>Cooling efficiency</strong> and flexible commercial demand</span></li>
          </ul>
        </section>
        <section className="panel solution-panel rural-solution">
          <div className="solution-heading"><div className="solution-icon"><Wheat size={21} /></div><div><span>Rural planning fit</span><h2>Strengthen local reliability</h2></div></div>
          <ul>
            <li><CheckCircle2 size={16} /><span><strong>Solar mini-grids</strong> and community batteries for weak-edge areas</span></li>
            <li><CheckCircle2 size={16} /><span><strong>Irrigation load shifting</strong> away from the evening peak</span></li>
            <li><CheckCircle2 size={16} /><span><strong>Low-voltage monitoring</strong> at rural feeder endpoints</span></li>
          </ul>
        </section>
      </div>

      <section className="pilot-strip">
        <div><FlaskConical size={20} /><span><strong>Grounded pilot comparison</strong><small>Real local datasets can validate the national prototype without being presented as national ground truth.</small></span></div>
        <div className="pilot-sites"><span>Mirpur · residential</span><span>Gulshan · commercial</span><span>Saltha · rural feeders</span></div>
      </section>
    </div>
  );
}

function ForecastView({ profile }: { profile: ReturnType<typeof districtMetrics> }) {
  const seed = hashString(profile.name);
  const forecast = SYSTEM_DEMAND.map((value, index) =>
    Math.round(profile.demand * (value / 16.4) * (0.92 + ((seed + index) % 8) / 100)),
  );
  const baseline = forecast.map((value, index) => Math.round(value * (0.96 + ((seed + index * 3) % 9) / 100)));
  const factors = [
    { label: "Recent 24h demand", detail: "Momentum from the latest load profile", value: 92, impact: "+", icon: <Activity size={15} /> },
    { label: "Temperature", detail: "Cooling demand raises the evening baseline", value: 78, impact: "+", icon: <CloudSun size={15} /> },
    { label: "Hour of day", detail: "Household and commercial peaks overlap", value: 71, impact: "+", icon: <Clock3 size={15} /> },
    { label: "Day type / holiday", detail: "Calendar effect slightly lowers pressure", value: 46, impact: "−", icon: <ShieldCheck size={15} /> },
    { label: "Solar availability", detail: "Daylight output offsets part of demand", value: 32, impact: "−", icon: <Sun size={15} /> },
  ];

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="Explainable AI forecast"
        title={`${profile.name}: next 24 hours of demand and grid stress.`}
        description="A forecasting workspace that compares the AI model with a persistence baseline, highlights the likely evening peak and explains which features moved the prediction."
        action={<span className="model-ready"><span className="status-dot" />Model ready · prototype</span>}
      />

      <section className="forecast-stat-grid">
        <article><span>Forecast peak</span><strong>{Math.max(...forecast).toLocaleString()} <small>MW</small></strong><em>around {profile.peakHour}</em></article>
        <article><span>Peak stress risk</span><strong>{profile.stress}<small>/100</small></strong><em className={profile.stress >= 76 ? "danger" : "watch"}>{profile.stress >= 76 ? "High risk" : "Elevated watch"}</em></article>
        <article><span>Demo validation MAPE</span><strong>{(6.4 + (seed % 17) / 10).toFixed(1)}<small>%</small></strong><em>chronological holdout</em></article>
        <article><span>Prediction confidence</span><strong>{profile.confidence}<small>%</small></strong><em>feature coverage score</em></article>
      </section>

      <div className="forecast-grid">
        <section className="panel forecast-chart-panel">
          <div className="section-title-row">
            <div><span>District demand estimate</span><h2>Hourly demand forecast</h2><p>Spatially allocated demand, not a utility-measured district load</p></div>
            <div className="forecast-model-badge"><Sparkles size={13} /><span><strong>{profile.confidence}% confidence</strong><small>feature coverage</small></span></div>
          </div>
          <div className="forecast-series-legend">
            <span className="forecast-series-primary"><i /><span><strong>AI forecast</strong><small>Gradient line · confidence band</small></span></span>
            <span className="forecast-series-baseline"><i /><span><strong>Persistence baseline</strong><small>Dashed reference line</small></span></span>
            <span className="forecast-series-window"><Clock3 size={13} /><span><strong>Peak window</strong><small>6:00 PM–9:00 PM</small></span></span>
          </div>
          <DemandLineChart values={forecast} comparison={baseline} unit="MW" forecastStart={8} />
          <div className="forecast-callout"><AlertTriangle size={17} /><p><strong>Watch 6:00 PM–9:00 PM.</strong> The model sees the narrowest simulated supply margin near {profile.peakHour}.</p><span>Planning alert</span></div>
        </section>

        <section className="panel explain-panel">
          <div className="section-title-row compact"><div><span>SHAP-style explanation</span><h2>What drives this forecast?</h2></div><BrainCircuit size={20} /></div>
          <div className="factor-list">
            {factors.map((factor) => (
              <article key={factor.label} className={`factor-card ${factor.impact === "+" ? "positive" : "negative"}`}>
                <div className="factor-icon">{factor.icon}</div>
                <div className="factor-content">
                  <div className="factor-heading">
                    <span>{factor.label}</span>
                    <strong className={factor.impact === "+" ? "positive" : "negative"}>{factor.impact}{Math.round(factor.value / 8)}%</strong>
                  </div>
                  <small>{factor.detail}</small>
                  <div className="factor-track"><span className={factor.impact === "+" ? "positive" : "negative"} style={{ width: `${factor.value}%` }} /></div>
                </div>
              </article>
            ))}
          </div>
          <div className="shap-summary">
            <div className="shap-summary-icon"><TrendingUp size={17} /></div>
            <div><span>Combined model signal</span><strong>+21% upward pressure</strong><small>relative to the persistence baseline</small></div>
            <div className="shap-scale" aria-hidden="true"><i /><span /></div>
          </div>
          <div className="bangla-insight"><Sparkles size={17} /><p><strong>সহজ ব্যাখ্যা:</strong> সাম্প্রতিক চাহিদা ও বেশি তাপমাত্রার কারণে সন্ধ্যার peak বাড়ার সম্ভাবনা আছে। Solar output কমে যাওয়ায় 6:00 PM–9:00 PM সময়টায় grid pressure সবচেয়ে বেশি হতে পারে।</p></div>
        </section>
      </div>

      <section className="panel model-workflow">
        <div className="section-title-row compact"><div><span>Validation design</span><h2>From {MODEL_WINDOW.history} of history to an honest forecast</h2><p>{MODEL_WINDOW.training} model training · final {MODEL_WINDOW.validation} chronological holdout · {MODEL_WINDOW.horizon.toLowerCase()} prediction</p></div><ConfidenceBadge>{MODEL_WINDOW.samples}</ConfidenceBadge></div>
        <div className="workflow-steps">
          <article><span>01</span><div><Database size={19} /><strong>Historical load</strong><small>{MODEL_WINDOW.history} · lags 1 / 24 / 168 hours</small></div></article>
          <ArrowRight size={18} />
          <article><span>02</span><div><CloudSun size={19} /><strong>Context features</strong><small>weather, calendar, holidays</small></div></article>
          <ArrowRight size={18} />
          <article><span>03</span><div><BrainCircuit size={19} /><strong>XGBoost model</strong><small>persistence baseline first</small></div></article>
          <ArrowRight size={18} />
          <article><span>04</span><div><ShieldCheck size={19} /><strong>Holdout test</strong><small>{MODEL_WINDOW.validation} · no random time leakage</small></div></article>
        </div>
        <div className="forecast-window-note"><Info size={15} /><p><strong>Period used:</strong> {MODEL_WINDOW.history} ({MODEL_WINDOW.equivalent}) configured demonstration history, ending {MODEL_WINDOW.cutoff}. This prototype does not claim a live utility-trained district model.</p></div>
      </section>
    </div>
  );
}

function SimulatorView({ profile }: { profile: ReturnType<typeof districtMetrics> }) {
  const [segment, setSegment] = useState<"urban" | "rural">("urban");
  const [solar, setSolar] = useState(80);
  const [battery, setBattery] = useState(110);
  const [shift, setShift] = useState(12);
  const [efficiency, setEfficiency] = useState(8);

  const applyPreset = (next: "urban" | "rural") => {
    setSegment(next);
    if (next === "urban") {
      setSolar(80); setBattery(110); setShift(12); setEfficiency(8);
    } else {
      setSolar(28); setBattery(65); setShift(18); setEfficiency(5);
    }
  };

  const solarRelief = solar * (segment === "urban" ? 0.3 : 0.42);
  const batteryRelief = Math.min(battery * 0.45, profile.demand * 0.24);
  const shiftRelief = profile.demand * (shift / 100) * 0.58;
  const efficiencyRelief = profile.demand * (efficiency / 100);
  const totalRelief = Math.min(
    profile.demand * 0.52,
    solarRelief + batteryRelief + shiftRelief + efficiencyRelief,
  );
  const peakAfter = Math.max(0, Math.round(profile.demand - totalRelief));
  const reduction = Math.round((totalRelief / profile.demand) * 100);
  const stressAfter = Math.max(22, Math.round(profile.stress - reduction * 1.35));
  const renewableShare = Math.min(88, Math.round(5 + (solar / Math.max(1, profile.demand)) * 76));
  const rawRelief = Math.max(1, solarRelief + batteryRelief + shiftRelief + efficiencyRelief);
  const contributions = [
    { label: "Solar", value: solarRelief, share: (solarRelief / rawRelief) * 100, className: "solar" },
    { label: "Battery", value: batteryRelief, share: (batteryRelief / rawRelief) * 100, className: "battery" },
    { label: "Load shift", value: shiftRelief, share: (shiftRelief / rawRelief) * 100, className: "shift" },
    { label: "Efficiency", value: efficiencyRelief, share: (efficiencyRelief / rawRelief) * 100, className: "efficiency" },
  ];

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="Scenario planning lab"
        title={`What could lower ${profile.name}'s evening peak?`}
        description="Adjust solar, storage, flexible demand and efficiency to test a planning scenario. Results are transparent calculations—not dispatch instructions or investment guarantees."
        action={<ConfidenceBadge>Scenario estimate</ConfidenceBadge>}
      />

      <div className="simulator-layout">
        <section className="panel simulator-controls">
          <div className="section-title-row compact">
            <div><span>Configure intervention</span><h2>Solution inputs</h2></div>
            <SlidersHorizontal size={20} />
          </div>

          <div className="segment-switch" role="group" aria-label="Settlement scenario">
            <button className={segment === "urban" ? "active" : ""} onClick={() => applyPreset("urban")}><Building2 size={17} /><span><strong>Urban</strong><small>Building + commercial loads</small></span></button>
            <button className={segment === "rural" ? "active" : ""} onClick={() => applyPreset("rural")}><Wheat size={17} /><span><strong>Rural</strong><small>Community + agriculture</small></span></button>
          </div>

          <div className="slider-list">
            <label>
              <div><span><Sun size={17} /> Added solar capacity</span><strong>{solar} MW</strong></div>
              <input type="range" min="0" max={segment === "urban" ? 300 : 120} step="5" value={solar} onChange={(event) => setSolar(Number(event.target.value))} />
              <small><span>0</span><span>{segment === "urban" ? "300" : "120"} MW</span></small>
            </label>
            <label>
              <div><span><BatteryCharging size={17} /> Battery energy capacity</span><strong>{battery} MWh</strong></div>
              <input type="range" min="0" max="350" step="5" value={battery} onChange={(event) => setBattery(Number(event.target.value))} />
              <small><span>0</span><span>350 MWh</span></small>
            </label>
            <label>
              <div><span><Clock3 size={17} /> Flexible load shifted</span><strong>{shift}%</strong></div>
              <input type="range" min="0" max="35" step="1" value={shift} onChange={(event) => setShift(Number(event.target.value))} />
              <small><span>0%</span><span>35%</span></small>
            </label>
            <label>
              <div><span><Leaf size={17} /> Efficiency improvement</span><strong>{efficiency}%</strong></div>
              <input type="range" min="0" max="25" step="1" value={efficiency} onChange={(event) => setEfficiency(Number(event.target.value))} />
              <small><span>0%</span><span>25%</span></small>
            </label>
          </div>

          <div className="preset-note"><Lightbulb size={16} /><p><strong>{segment === "urban" ? "Urban preset:" : "Rural preset:"}</strong> {segment === "urban" ? "rooftop solar, building efficiency, commercial shifting and battery peak shaving." : "community solar, irrigation shifting and shared battery support."}</p></div>
        </section>

        <section className="panel simulator-results">
          <div className="section-title-row compact">
            <div><span>Calculated outcome</span><h2>Before vs scenario</h2></div>
            <span className="recalculate-badge"><Sparkles size={13} /> Live calculation</span>
          </div>

          <div className="impact-score">
            <div className="impact-ring" style={{ "--impact": `${Math.min(100, reduction) * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{reduction}%</strong><span>peak reduction</span></div>
            </div>
            <div className="impact-copy">
              <span>Scenario impact</span>
              <h3>{reduction >= 25 ? "Strong planning potential" : reduction >= 14 ? "Meaningful improvement" : "Incremental improvement"}</h3>
              <p>{Math.round(totalRelief).toLocaleString()} MW of combined modelled peak relief.</p>
              <div className="impact-highlight"><TrendingDown size={15} /><strong>{Math.max(0, profile.stress - stressAfter)} points</strong><span>lower estimated grid stress</span></div>
            </div>
          </div>

          <div className="scenario-contribution">
            <div className="scenario-contribution-head"><span>Relief contribution</span><strong>{Math.round(totalRelief).toLocaleString()} MW total</strong></div>
            <div className="scenario-contribution-bar" aria-label="Modelled peak relief contribution by intervention">
              {contributions.map((item) => <i key={item.label} className={item.className} style={{ width: `${item.share}%` }} />)}
            </div>
            <div className="scenario-contribution-legend">
              {contributions.map((item) => (
                <span key={item.label}><i className={item.className} /><span>{item.label}</span><strong>{Math.round(item.value)} MW</strong></span>
              ))}
            </div>
          </div>

          <div className="before-after">
            <article>
              <div className="outcome-card-head"><span>Peak demand</span><strong>−{Math.round(totalRelief).toLocaleString()} MW</strong></div>
              <div className="outcome-values">
                <div><small>Before</small><strong>{profile.demand.toLocaleString()} <span>MW</span></strong></div>
                <ArrowRight size={17} />
                <div><small>Scenario</small><strong>{peakAfter.toLocaleString()} <span>MW</span></strong></div>
              </div>
              <div className="before-bar"><i style={{ width: "100%" }} /><span style={{ width: `${100 - reduction}%` }} /></div>
            </article>
            <article>
              <div className="outcome-card-head"><span>Grid stress</span><strong>−{Math.max(0, profile.stress - stressAfter)} points</strong></div>
              <div className="outcome-values">
                <div><small>Before</small><strong>{profile.stress} <span>/100</span></strong></div>
                <ArrowRight size={17} />
                <div><small>Scenario</small><strong>{stressAfter} <span>/100</span></strong></div>
              </div>
              <div className="before-bar stress"><i style={{ width: `${profile.stress}%` }} /><span style={{ width: `${stressAfter}%` }} /></div>
            </article>
          </div>

          <div className="result-grid">
            <article><TrendingDown size={18} /><span>Peak relief</span><strong>{Math.round(totalRelief)} <small>MW</small></strong></article>
            <article><Sun size={18} /><span>Renewable share</span><strong>{renewableShare}<small>%</small></strong></article>
            <article><BatteryCharging size={18} /><span>Battery support</span><strong>{Math.round(batteryRelief)} <small>MW</small></strong></article>
            <article><Clock3 size={18} /><span>Shifted demand</span><strong>{Math.round(shiftRelief)} <small>MW</small></strong></article>
          </div>

          <div className="recommendation-card">
            <div><Lightbulb size={18} /><strong>AI planning note</strong></div>
            <p>
              {segment === "urban"
                ? `For ${profile.name}'s urban areas, battery support and load shifting contribute most during the evening peak because solar output is already declining.`
                : `For ${profile.name}'s rural areas, pair community solar with shared storage and move irrigation loads away from the 6:00 PM–9:00 PM risk window.`}
            </p>
          </div>
          <p className="simulator-disclaimer"><Info size={14} /> Scenario outputs support comparison only. Engineering design, cost, network constraints and utility approval require a detailed study.</p>
        </section>
      </div>
    </div>
  );
}

function CommunityView({ profile }: { profile: ReturnType<typeof districtMetrics> }) {
  const selectedDistrict = profile.districtName;
  const selectedAreaName = profile.name;
  const [reports, setReports] = useState<CommunityReport[]>(DEMO_REPORTS);
  const [district, setDistrict] = useState(selectedDistrict);
  const [location, setLocation] = useState("");
  const [issue, setIssue] = useState("Power outage");
  const [severity, setSeverity] = useState("Medium");
  const [duration, setDuration] = useState("15–45 min");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setDistrict(selectedDistrict);
  }, [selectedDistrict]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("shoktimap-community-reports");
      if (saved) setReports([...JSON.parse(saved), ...DEMO_REPORTS]);
    } catch {
      // Device-local storage is optional; the reporting demo still works in memory.
    }
  }, []);

  const submitReport = (event: React.FormEvent) => {
    event.preventDefault();
    const report: CommunityReport = {
      id: `local-${Date.now()}`,
      district,
      location: location.trim() || "Area not specified",
      issue,
      severity,
      duration,
      time: "Just now",
    };
    setReports((current) => [report, ...current]);
    try {
      const existing = JSON.parse(window.localStorage.getItem("shoktimap-community-reports") ?? "[]") as CommunityReport[];
      window.localStorage.setItem("shoktimap-community-reports", JSON.stringify([report, ...existing].slice(0, 20)));
    } catch {
      // Keep the current-session report if device storage is unavailable.
    }
    setLocation("");
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 3500);
  };

  const selectedReports = reports.filter((report) => {
    if (report.district !== selectedDistrict) return false;
    if (profile.scope !== "locality") return true;
    return report.location.toLowerCase().includes(selectedAreaName.toLowerCase());
  });

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="Community power pulse"
        title="Turn local outage experiences into a visible signal."
        description="Citizens can submit coarse area-level reports. GridPulse BD keeps this layer separate from official measurements, clusters repeated signals and avoids collecting exact home addresses."
        action={<span className="privacy-badge"><ShieldCheck size={15} /> Privacy-aware demo</span>}
      />

      <section className="community-stats">
        <article><Radio size={20} /><div><span>Reports in demo</span><strong>{reports.length}</strong></div></article>
        <article><LocateFixed size={20} /><div><span>{selectedAreaName} signals</span><strong>{selectedReports.length}</strong></div></article>
        <article><AlertTriangle size={20} /><div><span>High severity</span><strong>{reports.filter((report) => report.severity === "High").length}</strong></div></article>
        <article><UsersRound size={20} /><div><span>Potential clusters</span><strong>3</strong></div></article>
      </section>

      <div className="community-layout">
        <section className="panel report-form-panel">
          <div className="section-title-row compact"><div><span>Device-local prototype</span><h2>Report a power issue</h2><p>No name, phone number or exact address required.</p></div><Send size={20} /></div>
          {submitted && <div className="submit-success" role="status"><CheckCircle2 size={17} /><span><strong>Report added.</strong> It now appears as a community signal on this device.</span></div>}
          <form onSubmit={submitReport} className="report-form">
            <label><span>District</span><select value={district} onChange={(event) => setDistrict(event.target.value)}>{DISTRICTS.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <label><span>Area / landmark <small>(coarse location)</small></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Mirpur 10 or Saltha bazar" maxLength={60} /></label>
            <label><span>Issue type</span><select value={issue} onChange={(event) => setIssue(event.target.value)}><option>Power outage</option><option>Low voltage</option><option>Frequent fluctuation</option><option>Transformer problem</option><option>Other</option></select></label>
            <div className="form-two-col">
              <label><span>Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
              <label><span>Duration</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option>Under 15 min</option><option>15–45 min</option><option>45–90 min</option><option>Over 90 min</option><option>Still ongoing</option></select></label>
            </div>
            <div className="privacy-note"><ShieldCheck size={16} /><p>For a real launch, reports would use approximate geohashes and minimum cluster sizes before public display.</p></div>
            <button type="submit" className="submit-report"><Send size={16} /> Submit community report</button>
          </form>
        </section>

        <section className="panel report-feed-panel">
          <div className="section-title-row compact"><div><span>Separate evidence layer</span><h2>Recent community signals</h2><p>Demonstration + reports saved on this device</p></div><span className="live-feed"><span className="live-pulse" />Live feed</span></div>
          <div className="report-feed">
            {reports.slice(0, 8).map((report) => (
              <article key={report.id}>
                <div className={`report-severity ${report.severity.toLowerCase()}`}><AlertTriangle size={17} /></div>
                <div className="report-body"><div><strong>{report.issue}</strong><span className={`severity-label ${report.severity.toLowerCase()}`}>{report.severity}</span></div><p><MapPinned size={13} /> {report.location}, {report.district}</p><small>{report.duration} · {report.time}</small></div>
                <ConfidenceBadge>Community reported</ConfidenceBadge>
              </article>
            ))}
          </div>
          <div className="cluster-explainer"><UsersRound size={18} /><div><strong>How clustering works</strong><p>Multiple nearby reports within a short time window can form a potential event. One isolated report stays unverified.</p></div></div>
        </section>
      </div>
    </div>
  );
}

function DataView() {
  const sources = [
    { source: "PGCB-derived hourly system data", coverage: "National · hourly · 2015–2026", status: "Measured / compiled", url: "https://data.mendeley.com/datasets/vpk8spw2mm/1" },
    { source: "geoBoundaries ADM2", coverage: "64 districts · boundary geometry", status: "Official-source boundary", url: "https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM2/" },
    { source: "BBS Population & Housing Census 2022", coverage: "Rural / urban definitions + population", status: "Official statistics", url: "https://bbs.gov.bd/" },
    { source: "WorldPop Degree of Urbanisation", coverage: "1 km settlement classes", status: "Modelled raster", url: "https://hub.worldpop.org/geodata/summary?id=122771" },
    { source: "NASA POWER", coverage: "Weather + solar resource", status: "Satellite / reanalysis", url: "https://power.larc.nasa.gov/" },
    { source: "VIIRS Nighttime Lights", coverage: "Economic activity proxy", status: "Satellite observation", url: "https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_MONTHLY_V1_VCMCFG" },
    { source: "Mirpur + Gulshan load dataset", coverage: "Urban pilots · daily", status: "Verified local pilot", url: "https://data.mendeley.com/datasets/3crvdfyvvp/1" },
    { source: "SALTLoad — Saltha, Faridpur", coverage: "Rural feeders · 5 minute", status: "Verified local pilot", url: "https://data.mendeley.com/datasets/vgmxfs4yk9/2" },
  ];

  return (
    <div className="view-stack">
      <ViewHeading
        eyebrow="Data & AI transparency"
        title="Every number should say what it is—and what it is not."
        description="GridPulse BD keeps measured data, verified local pilots, forecasts, spatial estimates and community reports visibly distinct. This is central to the project's scientific credibility."
        action={<span className="transparency-score"><ShieldCheck size={16} /> Transparency by design</span>}
      />

      <section className="status-taxonomy">
        <article className="official"><ShieldCheck size={20} /><div><strong>Official measured</strong><p>Direct national or grid-zone operational statistics.</p></div></article>
        <article className="verified"><CheckCircle2 size={20} /><div><strong>Verified local</strong><p>Authorised pilot feeder or area datasets.</p></div></article>
        <article className="estimate"><Sparkles size={20} /><div><strong>AI / spatial estimate</strong><p>Model output with confidence and methodology.</p></div></article>
        <article className="community"><Radio size={20} /><div><strong>Community reported</strong><p>Citizen signal; not an official outage record.</p></div></article>
      </section>

      <section className="panel data-source-panel">
        <div className="section-title-row"><div><span>Proposed evidence base</span><h2>Dataset registry</h2><p>Links open the original source or authoritative catalogue.</p></div><span className="source-count">{sources.length} source groups</span></div>
        <div className="source-table">
          <div className="source-head"><span>Source</span><span>Coverage</span><span>Data status</span><span>Access</span></div>
          {sources.map((source) => (
            <article key={source.source}>
              <div><Database size={16} /><strong>{source.source}</strong></div>
              <span>{source.coverage}</span>
              <span className="data-status">{source.status}</span>
              <a href={source.url} target="_blank" rel="noreferrer">Open source <ArrowRight size={13} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="panel pipeline-panel">
        <div className="section-title-row compact"><div><span>Reproducible concept</span><h2>How an area score is produced</h2></div><ConfidenceBadge>Explainable pipeline</ConfidenceBadge></div>
        <div className="pipeline-flow">
          <article><span>01</span><Database size={21} /><strong>Collect</strong><small>load, weather, population, lights</small></article><ArrowRight size={19} />
          <article><span>02</span><FlaskConical size={21} /><strong>Validate</strong><small>missingness, leakage, timestamps</small></article><ArrowRight size={19} />
          <article><span>03</span><BrainCircuit size={21} /><strong>Model</strong><small>forecast + spatial allocation</small></article><ArrowRight size={19} />
          <article><span>04</span><BarChart3 size={21} /><strong>Explain</strong><small>factors, confidence, baseline</small></article><ArrowRight size={19} />
          <article><span>05</span><MapPinned size={21} /><strong>Map</strong><small>area insight + scenario planning</small></article>
        </div>
      </section>

      <div className="limitation-grid">
        <section className="panel limitation-panel">
          <div className="section-title-row compact"><div><span>Scientific guardrails</span><h2>Current limitations</h2></div><AlertTriangle size={20} /></div>
          <ul>
            <li><X size={15} /><span>No public, official 64-district hourly demand series was identified; district demand must be labelled as an estimate.</span></li>
            <li><X size={15} /><span>National generation mix cannot be presented as a district-level fuel mix.</span></li>
            <li><X size={15} /><span>Community reports are signals and may contain bias, duplicates or false positives.</span></li>
            <li><X size={15} /><span>Pilot data from Mirpur, Gulshan and Saltha cannot automatically generalise to all Bangladesh.</span></li>
          </ul>
        </section>
        <section className="panel model-card">
          <div className="section-title-row compact"><div><span>ML evaluation</span><h2>Minimum competition evidence</h2></div><ShieldCheck size={20} /></div>
          <ul>
            <li><CheckCircle2 size={15} /><span>Compare against persistence and seasonal baselines.</span></li>
            <li><CheckCircle2 size={15} /><span>Use chronological train / validation / test splits.</span></li>
            <li><CheckCircle2 size={15} /><span>Report MAE, RMSE and MAPE with error by peak hour.</span></li>
            <li><CheckCircle2 size={15} /><span>Calibrate risk probabilities and show confidence.</span></li>
          </ul>
        </section>
      </div>

      <section className="honesty-banner"><ShieldCheck size={22} /><div><strong>Core promise</strong><p>If precise feeder data is unavailable, GridPulse BD shows an estimate with its confidence—not a fabricated “live” number.</p></div></section>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("map");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [selectedDistrict, setSelectedDistrict] = useState("Dhaka");
  const [selectedArea, setSelectedArea] = useState<LiveLocation | null>(null);
  const [metric, setMetric] = useState<MetricKey>("stress");
  const [loadSlotIndex, setLoadSlotIndex] = useState(9);
  const [searchOpen, setSearchOpen] = useState(false);
  const [areaProfileOpen, setAreaProfileOpen] = useState(false);
  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profile = selectedArea ? localityMetrics(selectedArea) : districtMetrics(selectedDistrict);
  const searchResults = DISTRICTS.filter((district) =>
    `${district.name} ${district.division}`.toLowerCase().includes(searchQuery.toLowerCase()),
  ).slice(0, 8);
  const forecastSeed = hashString(profile.name);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("gridpulse-theme");
    const resolvedTheme: ThemeMode = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(resolvedTheme);
    document.documentElement.dataset.theme = resolvedTheme;
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("gridpulse-theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      return nextTheme;
    });
  };

  const chooseDistrict = (district: string) => {
    setSelectedDistrict(normalizeDistrictName(district));
    setSelectedArea(null);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const chooseArea = (location: LiveLocation) => {
    setSelectedDistrict(normalizeDistrictName(location.district));
    setSelectedArea(location);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <AppLogo />
          <div className="brand-wordmark">
            <div><strong>GridPulse</strong><span>BD</span></div>
            <small>Energy intelligence</small>
          </div>
          <button
            className="icon-button close-menu"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          <button className={`nav-item ${activeTab === "overview" ? "active" : ""}`} onClick={() => openTab("overview")}><HomeIcon size={18} />National overview</button>
          <button className={`nav-item ${activeTab === "map" ? "active" : ""}`} onClick={() => openTab("map")}><MapPinned size={18} />Energy map</button>
          <button className={`nav-item ${activeTab === "equity" ? "active" : ""}`} onClick={() => openTab("equity")}><Building2 size={18} />Rural–urban equity</button>
          <button className={`nav-item ${activeTab === "forecast" ? "active" : ""}`} onClick={() => openTab("forecast")}><BrainCircuit size={18} />Forecast centre</button>
          <p className="nav-label nav-label-spaced">Plan & report</p>
          <button className={`nav-item ${activeTab === "simulator" ? "active" : ""}`} onClick={() => openTab("simulator")}><Gauge size={18} />Smart simulator</button>
          <button className={`nav-item ${activeTab === "community" ? "active" : ""}`} onClick={() => openTab("community")}><Radio size={18} />Community pulse</button>
          <button className={`nav-item ${activeTab === "data" ? "active" : ""}`} onClick={() => openTab("data")}><Database size={18} />Data & AI</button>
        </nav>

        <div className="developer-credit">
          <a
            className="credit-linkedin"
            href="https://www.linkedin.com/in/estiuk-arafat-arnob-0350ba34a"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Estiuk Arafat Arnob's LinkedIn profile"
            title="View LinkedIn profile"
          >
            <Linkedin size={18} aria-hidden="true" />
          </a>
          <div className="credit-copy">
            <span>Developed by</span>
            <strong>Estiuk Arafat Arnob</strong>
            <small>Concept · Data · AI/ML · Development</small>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="mobile-topbar-brand" aria-label="GridPulse BD energy intelligence">
              <AppLogo />
              <span><strong>GridPulse BD</strong><small>Energy intelligence</small></span>
            </div>
            <div><span>Bangladesh energy intelligence</span><strong>{TAB_LABELS[activeTab]}</strong></div>
          </div>
          <div className="topbar-actions">
            <LiveDhakaClock />
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="dashboard">
          {activeTab === "overview" && (
            <OverviewView
              onOpenMap={() => openTab("map")}
              onSelectDistrict={(district) => {
                chooseDistrict(district);
                openTab("map");
              }}
            />
          )}
          {activeTab === "equity" && <EquityView profile={profile} onChooseArea={() => setSearchOpen(true)} />}
          {activeTab === "forecast" && <ForecastView profile={profile} />}
          {activeTab === "simulator" && <SimulatorView profile={profile} />}
          {activeTab === "community" && <CommunityView profile={profile} />}
          {activeTab === "data" && <DataView />}
          {activeTab === "map" && (
          <>
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-pulse" />Model demonstration</div>
              <h1>Where is Bangladesh&apos;s grid under pressure?</h1>
              <p>
                Explore district-level stress, energy equity and renewable potential—
                with every estimate clearly labelled.
              </p>
            </div>
            <button className="district-selector" onClick={() => setSearchOpen(true)}>
              <MapPinned size={17} />
              <span><span>Selected area</span><strong>{profile.name}</strong></span>
              <ChevronDown size={17} />
            </button>
          </section>

          <section className="snapshot-grid" aria-label="National model snapshot">
            <article className="snapshot-card mint">
              <div className="snapshot-icon"><Activity size={19} /></div>
              <div><span>System demand</span><strong>16.2 <small>GW</small></strong><em>scenario input</em></div>
              <MiniTrend values={[11, 12, 12, 13, 13, 14, 15, 16, 16, 15]} />
            </article>
            <article className="snapshot-card blue">
              <div className="snapshot-icon"><Zap size={19} /></div>
              <div><span>Available supply</span><strong>15.4 <small>GW</small></strong><em>scenario input</em></div>
              <MiniTrend values={[14, 14, 15, 15, 15, 15, 16, 15, 15, 15]} />
            </article>
            <article className="snapshot-card coral">
              <div className="snapshot-icon"><AlertTriangle size={19} /></div>
              <div><span>High-stress zones</span><strong>3 <small>of 9</small></strong><em>AI risk class</em></div>
              <span className="metric-pill up">+1 vs 6:00 PM</span>
            </article>
            <article className="snapshot-card amber">
              <div className="snapshot-icon"><Sun size={19} /></div>
              <div><span>Renewable share</span><strong>4.8<small>%</small></strong><em>national estimate</em></div>
              <span className="metric-pill">planning view</span>
            </article>
          </section>

          <div className="main-grid">
            <section className="panel map-panel">
              <div className="panel-heading map-heading">
                <div>
                  <div className="heading-icon"><Layers3 size={18} /></div>
                  <div><h2>District intelligence map</h2><p>{METRIC_META[metric].description}</p></div>
                </div>
                <span className="official-badge"><ShieldCheck size={13} /> Official boundary</span>
              </div>

              <div className="map-toolbar">
                <div className="metric-tabs" role="tablist" aria-label="Map metric">
                  {(Object.keys(METRIC_META) as MetricKey[]).map((key) => (
                    <button
                      key={key}
                      className={metric === key ? "active" : ""}
                      onClick={() => setMetric(key)}
                      role="tab"
                      aria-selected={metric === key}
                    >
                      {METRIC_META[key].label}
                    </button>
                  ))}
                </div>
                <div className="map-toolbar-actions">
                  <button className="live-map-launch" onClick={() => setLiveMapOpen(true)}>
                    <LocateFixed size={16} /><span>Open live map</span><ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="map-stage">
                <div className="map-canvas">
                  <BangladeshMap metric={metric} selected={selectedDistrict} onSelect={chooseDistrict} />
                </div>
                <div className="map-legend">
                  <strong>{METRIC_META[metric].label}</strong>
                  <span><i className="legend-low" /> lower</span>
                  <span><i className="legend-mid" /> moderate</span>
                  <span><i className="legend-high" /> higher</span>
                </div>
                <div className="map-note"><Info size={15} />Click a district for details. Division shortcuts highlight the complete division.</div>
              </div>
              <div className="division-shortcuts" aria-label="Division map shortcuts">
                {Object.entries(DISTRICTS_BY_DIVISION).map(([division, districts]) => (
                  <button
                    key={division}
                    className={profile.division === division ? "active" : ""}
                    onClick={() => chooseDistrict(districts.includes(division) ? division : districts[0])}
                    aria-label={`Highlight all ${districts.length} districts in ${division} Division`}
                    title={`Highlight ${division} Division`}
                  >
                    <span>{division}</span><small>{districts.length}</small>
                  </button>
                ))}
              </div>
              <footer className="panel-footer">
                <span>Satellite basemap + bundled 64-district ADM2 layer</span>
                <ConfidenceBadge />
              </footer>
            </section>

            <section className="panel area-panel">
              <div className="area-header">
                <div>
                  <span className="area-kicker">Selected district</span>
                  <h2>{profile.name}</h2>
                  <p>{profile.division} Division · {profile.population}M modelled population</p>
                </div>
                <div
                  className="stress-ring"
                  style={{ "--score": `${profile.stress * 3.6}deg` } as React.CSSProperties}
                  aria-label={`Grid stress score ${profile.stress} out of 100`}
                >
                  <div><strong>{profile.stress}</strong><span>stress</span></div>
                </div>
              </div>

              <div className="risk-banner">
                <div className="risk-icon"><AlertTriangle size={19} /></div>
                <div>
                  <strong>
                    সন্ধ্যার গ্রিড-চাপের ঝুঁকি {profile.stress >= 76 ? "উচ্চ" : profile.stress >= 61 ? "বাড়তি" : "মাঝারি"}
                  </strong>
                  <p>সম্ভাব্য সর্বোচ্চ চাপ: {profile.peakHour} · পরবর্তী দিনের মডেল</p>
                </div>
                <span>{profile.stress >= 76 ? "উচ্চ" : profile.stress >= 61 ? "সতর্কতা" : "স্থিতিশীল"}</span>
              </div>

              <LoadSheddingChanceCard
                profile={profile}
                slotIndex={loadSlotIndex}
                onSlotChange={setLoadSlotIndex}
                areaLabel={profile.scope === "locality" ? profile.name : `${profile.name} District`}
                areaKey={profile.areaKey}
              />

              <div className="area-metrics">
                <article>
                  <span>Demand estimate</span>
                  <strong>{profile.demand.toLocaleString()} <small>MW</small></strong>
                  <ConfidenceBadge />
                </article>
                <article>
                  <span>Solar potential</span>
                  <strong>{profile.solar} <small>kWh/m²/day</small></strong>
                  <ConfidenceBadge>NASA POWER proxy</ConfidenceBadge>
                </article>
                <article>
                  <span>Community signals</span>
                  <strong>{profile.outageReports} <small>reports</small></strong>
                  <ConfidenceBadge>Demonstration reports</ConfidenceBadge>
                </article>
              </div>

              <div className="settlement-card">
                <div className="settlement-heading">
                  <div><span>Settlement mix</span><strong>Rural–urban profile</strong></div>
                  <span className="mixed-label">
                    {profile.urban >= 55 ? "Urban-led" : profile.rural >= 55 ? "Rural-led" : "Mixed"}
                  </span>
                </div>
                <div className="settlement-bar" aria-label="Settlement composition">
                  <span className="urban-bar" style={{ width: `${profile.urban}%` }} />
                  <span className="semi-bar" style={{ width: `${profile.semiDense}%` }} />
                  <span className="rural-bar" style={{ width: `${profile.rural}%` }} />
                </div>
                <div className="settlement-legend">
                  <span><i className="urban-dot" /><strong>{profile.urban}%</strong> Urban</span>
                  <span><i className="semi-dot" /><strong>{profile.semiDense}%</strong> Town / semi-dense</span>
                  <span><i className="rural-dot" /><strong>{profile.rural}%</strong> Rural</span>
                </div>
              </div>

              <div className="ai-explanation">
                <div className="ai-heading">
                  <span><BrainCircuit size={17} /> Why this risk?</span>
                  <span>Explainable AI</span>
                </div>
                <p>
                  The model flags <strong>{profile.name}</strong> because estimated evening demand rises
                  <strong> {9 + (forecastSeed % 8)}%</strong>, while the simulated supply margin falls below
                  <strong> {5 + (forecastSeed % 4)}%</strong>. High temperature and recent demand are the strongest factors.
                </p>
                <button className="area-profile-cta" type="button" onClick={() => setAreaProfileOpen(true)}>
                  <span className="area-profile-cta-icon"><MapPinned size={17} /></span>
                  <span><small>Explore every indicator</small><strong>Open full area profile</strong></span>
                  <span className="area-profile-cta-arrow"><ArrowRight size={16} /></span>
                </button>
              </div>

              <div className="confidence-row">
                <div><span>Area estimate confidence</span><strong>{profile.confidence}%</strong></div>
                <div className="confidence-track"><span style={{ width: `${profile.confidence}%` }} /></div>
                <p>Boundary + population + night-light + weather feature coverage</p>
              </div>
            </section>
          </div>

          <section className="method-strip">
            <div className="method-icon"><BrainCircuit size={20} /></div>
            <div>
              <strong>Designed for honest decision support</strong>
              <p>
                National and grid-zone measurements can be official; district demand and stress are spatial estimates until utility-grade feeder data is connected.
              </p>
            </div>
            <div className="method-tags">
              <span><ShieldCheck size={14} /> Official measured</span>
              <span><Sparkles size={14} /> AI estimate</span>
              <span><Radio size={14} /> Community reported</span>
            </div>
          </section>
          </>
          )}
        </div>
      </main>

      {searchOpen && (
        <div className="search-modal" role="dialog" aria-modal="true" aria-label="Select a district">
          <button className="modal-scrim" onClick={() => setSearchOpen(false)} aria-label="Close district search" />
          <div className="search-dialog">
            <div className="search-dialog-header">
              <div><span>Explore Bangladesh</span><h2>Select a district</h2></div>
              <button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <label className="search-field">
              <Search size={18} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search district or division…"
              />
              <kbd>64 districts</kbd>
            </label>
            <div className="search-results">
              {searchResults.map((district) => {
                const result = districtMetrics(district.name);
                return (
                  <button key={district.name} onClick={() => chooseDistrict(district.name)}>
                    <span className="result-icon"><MapPinned size={17} /></span>
                    <span><strong>{district.name}</strong><small>{district.division} Division</small></span>
                    <span className={`result-risk ${result.stress >= 76 ? "high" : result.stress >= 61 ? "watch" : "stable"}`}>
                      {result.stress}/100
                    </span>
                  </button>
                );
              })}
              {!searchResults.length && <div className="empty-result">No district matched “{searchQuery}”.</div>}
            </div>
          </div>
        </div>
      )}
      {areaProfileOpen && (
        <AreaProfileModal
          profile={profile}
          slotIndex={loadSlotIndex}
          onSlotChange={setLoadSlotIndex}
          onClose={() => setAreaProfileOpen(false)}
        />
      )}
      {liveMapOpen && (
        <LiveMapExplorer
          selectedDistrict={selectedDistrict}
          loadSlotIndex={loadSlotIndex}
          onLoadSlotChange={setLoadSlotIndex}
          onAreaSelect={chooseArea}
          onClose={() => setLiveMapOpen(false)}
        />
      )}
    </div>
  );
}
