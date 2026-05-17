export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
};

export type FoodEntry = MacroTotals & {
  id: string;
  name: string;
  timestamp: string;
  barcode?: string;
  imageUrl?: string;
  servingSize?: string;
  amountGrams: number;
  unit: "g" | "oz";
  // Stored so history can re-log with a new amount
  per100g: MacroTotals;
};

export type FoodTemplate = {
  key: string; // stable identifier for recents/frequents
  name: string;
  barcode?: string;
  imageUrl?: string;
  servingSize?: string;
  per100g: MacroTotals;
  lastUsedAt: string;
  uses: number;
};

export type UserProfile = {
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
  currentWeight: number;
  weightGoal: number;
  updatedAt: string;
};

type StorageShape = {
  profile: UserProfile;
  logs: Record<string, { totals: MacroTotals; entries: FoodEntry[] }>;
  templates: Record<string, FoodTemplate>;
};

const STORAGE_KEY = "nutristack:v1";

const nowIso = () => new Date().toISOString();
export const todayKey = () => new Date().toISOString().split("T")[0];

const defaultProfile = (): UserProfile => ({
  calorieTarget: 2500,
  macroTargets: { protein: 180, carbs: 250, fat: 80 },
  currentWeight: 80,
  weightGoal: 85,
  updatedAt: nowIso(),
});

const safeParse = (raw: string | null): StorageShape | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readAll = (): StorageShape => {
  const existing = safeParse(localStorage.getItem(STORAGE_KEY));
  if (existing?.profile && existing?.logs && existing?.templates) return existing;
  return { profile: defaultProfile(), logs: {}, templates: {} };
};

const writeAll = (next: StorageShape) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const getProfile = (): UserProfile => readAll().profile;

export const setProfile = (update: Partial<UserProfile>) => {
  const data = readAll();
  data.profile = { ...data.profile, ...update, updatedAt: nowIso() };
  writeAll(data);
  return data.profile;
};

export const getDailyLog = (date = todayKey()): { totals: MacroTotals; entries: FoodEntry[] } => {
  const data = readAll();
  const log = data.logs[date];
  if (log?.totals && Array.isArray(log.entries)) return log;
  const empty = { totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodiumMg: 0 }, entries: [] as FoodEntry[] };
  data.logs[date] = empty;
  writeAll(data);
  return empty;
};

const randomId = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

const templateKeyFor = (t: { name: string; barcode?: string }) => {
  const normalizedName = t.name.trim().toLowerCase().replace(/\s+/g, " ");
  return t.barcode ? `bc:${t.barcode}` : `nm:${normalizedName}`;
};

const scaleFromPer100g = (per100g: MacroTotals, grams: number): MacroTotals => {
  const m = Math.max(0, grams) / 100;
  return {
    calories: (per100g.calories || 0) * m,
    protein: (per100g.protein || 0) * m,
    carbs: (per100g.carbs || 0) * m,
    fat: (per100g.fat || 0) * m,
    fiber: (per100g.fiber || 0) * m,
    sugar: (per100g.sugar || 0) * m,
    sodiumMg: (per100g.sodiumMg || 0) * m,
  };
};

export const computeMacrosForAmount = (per100g: MacroTotals, amount: number, unit: "g" | "oz"): MacroTotals => {
  const grams = unit === "oz" ? amount * 28.3495 : amount;
  return scaleFromPer100g(per100g, grams);
};

export const upsertTemplate = (t: Omit<FoodTemplate, "key" | "lastUsedAt" | "uses"> & { key?: string }) => {
  const data = readAll();
  const key = t.key || templateKeyFor({ name: t.name, barcode: t.barcode });
  const existing = data.templates[key];
  const next: FoodTemplate = {
    key,
    name: t.name,
    barcode: t.barcode,
    imageUrl: t.imageUrl,
    servingSize: t.servingSize,
    per100g: t.per100g,
    lastUsedAt: nowIso(),
    uses: (existing?.uses || 0) + 1,
  };
  data.templates[key] = next;
  writeAll(data);
  return next;
};

export const listRecentTemplates = (limit = 30): FoodTemplate[] => {
  const data = readAll();
  return Object.values(data.templates)
    .sort((a, b) => (a.lastUsedAt > b.lastUsedAt ? -1 : 1))
    .slice(0, limit);
};

export const listFrequentTemplates = (limit = 30): FoodTemplate[] => {
  const data = readAll();
  return Object.values(data.templates)
    .sort((a, b) => (b.uses || 0) - (a.uses || 0))
    .slice(0, limit);
};

export const addEntryFromTemplate = (
  template: Pick<FoodTemplate, "name" | "barcode" | "imageUrl" | "servingSize" | "per100g">,
  amount: number,
  unit: "g" | "oz",
  date = todayKey()
) => {
  const data = readAll();
  const log = data.logs[date] || { totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodiumMg: 0 }, entries: [] as FoodEntry[] };

  const macros = computeMacrosForAmount(template.per100g, amount, unit);
  const entry: FoodEntry = {
    id: randomId(),
    timestamp: nowIso(),
    name: template.name,
    barcode: template.barcode,
    imageUrl: template.imageUrl,
    servingSize: template.servingSize,
    amountGrams: unit === "oz" ? amount * 28.3495 : amount,
    unit,
    per100g: template.per100g,
    ...macros,
  };

  log.entries = [entry, ...log.entries];
  log.totals = {
    calories: (log.totals.calories || 0) + (entry.calories || 0),
    protein: (log.totals.protein || 0) + (entry.protein || 0),
    carbs: (log.totals.carbs || 0) + (entry.carbs || 0),
    fat: (log.totals.fat || 0) + (entry.fat || 0),
    fiber: (log.totals.fiber || 0) + (entry.fiber || 0),
    sugar: (log.totals.sugar || 0) + (entry.sugar || 0),
    sodiumMg: (log.totals.sodiumMg || 0) + (entry.sodiumMg || 0),
  };

  data.logs[date] = log;
  writeAll(data);

  upsertTemplate({
    name: template.name,
    barcode: template.barcode,
    imageUrl: template.imageUrl,
    servingSize: template.servingSize,
    per100g: template.per100g,
  });

  return { totals: log.totals, entries: log.entries };
};

export const copyFromYesterday = (date = todayKey()) => {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.toISOString().split("T")[0];
  const yesterday = getDailyLog(y);
  if (!yesterday.entries.length) return getDailyLog(date);

  // Copy entries in reverse so order roughly matches original when inserted to top
  for (const e of [...yesterday.entries].reverse()) {
    addEntryFromTemplate(
      { name: e.name, barcode: e.barcode, imageUrl: e.imageUrl, servingSize: e.servingSize, per100g: e.per100g },
      e.unit === "oz" ? e.amountGrams / 28.3495 : e.amountGrams,
      e.unit,
      date
    );
  }
  return getDailyLog(date);
};

// Backward-compatible helper for older callers: assumes per100g macros and logs 100g.
export const addEntry = (entry: Omit<FoodEntry, "id" | "timestamp" | "amountGrams" | "unit" | "per100g"> & { per100g?: MacroTotals }, date = todayKey()) => {
  const per100g: MacroTotals = entry.per100g || {
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
    sugar: entry.sugar,
    sodiumMg: entry.sodiumMg,
  };
  return addEntryFromTemplate(
    { name: entry.name, barcode: entry.barcode, imageUrl: entry.imageUrl, servingSize: entry.servingSize, per100g },
    100,
    "g",
    date
  );
};
  const data = readAll();
  const log = data.logs[date] || { totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodiumMg: 0 }, entries: [] as FoodEntry[] };

  const nextEntry: FoodEntry = { ...entry, id: randomId(), timestamp: nowIso() };
  log.entries = [nextEntry, ...log.entries];
  log.totals = {
    calories: (log.totals.calories || 0) + (nextEntry.calories || 0),
    protein: (log.totals.protein || 0) + (nextEntry.protein || 0),
    carbs: (log.totals.carbs || 0) + (nextEntry.carbs || 0),
    fat: (log.totals.fat || 0) + (nextEntry.fat || 0),
    fiber: (log.totals.fiber || 0) + (nextEntry.fiber || 0),
    sugar: (log.totals.sugar || 0) + (nextEntry.sugar || 0),
    sodiumMg: (log.totals.sodiumMg || 0) + (nextEntry.sodiumMg || 0),
  };

  data.logs[date] = log;
  writeAll(data);
  return { totals: log.totals, entries: log.entries };
};

export const clearLocalCache = () => {
  localStorage.removeItem(STORAGE_KEY);
};
