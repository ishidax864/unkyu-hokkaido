var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// scripts/edge/logger.mjs
var logger;
var init_logger = __esm({
  "scripts/edge/logger.mjs"() {
    logger = { info: (message) => console.info(message), warn: (message) => console.warn(message), error: (message) => console.error(message), debug: () => {
    } };
  }
});

// scripts/edge/client.mjs
import { createClient } from "npm:@supabase/supabase-js@2.93.3";
var client;
function getAdminSupabaseClient() {
  return client ??= createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

// lib/jr-status.ts
init_logger();

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
  let clean2 = text.replace(/<[^>]*>/g, " ").replace(/[\s　]+/g, "");
  const future = clean2.search(/明日|あす|翌日|計画運休/);
  if (future >= 0) {
    const present = clean2.slice(0, future);
    if (!/見合わせています|運休しています|遅れています/.test(present)) return "unknown";
    clean2 = present;
  }
  if (!clean2) return "unknown";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
  const dated = [...clean2.matchAll(/(\d{1,2})月(\d{1,2})日/g)].find((match) => `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}` !== today.slice(5));
  if (dated) {
    const present = clean2.slice(0, dated.index);
    if (!/見合わせています|運休しています|遅れています/.test(present)) return "unknown";
    clean2 = present;
  }
  if (/運休(?:は|の予定は)?(?:ありません|しません)|見合わせ(?:は)?ありません/.test(clean2)) return "unknown";
  const stopped = /運転(?:を)?見合|運休(?:が|して|とな|とし|します|です|となります)/.test(clean2);
  const resumed = /再開(?:しました|いたしました|しています)|平常運転に戻|通常運転に戻/.test(clean2);
  const futureRecovery = /再開.*(?:見込|予定)|(?:見込|予定).*再開/.test(clean2);
  if (stopped && (futureRecovery || !resumed)) return "suspended";
  if (stopped && resumed) return "unknown";
  if (/遅れ(?:が|て|ています)|遅延(?:が|して)/.test(clean2)) return "delayed";
  if (resumed || /通常通り(?:の)?運転|通常運転|平常運転|現在、?遅れに関する情報はありません/.test(clean2)) return "normal";
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
init_logger();
import crypto from "node:crypto";

// lib/registry/units.ts
var JR_AREAS = {
  "01": { code: "spo", name: "\u672D\u5E4C\u8FD1\u90CA" },
  "02": { code: "doo", name: "\u9053\u592E" },
  "03": { code: "donan", name: "\u9053\u5357" },
  "04": { code: "dohoku", name: "\u9053\u5317" },
  "05": { code: "doto", name: "\u9053\u6771" }
};
var JR_AREA_IDS = Object.keys(JR_AREAS);
var STATUS_UNITS = [
  { senku: "01", area: "01", key: "express", name: "\u7279\u6025\u5217\u8ECA" },
  { senku: "02", area: "01", key: "airport", name: "\u30A8\u30A2\u30DD\u30FC\u30C8" },
  { senku: "03", area: "01", key: "hakochise", name: "\u51FD\u9928\u30FB\u5343\u6B73\u7DDA" },
  { senku: "04", area: "01", key: "gakuen", name: "\u5B66\u5712\u90FD\u5E02\u7DDA" },
  { senku: "05", area: "02", key: "express", name: "\u7279\u6025\u5217\u8ECA" },
  { senku: "06", area: "02", key: "airport", name: "\u30A8\u30A2\u30DD\u30FC\u30C8" },
  { senku: "07", area: "02", key: "hakochise", name: "\u51FD\u9928\u30FB\u5343\u6B73\u7DDA" },
  { senku: "08", area: "02", key: "gakuen", name: "\u5B66\u5712\u90FD\u5E02\u7DDA" },
  { senku: "09", area: "02", key: "muroran", name: "\u5BA4\u862D\u7DDA" },
  { senku: "10", area: "02", key: "hidaka", name: "\u65E5\u9AD8\u7DDA" },
  { senku: "11", area: "03", key: "express", name: "\u7279\u6025\u5217\u8ECA" },
  { senku: "12", area: "03", key: "hakodateLiner", name: "\u306F\u3053\u3060\u3066\u30E9\u30A4\u30CA\u30FC" },
  { senku: "13", area: "03", key: "hakodate", name: "\u51FD\u9928\u7DDA" },
  { senku: "14", area: "04", key: "express", name: "\u7279\u6025\u5217\u8ECA" },
  { senku: "15", area: "04", key: "soya", name: "\u5B97\u8C37\u7DDA" },
  { senku: "16", area: "04", key: "sekihoku", name: "\u77F3\u5317\u7DDA" },
  { senku: "17", area: "04", key: "furano", name: "\u5BCC\u826F\u91CE\u7DDA" },
  { senku: "19", area: "05", key: "express", name: "\u7279\u6025\u5217\u8ECA" },
  { senku: "20", area: "05", key: "sekisho", name: "\u77F3\u52DD\u7DDA" },
  { senku: "21", area: "05", key: "nemuro", name: "\u6839\u5BA4\u7DDA" },
  { senku: "22", area: "05", key: "hanasaki", name: "\u6839\u5BA4\u7DDA\uFF08\u82B1\u54B2\u7DDA\uFF09" },
  { senku: "23", area: "05", key: "senmo", name: "\u91E7\u7DB2\u7DDA" }
];
var unitId = (u) => `${u.area}:${u.key}`;
var UNIT_BY_ID = new Map(STATUS_UNITS.map((u) => [unitId(u), u]));

// lib/sources/jr-feed.ts
var FEED_BASE = "https://www3.jrhokkaido.co.jp/webunkou/json/area/area_";
var feedUrl = (area) => `${FEED_BASE}${area}.json`;
var code = (v) => v === 0 ? "no-info" : v === 1 ? "disrupted" : v === 2 ? "off-hours" : "unknown";
function parseJstStamp(text) {
  if (typeof text !== "string") return null;
  const m = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 65248)).match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(\d{1,2})時\s*(\d{1,2})分/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  if (+h > 23 || +mi > 59) return null;
  const date = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const at = /* @__PURE__ */ new Date(`${date}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:00+09:00`);
  if (!Number.isFinite(at.getTime())) return null;
  if (new Date(at.getTime() + 9 * 36e5).toISOString().slice(0, 10) !== date) return null;
  return at.toISOString();
}
function resolveDateText(dateText, referenceIso) {
  if (typeof dateText !== "string" || !referenceIso) return null;
  const m = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const ref = new Date(Date.parse(referenceIso) + 9 * 36e5);
  const month = +m[1], day = +m[2];
  let year = ref.getUTCFullYear();
  const refMonth = ref.getUTCMonth() + 1;
  if (refMonth === 12 && month === 1) year += 1;
  if (refMonth === 1 && month === 12) year -= 1;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const check = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  return check.getUTCMonth() + 1 === month && check.getUTCDate() === day ? iso : null;
}
var clean = (html) => typeof html === "string" ? html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t　]+/g, " ").replace(/ *\n */g, "\n").trim() : "";
var NO_INFO_TEXT = /^現在、?遅れに関する情報はありません。?$/;
function parseDay(block, publishedAt) {
  const b = block && typeof block === "object" ? block : {};
  const units = {};
  for (const [k, v] of Object.entries(b.senkuStatus ?? {})) units[k] = code(v);
  const areas = {};
  for (const [k, v] of Object.entries(b.areaStatus ?? {})) areas[k] = code(v);
  const notices = [];
  for (const g of Array.isArray(b.gaikyo) ? b.gaikyo : []) {
    const item = g ?? {};
    const body = clean(item.honbun);
    const title = clean(item.title).replace(/^【|】$/g, "");
    if (!body && !title) continue;
    if (!title && NO_INFO_TEXT.test(body)) continue;
    const eikyo = item.eikyo ?? {};
    notices.push({
      publishedAt: parseJstStamp(item.time),
      title,
      body,
      affectedAreas: Object.entries(eikyo).filter(([, v]) => v === 1).map(([k]) => k)
    });
  }
  const comments = (Array.isArray(b.areaComments) ? b.areaComments : []).map((c) => clean(c?.comment)).filter(Boolean);
  return { date: resolveDateText(b.dateText, publishedAt), units, areas, notices, comments };
}
function parseAreaFeed(raw, area, fetchedAt) {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data.replace(/^﻿/, ""));
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const d = data;
  if (!d.today || typeof d.today !== "object") return null;
  const publishedAt = parseJstStamp(d.time);
  return { area, url: feedUrl(area), publishedAt, fetchedAt, today: parseDay(d.today, publishedAt), tomorrow: parseDay(d.tomorrow, publishedAt) };
}

// lib/registry/lines.ts
var P = {
  sapporo: { name: "\u672D\u5E4C", lat: 43.0621, lon: 141.3544 },
  otaru: { name: "\u5C0F\u6A3D", lat: 43.2, lon: 140.9833 },
  iwamizawa: { name: "\u5CA9\u898B\u6CA2", lat: 43.3333, lon: 141.9167 },
  chitose: { name: "\u5343\u6B73", lat: 42.7752, lon: 141.6922 },
  ishikariTobetsu: { name: "\u77F3\u72E9\u5F53\u5225", lat: 43.2167, lon: 141.35 },
  kutchan: { name: "\u5036\u77E5\u5B89", lat: 42.9, lon: 140.75 },
  takikawa: { name: "\u6EDD\u5DDD", lat: 43.5552, lon: 141.908 },
  asahikawa: { name: "\u65ED\u5DDD", lat: 43.7628, lon: 142.3587 },
  muroran: { name: "\u5BA4\u862D", lat: 42.315, lon: 140.9736 },
  tomakomai: { name: "\u82EB\u5C0F\u7267", lat: 42.6333, lon: 141.6 },
  mukawa: { name: "\u9D61\u5DDD", lat: 42.5747, lon: 141.9265 },
  hakodate: { name: "\u51FD\u9928", lat: 41.7686, lon: 140.7289 },
  oshamambe: { name: "\u9577\u4E07\u90E8", lat: 42.5, lon: 140.2333 },
  shinHakodate: { name: "\u65B0\u51FD\u9928\u5317\u6597", lat: 41.9048, lon: 140.6481 },
  wakkanai: { name: "\u7A1A\u5185", lat: 45.4167, lon: 141.6833 },
  nayoro: { name: "\u540D\u5BC4", lat: 44.35, lon: 142.3833 },
  kitami: { name: "\u5317\u898B", lat: 43.8, lon: 143.9 },
  kamikawa: { name: "\u4E0A\u5DDD\uFF08\u767D\u6EDD\uFF09", lat: 43.7706, lon: 142.365 },
  furano: { name: "\u5BCC\u826F\u91CE", lat: 43.35, lon: 142.3833 },
  shimukappu: { name: "\u5360\u51A0", lat: 43, lon: 142.75 },
  obihiro: { name: "\u5E2F\u5E83", lat: 42.92, lon: 143.2 },
  kushiro: { name: "\u91E7\u8DEF", lat: 42.9849, lon: 144.3816 },
  nemuro: { name: "\u6839\u5BA4", lat: 43.3304, lon: 145.5826 },
  abashiri: { name: "\u7DB2\u8D70", lat: 44.02, lon: 144.27 }
};
var LINES = [
  {
    slug: "airport",
    keywords: ["\u30A8\u30A2\u30DD\u30FC\u30C8"],
    name: "\u5FEB\u901F\u30A8\u30A2\u30DD\u30FC\u30C8",
    note: "\u5C0F\u6A3D\u30FB\u672D\u5E4C\u301C\u65B0\u5343\u6B73\u7A7A\u6E2F",
    region: "\u672D\u5E4C\u570F",
    units: ["01:airport", "02:airport"],
    routeIds: ["jr-hokkaido.chitose", "jr-hokkaido.hakodate-main"],
    weatherPoints: [P.sapporo, P.otaru, P.chitose]
  },
  {
    slug: "sapporo-hakodate-chitose",
    keywords: ["\u51FD\u9928\u7DDA", "\u5343\u6B73\u7DDA"],
    name: "\u51FD\u9928\u7DDA\u30FB\u5343\u6B73\u7DDA",
    note: "\u672D\u5E4C\u8FD1\u90CA\uFF08\u5C0F\u6A3D\u301C\u5CA9\u898B\u6CA2\u30FB\u672D\u5E4C\u301C\u82EB\u5C0F\u7267\uFF09",
    region: "\u672D\u5E4C\u570F",
    units: ["01:hakochise"],
    routeIds: ["jr-hokkaido.hakodate-main", "jr-hokkaido.chitose"],
    weatherPoints: [P.sapporo, P.otaru, P.iwamizawa, P.chitose]
  },
  {
    slug: "gakuen-toshi",
    keywords: ["\u5B66\u5712\u90FD\u5E02\u7DDA", "\u672D\u6CBC\u7DDA"],
    name: "\u5B66\u5712\u90FD\u5E02\u7DDA",
    note: "\u672D\u5E4C\u301C\u5317\u6D77\u9053\u533B\u7642\u5927\u5B66",
    region: "\u672D\u5E4C\u570F",
    units: ["01:gakuen", "02:gakuen"],
    routeIds: ["jr-hokkaido.sassho", "jr-hokkaido.gakuentoshi"],
    weatherPoints: [P.ishikariTobetsu]
  },
  {
    slug: "doo-hakodate-chitose",
    keywords: ["\u51FD\u9928\u7DDA", "\u5343\u6B73\u7DDA"],
    name: "\u51FD\u9928\u7DDA\u30FB\u5343\u6B73\u7DDA",
    note: "\u9053\u592E\uFF08\u9577\u4E07\u90E8\u301C\u5C0F\u6A3D\u30FB\u5CA9\u898B\u6CA2\u301C\u65ED\u5DDD\u307B\u304B\uFF09",
    region: "\u9053\u592E",
    units: ["02:hakochise"],
    routeIds: ["jr-hokkaido.hakodate-main", "jr-hokkaido.chitose"],
    weatherPoints: [P.otaru, P.kutchan, P.iwamizawa, P.takikawa, P.asahikawa, P.chitose]
  },
  {
    slug: "muroran",
    keywords: ["\u5BA4\u862D\u7DDA", "\u3059\u305A\u3089\u3093"],
    name: "\u5BA4\u862D\u7DDA",
    note: "\u9577\u4E07\u90E8\u301C\u6771\u5BA4\u862D\u301C\u82EB\u5C0F\u7267\u301C\u5CA9\u898B\u6CA2",
    region: "\u9053\u592E",
    units: ["02:muroran"],
    routeIds: ["jr-hokkaido.muroran-main"],
    weatherPoints: [P.muroran, P.tomakomai]
  },
  {
    slug: "hidaka",
    keywords: ["\u65E5\u9AD8\u7DDA"],
    name: "\u65E5\u9AD8\u7DDA",
    note: "\u82EB\u5C0F\u7267\u301C\u9D61\u5DDD",
    region: "\u9053\u592E",
    units: ["02:hidaka"],
    routeIds: ["jr-hokkaido.hidaka"],
    weatherPoints: [P.tomakomai, P.mukawa]
  },
  {
    slug: "hakodate-liner",
    keywords: ["\u306F\u3053\u3060\u3066\u30E9\u30A4\u30CA\u30FC"],
    name: "\u306F\u3053\u3060\u3066\u30E9\u30A4\u30CA\u30FC",
    note: "\u51FD\u9928\u301C\u65B0\u51FD\u9928\u5317\u6597",
    region: "\u9053\u5357",
    units: ["03:hakodateLiner"],
    routeIds: ["jr-hokkaido.hakodate-south"],
    weatherPoints: [P.hakodate, P.shinHakodate]
  },
  {
    slug: "donan-hakodate",
    keywords: ["\u51FD\u9928\u7DDA"],
    name: "\u51FD\u9928\u7DDA",
    note: "\u9053\u5357\uFF08\u51FD\u9928\u301C\u9577\u4E07\u90E8\uFF09",
    region: "\u9053\u5357",
    units: ["03:hakodate"],
    routeIds: ["jr-hokkaido.hakodate-south"],
    weatherPoints: [P.hakodate, P.oshamambe]
  },
  {
    slug: "soya",
    keywords: ["\u5B97\u8C37\u7DDA", "\u30B5\u30ED\u30D9\u30C4", "\u7279\u6025\u5B97\u8C37"],
    name: "\u5B97\u8C37\u7DDA",
    note: "\u65ED\u5DDD\u301C\u7A1A\u5185",
    region: "\u9053\u5317",
    units: ["04:soya"],
    routeIds: ["jr-hokkaido.soya-main"],
    weatherPoints: [P.wakkanai, P.nayoro]
  },
  {
    slug: "sekihoku",
    keywords: ["\u77F3\u5317\u7DDA", "\u30AA\u30DB\u30FC\u30C4\u30AF", "\u7279\u6025\u5927\u96EA"],
    name: "\u77F3\u5317\u7DDA",
    note: "\u65B0\u65ED\u5DDD\u301C\u7DB2\u8D70",
    region: "\u9053\u5317",
    units: ["04:sekihoku"],
    routeIds: ["jr-hokkaido.sekihoku-main"],
    weatherPoints: [P.kitami, P.kamikawa]
  },
  {
    slug: "furano",
    keywords: ["\u5BCC\u826F\u91CE\u7DDA"],
    name: "\u5BCC\u826F\u91CE\u7DDA",
    note: "\u65ED\u5DDD\u301C\u5BCC\u826F\u91CE",
    region: "\u9053\u5317",
    units: ["04:furano"],
    routeIds: ["jr-hokkaido.furano"],
    weatherPoints: [P.furano]
  },
  {
    slug: "sekisho",
    keywords: ["\u77F3\u52DD\u7DDA", "\u304A\u304A\u305E\u3089", "\u3068\u304B\u3061"],
    name: "\u77F3\u52DD\u7DDA",
    note: "\u5357\u5343\u6B73\u301C\u65B0\u5F97",
    region: "\u9053\u6771",
    units: ["05:sekisho"],
    routeIds: ["jr-hokkaido.sekisho"],
    weatherPoints: [P.shimukappu, P.obihiro]
  },
  {
    slug: "nemuro",
    keywords: ["\u6839\u5BA4\u7DDA", "\u304A\u304A\u305E\u3089", "\u3068\u304B\u3061"],
    name: "\u6839\u5BA4\u7DDA",
    note: "\u6EDD\u5DDD\u301C\u5BCC\u826F\u91CE\u30FB\u65B0\u5F97\u301C\u91E7\u8DEF",
    region: "\u9053\u6771",
    units: ["05:nemuro"],
    routeIds: ["jr-hokkaido.nemuro-main"],
    weatherPoints: [P.obihiro, P.kushiro]
  },
  {
    slug: "hanasaki",
    keywords: ["\u82B1\u54B2\u7DDA"],
    name: "\u82B1\u54B2\u7DDA",
    note: "\u91E7\u8DEF\u301C\u6839\u5BA4",
    region: "\u9053\u6771",
    units: ["05:hanasaki"],
    routeIds: ["jr-hokkaido.nemuro-main"],
    weatherPoints: [P.kushiro, P.nemuro]
  },
  {
    slug: "senmo",
    keywords: ["\u91E7\u7DB2\u7DDA"],
    name: "\u91E7\u7DB2\u7DDA",
    note: "\u6771\u91E7\u8DEF\u301C\u7DB2\u8D70",
    region: "\u9053\u6771",
    units: ["05:senmo"],
    routeIds: ["jr-hokkaido.senmo-main"],
    weatherPoints: [P.abashiri, P.kushiro]
  },
  {
    slug: "express",
    keywords: ["\u7279\u6025"],
    name: "\u7279\u6025\u5217\u8ECA",
    note: "\u5317\u6597\u30FB\u30E9\u30A4\u30E9\u30C3\u30AF\u30FB\u30AB\u30E0\u30A4\u30FB\u5B97\u8C37\u30FB\u30AA\u30DB\u30FC\u30C4\u30AF\u30FB\u304A\u304A\u305E\u3089\u30FB\u3068\u304B\u3061 \u307B\u304B",
    region: "\u9053\u592E",
    units: ["01:express", "02:express", "03:express", "04:express", "05:express"],
    routeIds: [],
    weatherPoints: []
  },
  {
    slug: "shinkansen",
    keywords: ["\u65B0\u5E79\u7DDA"],
    name: "\u5317\u6D77\u9053\u65B0\u5E79\u7DDA",
    note: "\u65B0\u51FD\u9928\u5317\u6597\u301C\u65B0\u9752\u68EE",
    region: "\u65B0\u5E79\u7DDA",
    units: [],
    shinkansen: true,
    routeIds: [],
    weatherPoints: [P.shinHakodate]
  }
];
var LINE_BY_SLUG = new Map(LINES.map((l) => [l.slug, l]));

// lib/engine/episodes.ts
function classifyCause(title, body = "") {
  const pick = (t) => /鹿|熊|動物/.test(t) ? "animal" : /地震|津波/.test(t) ? "quake" : /大雪|降雪|吹雪|暴風雪|除雪|雪/.test(t) ? "snow" : /強風|暴風|風/.test(t) ? "wind" : /大雨|降雨|雨|増水|冠水/.test(t) ? "rain" : /踏切/.test(t) ? "crossing" : /人身|線路内.{0,6}(人|立ち入)|お客様|急病|体調/.test(t) ? "person" : /倒木|盛土|土砂|落石|線路.{0,4}(支障|確認)/.test(t) ? "track" : /車両|信号|架線|設備|ポイント|停電|不具合|故障|空転|装置|ビニール/.test(t) ? "equipment" : null;
  return pick(title) ?? pick(body.slice(0, 120)) ?? "other";
}
var MAX_GAP = 65 * 6e4;
var keywordsOf = (unit) => {
  const key = unit.split(":")[1];
  return key === "express" ? ["\u7279\u6025"] : [...new Set(LINES.filter((l) => l.units.includes(unit)).flatMap((l) => l.keywords))];
};
function episodesOfUnit(unit, series) {
  const out = [];
  let cur = null;
  let prev = null;
  const close = (end, outcome, endKnown) => {
    if (!cur) return;
    const [title, body] = [...cur.titles.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? ["", ""];
    out.push({ unit, cause: classifyCause(title, body), title, onset: cur.onset, end, onsetKnown: cur.onsetKnown, outcome, endKnown });
    cur = null;
  };
  for (const o of series) {
    const gap = prev ? o.at - prev.at : Infinity;
    if (cur && gap > MAX_GAP) close(cur.last, "gap", false);
    if (o.code === 1) {
      if (!cur) cur = { onset: o.at, last: o.at, onsetKnown: !!prev && prev.code === 0 && gap <= MAX_GAP, titles: /* @__PURE__ */ new Map() };
      cur.last = o.at;
      if (o.title && !cur.titles.has(o.title)) cur.titles.set(o.title, o.body);
    } else if (cur) {
      if (o.code === 0) close(o.at, "resumed", true);
      else close(cur.last, "off-hours", false);
    }
    prev = o;
  }
  if (cur) close(cur.last, "open", false);
  return out;
}
function seriesFromLogs(rows) {
  const series = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!(r.area_id in JR_AREAS)) continue;
    const feed = parseAreaFeed(r.raw_json, r.area_id, r.fetched_at);
    if (!feed) continue;
    const published = feed.publishedAt ? Date.parse(feed.publishedAt) : NaN;
    const fetched = Date.parse(r.fetched_at);
    if (!Number.isFinite(published) || fetched - published > 30 * 6e4) continue;
    for (const [key, c] of Object.entries(feed.today.units)) {
      const unit = `${feed.area}:${key}`;
      const code2 = c === "no-info" ? 0 : c === "disrupted" ? 1 : c === "off-hours" ? 2 : null;
      if (code2 === null) continue;
      const words = keywordsOf(unit);
      const areaCode = JR_AREAS[feed.area].code;
      const inArea = feed.today.notices.filter((n) => !n.affectedAreas.length || n.affectedAreas.includes(areaCode));
      const notice = code2 === 1 ? inArea.find((n) => words.some((w) => (n.title + n.body).includes(w))) ?? (inArea.length === 1 ? inArea[0] : void 0) : void 0;
      if (!series.has(unit)) series.set(unit, []);
      series.get(unit).push({ at: published, code: code2, title: notice?.title ?? "", body: notice?.body ?? "" });
    }
  }
  for (const s of series.values()) s.sort((a, b) => a.at - b.at);
  return series;
}

// lib/weather.ts
init_logger();

// lib/jma-warnings.ts
init_logger();

// lib/weather.ts
var ROUTE_COORDINATES = {
  // 札幌近郊
  "jr-hokkaido.hakodate-main": [
    { lat: 43.0621, lon: 141.3544, name: "\u672D\u5E4C" },
    { lat: 43.2, lon: 140.9833, name: "\u5C0F\u6A3D" },
    { lat: 43.3333, lon: 141.9167, name: "\u5CA9\u898B\u6CA2" }
  ],
  "jr-hokkaido.chitose": [
    { lat: 42.7752, lon: 141.6922, name: "\u5343\u6B73" }
  ],
  "jr-hokkaido.sassho": [
    { lat: 43.2167, lon: 141.35, name: "\u77F3\u72E9\u5F53\u5225" }
  ],
  // 道央
  "jr-hokkaido.muroran-main": [
    { lat: 42.315, lon: 140.9736, name: "\u5BA4\u862D" },
    { lat: 42.6333, lon: 141.6, name: "\u82EB\u5C0F\u7267" }
  ],
  "jr-hokkaido.hidaka": [
    { lat: 42.4833, lon: 142.05, name: "\u65E5\u9AD8\u9580\u5225" }
  ],
  // 道南
  "jr-hokkaido.hakodate-south": [
    { lat: 41.7686, lon: 140.7289, name: "\u51FD\u9928" },
    { lat: 42.5, lon: 140.2333, name: "\u9577\u4E07\u90E8" }
  ],
  // 道北
  "jr-hokkaido.soya-main": [
    { lat: 45.4167, lon: 141.6833, name: "\u7A1A\u5185" },
    { lat: 44.35, lon: 142.3833, name: "\u540D\u5BC4" }
  ],
  "jr-hokkaido.rumoi": [
    { lat: 43.95, lon: 141.6333, name: "\u7559\u840C" }
  ],
  // 道東
  "jr-hokkaido.sekihoku-main": [
    { lat: 43.8, lon: 143.9, name: "\u5317\u898B" },
    { lat: 43.7706, lon: 142.365, name: "\u4E0A\u5DDD\uFF08\u767D\u6EDD\uFF09" }
  ],
  "jr-hokkaido.senmo-main": [
    { lat: 44.02, lon: 144.27, name: "\u7DB2\u8D70" },
    { lat: 42.9849, lon: 144.3816, name: "\u91E7\u8DEF" }
  ],
  "jr-hokkaido.nemuro-main": [
    { lat: 42.92, lon: 143.2, name: "\u5E2F\u5E83" },
    { lat: 42.9849, lon: 144.3816, name: "\u91E7\u8DEF" }
  ],
  "jr-hokkaido.furano": [
    { lat: 43.35, lon: 142.3833, name: "\u5BCC\u826F\u91CE" }
  ],
  "jr-hokkaido.sekisho": [
    { lat: 43, lon: 142.75, name: "\u5360\u51A0" },
    { lat: 42.92, lon: 143.2, name: "\u5E2F\u5E83" }
  ]
};
var STALE_WEATHER_MAX_MS = 6 * 36e5;
var HOURLY_VARS = "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snow_depth,weather_code,snowfall,winddirection_10m,pressure_msl";
var FORECAST_CACHE_ID = "wx:forecast";
var DB_FRESH_MS = 60 * 6e4;

// lib/weather-points.ts
function allWeatherPoints() {
  const all = [...LINES.flatMap((l) => l.weatherPoints), ...Object.values(ROUTE_COORDINATES).flat()];
  return all.filter((p, i) => all.findIndex((q) => q.lat === p.lat && q.lon === p.lon) === i).map((p) => ({ lat: p.lat, lon: p.lon }));
}

// lib/crawler.ts
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
  ...["011000", "012000", "013000", "014030", "014100", "015000", "016000", "017000"].map((code2) => ({ id: `jma:${code2}`, url: `https://www.jma.go.jp/bosai/warning/data/r8/${code2}.json`, kind: "json" })),
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
async function cacheForecast(supabase, fetchImpl = fetch) {
  const points = allWeatherPoints();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => p.lat).join(",")}&longitude=${points.map((p) => p.lon).join(",")}&hourly=${HOURLY_VARS}&timezone=Asia/Tokyo&wind_speed_unit=ms&forecast_days=7&past_days=1`;
  let last = "no attempt";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(9e3) });
      if (!res.ok) {
        last = `HTTP ${res.status}`;
        if (res.status !== 429 && res.status < 500) break;
      } else {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [data];
        if (list.length !== points.length) {
          last = "location count mismatch";
          break;
        }
        const payload = { fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), points: points.map((p, j) => ({ ...p, hourly: list[j].hourly })) };
        const { data: existing } = await supabase.from("crawler_logs").select("id").eq("area_id", FORECAST_CACHE_ID).order("fetched_at", { ascending: false }).limit(1);
        const row = { area_id: FORECAST_CACHE_ID, raw_json: payload, status: "success", source_url: "https://api.open-meteo.com/v1/forecast", collector_version: "forecast-cache-v1", fetched_at: payload.fetchedAt };
        const { error } = existing?.[0]?.id ? await supabase.from("crawler_logs").update(row).eq("id", existing[0].id) : await supabase.from("crawler_logs").insert(row);
        return error ? `error: ${error.message}`.slice(0, 120) : `saved ${points.length} points`;
      }
    } catch (e) {
      last = e?.name === "TimeoutError" ? "timeout" : String(e?.message ?? e).slice(0, 80);
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return `error: ${last}`;
}
async function recordEpisodes(supabase, now = /* @__PURE__ */ new Date()) {
  const since = new Date(now.getTime() - 30 * 36e5).toISOString();
  const { data, error } = await supabase.from("crawler_logs").select("fetched_at,area_id,raw_json").gte("fetched_at", since).in("area_id", ["01", "02", "03", "04", "05"]).not("raw_json", "is", null).order("fetched_at").limit(1e3);
  if (error || !data) return `error: ${error?.message ?? "no data"}`.slice(0, 120);
  const rows = [];
  for (const [unit, series] of seriesFromLogs(data)) for (const e of episodesOfUnit(unit, series)) {
    if (!e.onsetKnown || e.outcome !== "resumed" && e.outcome !== "off-hours") continue;
    const area = unit.split(":")[0];
    const url = `${BASE_URL}${area}.json`;
    rows.push({
      route_id: unit,
      cause: e.cause,
      started_at: new Date(e.onset).toISOString(),
      resumed_at: e.outcome === "resumed" ? new Date(e.end).toISOString() : null,
      start_source_url: url,
      resumption_source_url: e.outcome === "resumed" ? url : `censored:off-hours:${new Date(e.end).toISOString()}`,
      verified: false
    });
  }
  if (!rows.length) return "none";
  const { error: writeError } = await supabase.from("verified_recovery_incidents").upsert(rows, { onConflict: "route_id,started_at", ignoreDuplicates: true });
  return writeError ? `error: ${writeError.message}`.slice(0, 120) : `checked ${rows.length}`;
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
  const forecast = await cacheForecast(supabase).catch((e) => `error: ${String(e)}`.slice(0, 120));
  const episodes = await recordEpisodes(supabase, now).catch((e) => `error: ${String(e)}`.slice(0, 120));
  const weatherMissing = areaConfigs.filter((area) => !weatherByArea[area.id]?.evidence).map((area) => area.id);
  return { success: areaResults.every((r) => r.status === "fulfilled") && !mlResult.error && weatherMissing.length === 0, results, ml: mlResult, weatherMissing, weatherAttempts, extras, episodes, forecast };
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
