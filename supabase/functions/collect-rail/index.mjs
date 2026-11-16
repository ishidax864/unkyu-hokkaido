// scripts/edge/client.mjs
import { createClient } from "npm:@supabase/supabase-js@2.93.3";
var client;
function getAdminSupabaseClient() {
  return client ??= createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

// scripts/edge/logger.mjs
var logger = { info: (message) => console.info(message), warn: (message) => console.warn(message), error: (message) => console.error(message), debug: () => {
} };

// data/crawler-config.json
var crawler_config_default = {
  areas: [
    {
      id: "01",
      name: "\u672D\u5E4C\u8FD1\u90CA",
      url: "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_01.json",
      lat: 43.0687,
      lon: 141.3508
    },
    {
      id: "02",
      name: "\u9053\u592E",
      url: "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_02.json",
      lat: 42.9236,
      lon: 141.6139
    },
    {
      id: "03",
      name: "\u9053\u5357",
      url: "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_03.json",
      lat: 41.7736,
      lon: 140.7266
    },
    {
      id: "04",
      name: "\u9053\u5317",
      url: "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_04.json",
      lat: 43.7709,
      lon: 142.365
    },
    {
      id: "05",
      name: "\u9053\u6771",
      url: "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_05.json",
      lat: 42.9236,
      lon: 143.1966
    }
  ],
  routeMatching: [
    {
      id: "jr-hokkaido.chitose",
      keywords: [
        "\u5343\u6B73\u7DDA",
        "\u30A8\u30A2\u30DD\u30FC\u30C8",
        "\u65B0\u5343\u6B73\u7A7A\u6E2F",
        "\u672D\u5E4C\u570F",
        "\u9053\u592E\u30A8\u30EA\u30A2"
      ],
      areas: [
        "01",
        "02"
      ]
    },
    {
      id: "jr-hokkaido.hakodate-main",
      keywords: [
        "\u51FD\u9928\u7DDA",
        "\u51FD\u9928\u672C\u7DDA",
        "\u5C0F\u6A3D",
        "\u5CA9\u898B\u6CA2",
        "\u6EDD\u5DDD",
        "\u30E9\u30A4\u30E9\u30C3\u30AF",
        "\u30AB\u30E0\u30A4",
        "\u5036\u77E5\u5B89",
        "\u30CB\u30BB\u30B3",
        "\u4F59\u5E02",
        "\u672D\u5E4C\u570F",
        "\u9053\u592E\u30A8\u30EA\u30A2",
        "\u9053\u5317\u30A8\u30EA\u30A2"
      ],
      areas: [
        "01",
        "02",
        "04"
      ]
    },
    {
      id: "jr-hokkaido.gakuentoshi",
      keywords: [
        "\u5B66\u5712\u90FD\u5E02\u7DDA",
        "\u672D\u6CBC\u7DDA",
        "\u5317\u6D77\u9053\u533B\u7642\u5927\u5B66",
        "\u672D\u5E4C\u570F"
      ],
      areas: [
        "01"
      ]
    },
    {
      id: "jr-hokkaido.muroran-main",
      keywords: [
        "\u5BA4\u862D\u7DDA",
        "\u5BA4\u862D\u672C\u7DDA",
        "\u3059\u305A\u3089\u3093",
        "\u82EB\u5C0F\u7267",
        "\u6771\u5BA4\u862D",
        "\u4F0A\u9054\u7D0B\u5225",
        "\u9053\u592E\u30A8\u30EA\u30A2",
        "\u9053\u5357\u30A8\u30EA\u30A2"
      ],
      areas: [
        "02",
        "03"
      ]
    },
    {
      id: "jr-hokkaido.hakodate-south",
      keywords: [
        "\u51FD\u9928\u7DDA",
        "\u51FD\u9928\u672C\u7DDA",
        "\u9577\u4E07\u90E8",
        "\u51FD\u9928",
        "\u65B0\u51FD\u9928\u5317\u6597",
        "\u5317\u6597",
        "\u5927\u6CBC",
        "\u9053\u5357\u30A8\u30EA\u30A2"
      ],
      areas: [
        "03"
      ]
    },
    {
      id: "jr-hokkaido.soya-main",
      keywords: [
        "\u5B97\u8C37\u7DDA",
        "\u5B97\u8C37\u672C\u7DDA",
        "\u540D\u5BC4",
        "\u7A1A\u5185",
        "\u9053\u5317\u30A8\u30EA\u30A2"
      ],
      areas: [
        "04"
      ]
    },
    {
      id: "jr-hokkaido.sekihoku-main",
      keywords: [
        "\u77F3\u5317\u7DDA",
        "\u77F3\u5317\u672C\u7DDA",
        "\u5317\u898B",
        "\u7DB2\u8D70",
        "\u9053\u5317\u30A8\u30EA\u30A2",
        "\u9053\u6771\u30A8\u30EA\u30A2"
      ],
      areas: [
        "04",
        "05"
      ]
    },
    {
      id: "jr-hokkaido.furano",
      keywords: [
        "\u5BCC\u826F\u91CE\u7DDA",
        "\u9053\u5317\u30A8\u30EA\u30A2"
      ],
      areas: [
        "04"
      ]
    },
    {
      id: "jr-hokkaido.rumoi",
      keywords: [
        "\u7559\u840C\u7DDA",
        "\u7559\u840C\u672C\u7DDA",
        "\u9053\u5317\u30A8\u30EA\u30A2"
      ],
      areas: [
        "04"
      ]
    },
    {
      id: "jr-hokkaido.hidaka",
      keywords: [
        "\u65E5\u9AD8\u7DDA",
        "\u65E5\u9AD8\u672C\u7DDA",
        "\u9053\u592E\u30A8\u30EA\u30A2",
        "\u9053\u6771\u30A8\u30EA\u30A2"
      ],
      areas: [
        "02",
        "05"
      ]
    },
    {
      id: "jr-hokkaido.sekisho",
      keywords: [
        "\u77F3\u52DD\u7DDA",
        "\u304A\u304A\u305E\u3089",
        "\u3068\u304B\u3061",
        "\u5357\u5343\u6B73",
        "\u9053\u592E\u30A8\u30EA\u30A2",
        "\u9053\u6771\u30A8\u30EA\u30A2"
      ],
      areas: [
        "02",
        "05"
      ]
    },
    {
      id: "jr-hokkaido.nemuro-main",
      keywords: [
        "\u6839\u5BA4\u7DDA",
        "\u6839\u5BA4\u672C\u7DDA",
        "\u5E2F\u5E83",
        "\u91E7\u8DEF",
        "\u9053\u592E\u30A8\u30EA\u30A2",
        "\u9053\u5317\u30A8\u30EA\u30A2",
        "\u9053\u6771\u30A8\u30EA\u30A2"
      ],
      areas: [
        "02",
        "04",
        "05"
      ]
    },
    {
      id: "jr-hokkaido.senmo-main",
      keywords: [
        "\u91E7\u7DB2\u7DDA",
        "\u91E7\u7DB2\u672C\u7DDA",
        "\u9053\u6771\u30A8\u30EA\u30A2"
      ],
      areas: [
        "05"
      ]
    }
  ],
  excludeKeywords: [
    "\u9E7F",
    "\u4EBA\u8EAB",
    "\u4FE1\u53F7",
    "\u8ECA\u4E21",
    "\u7DDA\u8DEF\u652F\u969C",
    "\u5012\u6728",
    "\u70B9\u691C",
    "\u5DE5\u4E8B",
    "\u5730\u9707",
    "\u9AD8\u6F6E"
  ]
};

// lib/official-observation.ts
function classifyOfficialObservation(text, now = /* @__PURE__ */ new Date()) {
  let clean = text.replace(/<[^>]*>/g, " ").replace(/[\s　]+/g, "");
  const future = clean.search(/明日|あす|翌日|計画運休/);
  if (future >= 0) {
    const present = clean.slice(0, future);
    if (!/見合わせています|運休しています|遅れています/.test(present)) return "unknown";
    clean = present;
  }
  if (!clean) return "unknown";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
  const dated = [...clean.matchAll(/(\d{1,2})月(\d{1,2})日/g)].find((match) => `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}` !== today.slice(5));
  if (dated) {
    const present = clean.slice(0, dated.index);
    if (!/見合わせています|運休しています|遅れています/.test(present)) return "unknown";
    clean = present;
  }
  if (/運休(?:は|の予定は)?(?:ありません|しません)|見合わせ(?:は)?ありません/.test(clean)) return "unknown";
  const stopped = /運転(?:を)?見合|運休(?:が|して|とな|とし|します|です|となります)/.test(clean);
  const resumed = /再開(?:しました|いたしました|しています)|平常運転に戻|通常運転に戻/.test(clean);
  const futureRecovery = /再開.*(?:見込|予定)|(?:見込|予定).*再開/.test(clean);
  if (stopped && (futureRecovery || !resumed)) return "suspended";
  if (stopped && resumed) return "unknown";
  if (/遅れ(?:が|て|ています)|遅延(?:が|して)/.test(clean)) return "delayed";
  if (resumed || /通常通り(?:の)?運転|通常運転|平常運転|現在、?遅れに関する情報はありません/.test(clean)) return "normal";
  return "unknown";
}
function hasExplicitAreaAllClear(text) {
  return /現在[、,]?\s*遅れに関する情報はありません/.test(text) && !/運休|見合|遅れが/.test(text);
}
function specificRouteKeywords(keywords) {
  return keywords.filter((word) => !/エリア$|圏$/.test(word));
}
function officialPublishedAt(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  if (+hour > 23 || +minute > 59) return null;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const at = /* @__PURE__ */ new Date(`${date}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00+09:00`);
  if (!Number.isFinite(at.getTime()) || new Date(at.getTime() + 9 * 36e5).toISOString().slice(0, 10) !== date) return null;
  return at.toISOString();
}

// lib/jr-status.ts
var JR_JSON_URLS = crawler_config_default.areas;
var ROUTE_DEFINITIONS = crawler_config_default.routeMatching.map((rm) => ({
  name: rm.id.split(".").pop() === "chitose" ? "\u5343\u6B73\u7DDA" : rm.id.split(".").pop() === "hakodate-main" ? "\u51FD\u9928\u672C\u7DDA" : rm.id.split(".").pop() === "hakodate-south" ? "\u51FD\u9928\u672C\u7DDA\uFF08\u9053\u5357\uFF09" : rm.id.split(".").pop() === "gakuentoshi" ? "\u5B66\u5712\u90FD\u5E02\u7DDA" : rm.id.split(".").pop() === "muroran-main" ? "\u5BA4\u862D\u672C\u7DDA" : rm.id.split(".").pop() === "soya-main" ? "\u5B97\u8C37\u672C\u7DDA" : rm.id.split(".").pop() === "sekihoku-main" ? "\u77F3\u5317\u672C\u7DDA" : rm.id.split(".").pop() === "furano" ? "\u5BCC\u826F\u91CE\u7DDA" : rm.id.split(".").pop() === "rumoi" ? "\u7559\u840C\u672C\u7DDA" : rm.id.split(".").pop() === "hidaka" ? "\u65E5\u9AD8\u672C\u7DDA" : rm.id.split(".").pop() === "sekisho" ? "\u77F3\u52DD\u7DDA" : rm.id.split(".").pop() === "nemuro-main" ? "\u6839\u5BA4\u672C\u7DDA" : rm.id.split(".").pop() === "senmo-main" ? "\u91E7\u7DB2\u672C\u7DDA" : "\u5F53\u8A72\u8DEF\u7DDA",
  keywords: rm.keywords,
  routeId: rm.id === "jr-hokkaido.gakuentoshi" ? "jr-hokkaido.sassho" : rm.id,
  validAreas: rm.areas
}));
function extractNumericalStatus(text) {
  const result = {};
  const normalized = text.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248)).replace(/\s+/g, "");
  const delayMatch = normalized.match(/(\d+)分.*?(?:遅れ|遅延)/);
  if (delayMatch) {
    result.delayMinutes = parseInt(delayMatch[1]);
  }
  const recoveryMatch = normalized.match(/(\d{1,2})時(\d{1,2})分.*再開/);
  if (recoveryMatch) {
    const h = recoveryMatch[1].padStart(2, "0");
    const m = recoveryMatch[2].padStart(2, "0");
    result.recoveryTime = `${h}:${m}`;
  }
  return result;
}

// lib/crawler.ts
import crypto from "node:crypto";
var BASE_URL = "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_";
var OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
var EXCLUDE_KEYWORDS = ["\u9E7F", "\u4EBA\u8EAB", "\u4FE1\u53F7", "\u8ECA\u4E21", "\u7DDA\u8DEF\u652F\u969C", "\u5012\u6728", "\u70B9\u691C", "\u5DE5\u4E8B"];
var NULL_SNAPSHOT = {
  temperature: null,
  wind_speed: null,
  wind_gust: null,
  snowfall: null,
  precipitation: null,
  snow_depth: null,
  weather_code: null,
  wind_direction: null,
  pressure_msl: null,
  visibility: null
};
var WEATHER_TIMEOUT_MS = 8e3;
var WEATHER_RETRY_DELAYS_MS = [1500, 4e3];
async function fetchAreaWeather(areas, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const byArea = Object.fromEntries(areas.map((a) => [a.id, { ...NULL_SNAPSHOT }]));
  const attempts = [];
  if (areas.length === 0) return { byArea, attempts };
  const params = new URLSearchParams({
    latitude: areas.map((a) => a.lat).join(","),
    longitude: areas.map((a) => a.lon).join(","),
    current: [
      "temperature_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
      "snowfall",
      "precipitation",
      "snow_depth",
      "weather_code",
      "wind_direction_10m",
      "pressure_msl"
    ].join(","),
    timezone: "Asia/Tokyo",
    wind_speed_unit: "kmh"
    // Legacy training store uses km/h; never mix with m/s prediction inputs.
  });
  const url = `${OPEN_METEO_URL}?${params}`;
  for (let i = 0; i <= WEATHER_RETRY_DELAYS_MS.length; i++) {
    let retryable = false;
    try {
      const res = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
      if (!res.ok) {
        attempts.push({ status: res.status, retryAfter: res.headers.get("retry-after") });
        retryable = res.status === 429 || res.status >= 500;
      } else {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [data];
        if (list.length !== areas.length) {
          attempts.push({ status: res.status, error: `location count mismatch: ${list.length}/${areas.length}` });
          break;
        }
        const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
        areas.forEach((area, idx) => {
          const payload = list[idx];
          const current = payload?.current;
          if (!current) return;
          byArea[area.id] = {
            temperature: current.temperature_2m ?? null,
            wind_speed: current.wind_speed_10m ?? null,
            wind_gust: current.wind_gusts_10m ?? null,
            snowfall: current.snowfall ?? null,
            precipitation: current.precipitation ?? null,
            snow_depth: current.snow_depth ?? null,
            weather_code: current.weather_code ?? null,
            wind_direction: current.wind_direction_10m ?? null,
            pressure_msl: current.pressure_msl ?? null,
            visibility: null,
            // Open-Meteo current does not include visibility.
            evidence: { url, fetchedAt, kind: "model-current-15min", payload }
          };
        });
        attempts.push({ status: res.status });
        return { byArea, attempts };
      }
    } catch (e) {
      const name = e?.name;
      attempts.push({ error: name === "TimeoutError" || name === "AbortError" ? "timeout" : String(e?.message ?? e).slice(0, 200) });
      retryable = true;
    }
    if (!retryable || i === WEATHER_RETRY_DELAYS_MS.length) break;
    await sleep(WEATHER_RETRY_DELAYS_MS[i]);
  }
  logger.warn("Weather snapshot fetch failed", { attempts });
  return { byArea, attempts };
}
var EXTRA_SOURCES = [
  { id: "map", url: "https://www3.jrhokkaido.co.jp/webunkou/json/map/eikyo_map_status.json", kind: "json" },
  ...["011000", "012000", "013000", "014030", "014100", "015000", "016000", "017000"].map((code) => ({ id: `jma:${code}`, url: `https://www.jma.go.jp/bosai/warning/data/r8/${code}.json`, kind: "json" })),
  { id: "bus:chuo", url: "https://www.chuo-bus.co.jp/support/stop/?ope=feed&topic=stop_top", kind: "text" }
];
async function collectExtras(supabase, fetchImpl = fetch) {
  const out = {};
  await Promise.all(EXTRA_SOURCES.map(async (src) => {
    try {
      const res = await fetchImpl(src.url, { cache: "no-store", signal: AbortSignal.timeout(6e3) });
      if (!res.ok) {
        out[src.id] = `error: HTTP ${res.status}`;
        return;
      }
      const text = (await res.text()).replace(/^\uFEFF/, "");
      const payload = src.kind === "json" ? JSON.parse(text) : { text };
      const hash = hashContent(src.kind === "json" ? JSON.stringify(payload) : text);
      const { data: last } = await supabase.from("crawler_logs").select("content_hash").eq("area_id", src.id).order("fetched_at", { ascending: false }).limit(1);
      if (last?.[0]?.content_hash === hash) {
        out[src.id] = "unchanged";
        return;
      }
      const { error } = await supabase.from("crawler_logs").insert({
        area_id: src.id,
        raw_json: payload,
        content_hash: hash,
        status: "success",
        source_url: src.url,
        collector_version: "extras-v1"
      });
      out[src.id] = error ? `error: ${error.message}`.slice(0, 120) : "saved";
    } catch (e) {
      out[src.id] = `error: ${e?.name === "TimeoutError" ? "timeout" : String(e?.message ?? e)}`.slice(0, 120);
    }
  }));
  return out;
}
function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex");
}
async function runJRCrawler() {
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    logger.error("\u274C Supabase ADMIN client not available");
    return { success: false, error: "Supabase configuration missing" };
  }
  logger.info("\u{1F680} Starting JR Hokkaido Crawler (ML Enhanced)...");
  const now = /* @__PURE__ */ new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const month = jstNow.getMonth() + 1;
  const hour = jstNow.getHours();
  const dayOfWeek = jstNow.getDay();
  const date = `${jstNow.getFullYear()}-${String(month).padStart(2, "0")}-${String(jstNow.getDate()).padStart(2, "0")}`;
  const time = jstNow.toLocaleTimeString("en-US", { hour12: false });
  const results = [];
  const areaConfigs = crawler_config_default.areas;
  const { byArea: weatherByArea, attempts: weatherAttempts } = await fetchAreaWeather(areaConfigs);
  const mlBatch = [];
  const areaResults = await Promise.allSettled(JR_JSON_URLS.map(async (area) => {
    const url = `${BASE_URL}${area.id}.json`;
    const areaML = [];
    let savedCount = 0;
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5e3)
      // Explicit 5s timeout
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const json = JSON.parse(text.replace(/^\uFEFF/, ""));
    const contentHash = hashContent(JSON.stringify(json));
    const { data: logData, error: logError } = await supabase.from("crawler_logs").insert({
      area_id: area.id,
      raw_json: json,
      // Keep independently replayable provenance for every collected observation.
      content_hash: contentHash,
      status: "success",
      source_url: url,
      collector_version: "verified-source-v3.1",
      weather_snapshot: weatherByArea[area.id]?.evidence ?? null
    }).select("id").single();
    if (logError) {
      logger.error(`\u274C Failed to log for ${area.name}:`, logError);
      throw new Error(`Provenance logging failed for area ${area.id}`);
    }
    const published = officialPublishedAt(json.time);
    if (!published || now.getTime() - Date.parse(published) > 24 * 36e5 || Date.parse(published) > now.getTime() + 5 * 6e4) {
      return { area: area.name, saved: 0, ml: areaML, labelStatus: "stale-or-unverifiable" };
    }
    const gaikyoList = json.today?.gaikyo || [];
    const weather = weatherByArea[area.id];
    const routesWithStatus = /* @__PURE__ */ new Set();
    const routesIgnored = /* @__PURE__ */ new Set();
    const mkMlRow = (routeId, status, cause, details, delayMin, recTime) => ({
      recorded_at: now.toISOString(),
      area_id: area.id,
      route_id: routeId,
      train_status: status,
      delay_minutes: delayMin ?? null,
      recovery_time: recTime ?? null,
      cause,
      status_details: details?.substring(0, 500) ?? null,
      temperature: weather.temperature,
      wind_speed: weather.wind_speed,
      wind_gust: weather.wind_gust,
      snowfall: weather.snowfall,
      precipitation: weather.precipitation,
      snow_depth: weather.snow_depth,
      weather_code: weather.weather_code,
      wind_direction: weather.wind_direction,
      pressure_msl: weather.pressure_msl,
      visibility: weather.visibility,
      crawler_log_id: logData.id,
      month,
      hour,
      day_of_week: dayOfWeek
    });
    const statusInserts = [];
    for (const item of gaikyoList) {
      const content = (item.honbun || "") + (item.title || "");
      if (!content) continue;
      let matchedRouteId = null;
      const matches = ROUTE_DEFINITIONS.filter((def) => (!def.validAreas || def.validAreas.includes(area.id)) && specificRouteKeywords(def.keywords).some((kw) => content.includes(kw)));
      if (matches.length !== 1) {
        for (const def of matches) routesIgnored.add(def.routeId);
        continue;
      }
      for (const def of matches) {
        if (def.validAreas && !def.validAreas.includes(area.id)) continue;
        if (specificRouteKeywords(def.keywords).some((kw) => content.includes(kw))) {
          matchedRouteId = def.routeId;
          break;
        }
      }
      if (!matchedRouteId) continue;
      if (EXCLUDE_KEYWORDS.some((kw) => content.includes(kw))) {
        routesIgnored.add(matchedRouteId);
        continue;
      }
      routesWithStatus.add(matchedRouteId);
      const status = classifyOfficialObservation(content);
      if (status === "unknown") {
        routesIgnored.add(matchedRouteId);
        continue;
      }
      let cause = "unknown";
      if (content.includes("\u96EA")) cause = "snow";
      else if (content.includes("\u98A8")) cause = "wind";
      else if (content.includes("\u96E8")) cause = "rain";
      const { delayMinutes, recoveryTime } = extractNumericalStatus(content);
      statusInserts.push({
        date,
        time,
        route_id: matchedRouteId,
        status,
        cause,
        details: content,
        crawler_log_id: logData.id
      });
      areaML.push(mkMlRow(matchedRouteId, status, cause, content, delayMinutes, recoveryTime));
    }
    if (statusInserts.length > 0) {
      const { error: batchErr } = await supabase.from("route_status_history").insert(statusInserts);
      if (batchErr) {
        logger.error(`Failed to batch insert statuses for ${area.name}:`, batchErr);
        throw new Error(`History write failed for area ${area.id}`);
      } else {
        savedCount = statusInserts.length;
      }
    }
    const explicitAllClear = gaikyoList.length > 0 && gaikyoList.every((item) => hasExplicitAreaAllClear(item.honbun || ""));
    const areaRoutes = ROUTE_DEFINITIONS.filter((r) => r.validAreas?.includes(area.id));
    for (const route of areaRoutes) {
      if (explicitAllClear && !routesWithStatus.has(route.routeId) && !routesIgnored.has(route.routeId)) {
        areaML.push(mkMlRow(route.routeId, "normal", null, "\u73FE\u5728\u3001\u9045\u308C\u306B\u95A2\u3059\u308B\u60C5\u5831\u306F\u3042\u308A\u307E\u305B\u3093\u3002", void 0, void 0));
      }
    }
    return { area: area.name, saved: savedCount, ml: areaML };
  }));
  for (let i = 0; i < areaResults.length; i++) {
    const r = areaResults[i];
    if (r.status === "fulfilled") {
      results.push({ area: r.value.area, saved: r.value.saved });
      mlBatch.push(...r.value.ml);
    } else {
      const area = JR_JSON_URLS[i];
      logger.error(`\u274C Error fetching ${area.name}:`, r.reason);
      try {
        await supabase.from("crawler_logs").insert({
          area_id: area.id,
          raw_json: {},
          status: "error",
          error_message: String(r.reason)
        });
      } catch {
      }
      results.push({ area: area.name, saved: 0 });
    }
  }
  let mlResult = { inserted: 0 };
  if (mlBatch.length > 0) {
    logger.info(`[ML] Attempting batch insert: ${mlBatch.length} rows`);
    const { error: mlBatchErr } = await supabase.from("ml_training_data").insert(mlBatch);
    if (mlBatchErr) {
      logger.error(`[ML] Batch insert FAILED: ${mlBatchErr.message}`, { code: mlBatchErr.code, details: mlBatchErr.details });
      mlResult = { inserted: 0, error: mlBatchErr.message };
    } else {
      logger.info(`[ML] \u2705 ${mlBatch.length} rows inserted`);
      mlResult = { inserted: mlBatch.length };
    }
  }
  logger.info("\u{1F3C1} Crawler finished (ML Enhanced).", { results });
  const extras = await collectExtras(supabase).catch((e) => ({ all: `error: ${String(e)}`.slice(0, 120) }));
  const weatherMissing = areaConfigs.filter((area) => !weatherByArea[area.id]?.evidence).map((area) => area.id);
  return { success: areaResults.every((r) => r.status === "fulfilled") && !mlResult.error && weatherMissing.length === 0, results, ml: mlResult, weatherMissing, weatherAttempts, extras };
}

// scripts/edge/entry.mjs
Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const key = req.headers.get("x-collector-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const client2 = getAdminSupabaseClient();
  const { data: claim, error } = await client2.rpc("claim_rail_collection", { provided_secret: key });
  if (error) return Response.json({ error: "Collection authorization unavailable" }, { status: 503 });
  if (claim === "unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (claim === "busy") return Response.json({ success: true, skipped: "Already collected in this interval" });
  if (!claim) return Response.json({ error: "Collection claim unavailable" }, { status: 503 });
  await client2.from("rail_collection_runs").update({ finished_at: (/* @__PURE__ */ new Date()).toISOString(), status: "error", summary: { success: false, error: "abandoned: no finish record within 30 minutes" } }).eq("status", "running").lt("started_at", new Date(Date.now() - 30 * 6e4).toISOString()).neq("id", claim);
  let result;
  let timer;
  const limit = new Promise((r) => {
    timer = setTimeout(() => r({ success: false, error: "timeout: collector exceeded 45s" }), 45e3);
  });
  try {
    result = await Promise.race([runJRCrawler(), limit]);
  } catch (e) {
    result = { success: false, error: "Collector failed: " + String(e?.message ?? e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
  const { error: writeError } = await client2.from("rail_collection_runs").update({ finished_at: (/* @__PURE__ */ new Date()).toISOString(), status: result.success ? "success" : "error", summary: result }).eq("id", claim);
  return Response.json({ ...result, runId: claim }, { status: result.success && !writeError ? 200 : 503 });
});
