import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Search, User as UserIcon, Barcode, ChevronRight, Plus, Flame, Target, Pizza } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzePhoto, getNutritionFromBarcode, NutritionData, searchOpenFoodFacts } from "./services/foodService";
import {
  addEntryFromTemplate,
  clearLocalCache,
  computeMacrosForAmount,
  copyFromYesterday,
  FoodTemplate,
  getDailyLog,
  getProfile,
  listFrequentTemplates,
  listRecentTemplates,
  setProfile,
  todayKey,
} from "./lib/storage";

const formatNum = (n: number | undefined) => (Number.isFinite(Number(n)) ? Number(n).toFixed(0) : "0");

const FoodLogModal = ({
  open,
  title,
  template,
  initialAmount,
  initialUnit,
  onClose,
  onLog,
}: {
  open: boolean;
  title: string;
  template: { name: string; barcode?: string; imageUrl?: string; servingSize?: string; per100g: any };
  initialAmount?: number;
  initialUnit?: "g" | "oz";
  onClose: () => void;
  onLog: (amount: number, unit: "g" | "oz") => void;
}) => {
  const [amount, setAmount] = useState<number>(initialAmount ?? 100);
  const [unit, setUnit] = useState<"g" | "oz">(initialUnit ?? "g");

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount ?? 100);
    setUnit(initialUnit ?? "g");
  }, [open, initialAmount, initialUnit]);

  const macros = computeMacrosForAmount(template.per100g, amount || 0, unit);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className="relative w-full max-w-xl hud-panel p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            <h3 className="mt-2 text-white font-black uppercase tracking-tight truncate">{template.name}</h3>
            <p className="mt-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Based on 100g estimates • Adjust grams/oz to log
            </p>
          </div>
          {template.imageUrl ? (
            <img src={template.imageUrl} className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Pizza className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Calories</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.calories)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Protein</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.protein)}g</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Carbs</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.carbs)}g</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Fat</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.fat)}g</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Fiber</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.fiber)}g</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sodium</p>
            <p className="font-mono font-black text-white tabular-nums">{formatNum(macros.sodiumMg)}mg</p>
          </div>
        </div>

        <div className="mt-5 flex items-stretch gap-3">
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-mono font-black text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all"
            />
          </div>
          <div className="w-40">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Unit</label>
            <div className="grid grid-cols-2 gap-2 h-[56px]">
              <button
                onClick={() => setUnit("g")}
                className={`rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-colors ${
                  unit === "g" ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                g
              </button>
              <button
                onClick={() => setUnit("oz")}
                className={`rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-colors ${
                  unit === "oz" ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                oz
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-200 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onLog(amount || 0, unit)}
            className="flex-1 py-4 bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-500/20 transition-all"
          >
            Log Food
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Header = ({
  profile,
  onOpenProfile,
}: {
  profile: ReturnType<typeof getProfile>;
  onOpenProfile: () => void;
}) => (
  <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50 gap-4">
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_20px_rgba(16,185,129,0.25)]">
        N
      </div>
      <div>
        <h1 className="text-xl font-black tracking-tight text-white">
          NutriStack <span className="text-slate-400 font-normal">Local</span>
        </h1>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest leading-none">Status: Training Session</p>
      </div>
    </div>

    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
      <div className="text-right hidden md:block">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Body Weight</p>
        <p className="text-lg font-mono font-bold leading-tight text-white">
          {profile.currentWeight} <span className="text-xs font-normal text-slate-400">kg</span>
        </p>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Target</p>
        <p className="text-lg font-mono font-bold text-emerald-400 leading-tight">
          {profile.weightGoal} <span className="text-xs font-normal text-slate-400">kg</span>
        </p>
      </div>

      <button onClick={onOpenProfile} className="flex items-center gap-3 pl-4 border-l border-white/10">
        <div className="text-right sr-only sm:not-sr-only">
          <p className="text-xs font-bold text-white leading-none">Player</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
          <UserIcon className="w-5 h-5" />
        </div>
      </button>
    </div>
  </header>
);

const CalorieIndicator = ({ consumed, target }: { consumed: number; target: number }) => {
  const left = Math.max(target - consumed, 0);
  const percent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto mb-8">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          cx="96"
          cy="96"
          r="88"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          className="text-emerald-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-mono font-bold tracking-tighter text-white">{left.toLocaleString()}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fuel Left</p>
      </div>
    </div>
  );
};

const MacroBar = ({
  label,
  value,
  target,
  color,
  subColor,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  subColor: string;
}) => {
  const percent = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5 align-baseline">
        <span className={`font-black uppercase tracking-tight ${subColor}`}>{label}</span>
        <span className="font-mono font-bold text-white">
          {Math.round(value)}g / {target}g
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full ${color}`} />
      </div>
    </div>
  );
};

export default function App() {
  const isBarcodeDetectorSupported = useMemo(() => typeof (window as any).BarcodeDetector !== "undefined", []);
  const isLikelyBarcode = (value: string) => /^\d{8,14}$/.test(value.trim());

  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "scanner" | "profile">("dashboard");
  const [scannerMode, setScannerMode] = useState<"food" | "barcode">("food");

  const [profile, setProfileState] = useState(getProfile());
  const [dailyLog, setDailyLog] = useState(() => getDailyLog(todayKey()).totals);
  const [entries, setEntries] = useState(() => getDailyLog(todayKey()).entries);
  const [recentTemplates, setRecentTemplates] = useState<FoodTemplate[]>(() => listRecentTemplates(12));
  const [frequentTemplates, setFrequentTemplates] = useState<FoodTemplate[]>(() => listFrequentTemplates(12));
  const [quickListMode, setQuickListMode] = useState<"recent" | "frequent">("recent");

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalTitle, setLogModalTitle] = useState("Log Food");
  const [logModalTemplate, setLogModalTemplate] = useState<{
    name: string;
    barcode?: string;
    imageUrl?: string;
    servingSize?: string;
    per100g: any;
  } | null>(null);
  const [logModalInitialAmount, setLogModalInitialAmount] = useState<number>(100);
  const [logModalInitialUnit, setLogModalInitialUnit] = useState<"g" | "oz">("g");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NutritionData[]>([]);

  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const [barcodeStatus, setBarcodeStatus] = useState<string | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<NutritionData | null>(null);
  const [isBarcodeCameraActive, setIsBarcodeCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [profileCalTarget, setProfileCalTarget] = useState(profile.calorieTarget);
  const [profileProtein, setProfileProtein] = useState(profile.macroTargets.protein);
  const [profileCarbs, setProfileCarbs] = useState(profile.macroTargets.carbs);
  const [profileFat, setProfileFat] = useState(profile.macroTargets.fat);

  useEffect(() => {
    setProfileCalTarget(profile.calorieTarget);
    setProfileProtein(profile.macroTargets.protein);
    setProfileCarbs(profile.macroTargets.carbs);
    setProfileFat(profile.macroTargets.fat);
  }, [profile]);

  const refreshLocal = () => {
    setProfileState(getProfile());
    const log = getDailyLog(todayKey());
    setDailyLog(log.totals);
    setEntries(log.entries);
    setRecentTemplates(listRecentTemplates(12));
    setFrequentTemplates(listFrequentTemplates(12));
  };

  const openLogModalFromNutrition = (food: NutritionData, title = "Log Food", initialAmount = 100, initialUnit: "g" | "oz" = "g") => {
    setLogModalTitle(title);
    setLogModalTemplate({
      name: food.name,
      barcode: food.barcode,
      imageUrl: food.imageUrl,
      servingSize: food.servingSize,
      per100g: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodiumMg: food.sodiumMg,
      },
    });
    setLogModalInitialAmount(initialAmount);
    setLogModalInitialUnit(initialUnit);
    setLogModalOpen(true);
  };

  const openLogModalFromTemplate = (t: FoodTemplate, title = "Log Food") => {
    setLogModalTitle(title);
    setLogModalTemplate({ name: t.name, barcode: t.barcode, imageUrl: t.imageUrl, servingSize: t.servingSize, per100g: t.per100g });
    setLogModalInitialAmount(100);
    setLogModalInitialUnit("g");
    setLogModalOpen(true);
  };

  const commitLogFromModal = (amount: number, unit: "g" | "oz") => {
    if (!logModalTemplate) return;
    const next = addEntryFromTemplate(logModalTemplate, amount, unit);
    setDailyLog(next.totals);
    setEntries(next.entries);
    setRecentTemplates(listRecentTemplates(12));
    setFrequentTemplates(listFrequentTemplates(12));
    setLogModalOpen(false);
    setActiveTab("dashboard");
    setSearchQuery("");
    setSearchResults([]);
    setBarcodeResult(null);
    setBarcodeStatus(null);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (isLikelyBarcode(q)) {
      const item = await getNutritionFromBarcode(q);
      setSearchResults(item ? [item] : []);
      return;
    }
    const results = await searchOpenFoodFacts(q);
    setSearchResults(results);
  };

  const handleFoodPhoto = async (file: File) => {
    setAnalyzeLoading(true);
    try {
      const result = await analyzePhoto(file);
      setSearchResults(result.items || []);
      setActiveTab("search");
    } catch (e: any) {
      alert(e?.message || "Failed to analyze image.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const stopBarcodeCamera = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setIsBarcodeCameraActive(false);
    setBarcodeStatus(null);
  };

  useEffect(() => {
    if (activeTab !== "scanner" || scannerMode !== "barcode") stopBarcodeCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scannerMode]);

  const startBarcodeCamera = async () => {
    if (!isBarcodeDetectorSupported) {
      setBarcodeStatus("Barcode scanning is not supported in this browser.");
      return;
    }
    setBarcodeStatus("Starting camera…");
    setBarcodeResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } as any },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      setBarcodeStatus("Scanning…");
      setIsBarcodeCameraActive(true);
      scanTimerRef.current = window.setInterval(async () => {
        try {
          const v = videoRef.current;
          if (!v) return;
          const found = await detector.detect(v);
          const raw = found?.[0]?.rawValue;
          if (!raw) return;
          if (!isLikelyBarcode(raw)) return;
          setBarcodeStatus(`Detected: ${raw}`);
          const item = await getNutritionFromBarcode(raw);
          if (item) {
            setBarcodeResult(item);
            openLogModalFromNutrition(item, "Log Barcode", 100, "g");
          }
          stopBarcodeCamera();
        } catch {
          // ignore frame errors
        }
      }, 450);
    } catch {
      setBarcodeStatus("Camera permission denied or unavailable.");
      stopBarcodeCamera();
    }
  };

  const decodeBarcodeFromImageFile = async (file: File) => {
    if (!isBarcodeDetectorSupported) {
      setBarcodeStatus("Barcode scanning is not supported in this browser.");
      return;
    }
    setBarcodeResult(null);
    setBarcodeStatus("Reading barcode…");
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      const bitmap = await createImageBitmap(file);
      const found = await detector.detect(bitmap);
      const raw = found?.[0]?.rawValue;
      if (!raw) {
        setBarcodeStatus("No barcode detected in that image.");
        return;
      }
      if (!isLikelyBarcode(raw)) {
        setBarcodeStatus(`Detected value isn't a supported barcode: ${raw}`);
        return;
      }
      setBarcodeStatus(`Detected: ${raw}`);
      const item = await getNutritionFromBarcode(raw);
      setBarcodeResult(item);
      if (item) openLogModalFromNutrition(item, "Log Barcode", 100, "g");
      if (!item) setBarcodeStatus(`Found barcode ${raw}, but no product matched.`);
    } catch {
      setBarcodeStatus("Could not read that barcode image.");
    }
  };

  const saveProfileTargets = () => {
    const next = setProfile({
      calorieTarget: Number(profileCalTarget) || 0,
      macroTargets: {
        protein: Number(profileProtein) || 0,
        carbs: Number(profileCarbs) || 0,
        fat: Number(profileFat) || 0,
      },
    });
    setProfileState(next);
  };

  const showVisionSetup = () => {
    alert("To use Vision Scan on Netlify, set GEMINI_API_KEY in your Netlify site environment variables.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header profile={profile} onOpenProfile={() => setActiveTab("profile")} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 overflow-hidden">
        <FoodLogModal
          open={logModalOpen && !!logModalTemplate}
          title={logModalTitle}
          template={logModalTemplate || { name: "", per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 } }}
          initialAmount={logModalInitialAmount}
          initialUnit={logModalInitialUnit}
          onClose={() => setLogModalOpen(false)}
          onLog={commitLogFromModal}
        />
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full"
            >
              <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
                <div className="hud-panel p-6 flex flex-col">
                  <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center justify-between tracking-widest">
                    Daily Summary <span className="text-white/10">● ● ●</span>
                  </h2>

                  <CalorieIndicator consumed={dailyLog.calories || 0} target={profile.calorieTarget} />

                  <div className="space-y-6">
                    <MacroBar
                      label="Strength (Protein)"
                      value={dailyLog.protein || 0}
                      target={profile.macroTargets.protein}
                      color="bg-sky-400"
                      subColor="text-sky-300"
                    />
                    <MacroBar
                      label="Energy (Carbs)"
                      value={dailyLog.carbs || 0}
                      target={profile.macroTargets.carbs}
                      color="bg-amber-400"
                      subColor="text-amber-300"
                    />
                    <MacroBar
                      label="Armor (Fats)"
                      value={dailyLog.fat || 0}
                      target={profile.macroTargets.fat}
                      color="bg-rose-400"
                      subColor="text-rose-300"
                    />
                  </div>

                  <div className="mt-8 grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Fiber</p>
                      <p className="font-mono font-black text-white tabular-nums">
                        {Math.round(dailyLog.fiber || 0)}
                        <span className="text-slate-400 font-normal">g</span>
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sugar</p>
                      <p className="font-mono font-black text-white tabular-nums">
                        {Math.round(dailyLog.sugar || 0)}
                        <span className="text-slate-400 font-normal">g</span>
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sodium</p>
                      <p className="font-mono font-black text-white tabular-nums">
                        {Math.round(dailyLog.sodiumMg || 0)}
                        <span className="text-slate-400 font-normal">mg</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hud-panel p-5 text-slate-400 hidden md:block">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Training Console</h3>
                  <div className="font-mono text-[10px] space-y-2">
                    <p className="flex items-center gap-2">
                      <span className="text-emerald-500">✔</span> Storage: Local Sync Active
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-emerald-500">✔</span> OFF: Online Lookup Ready
                    </p>
                    <p className="flex items-center gap-2"><span className="text-emerald-500">●</span> Vision: Server Key</p>
                    <div className="pt-2 border-t border-slate-800">
                      <p>Total Entries Today: {entries.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-5 hud-panel overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                  <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Match Log</h2>
                  <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 rounded text-[9px] font-black uppercase tracking-tighter border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-400 border-b border-white/10 font-mono">
                        <th className="px-4 py-3 font-bold">Source</th>
                        <th className="px-4 py-3 font-bold">Food Item</th>
                        <th className="px-4 py-3 text-right font-bold">Cals</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-white/5 font-mono">
                      {entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-white/5 group border-b border-white/5 cursor-pointer"
                          onClick={() =>
                            openLogModalFromTemplate(
                              {
                                key: "tmp",
                                name: entry.name,
                                barcode: entry.barcode,
                                imageUrl: entry.imageUrl,
                                servingSize: entry.servingSize,
                                per100g: entry.per100g || {
                                  calories: entry.calories,
                                  protein: entry.protein,
                                  carbs: entry.carbs,
                                  fat: entry.fat,
                                  fiber: entry.fiber,
                                  sugar: entry.sugar,
                                  sodiumMg: entry.sodiumMg,
                                },
                                lastUsedAt: entry.timestamp,
                                uses: 0,
                              },
                              "Log Again"
                            )
                          }
                        >
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                entry.barcode
                                  ? "bg-sky-500/15 text-sky-300 border-sky-500/20"
                                  : entry.imageUrl
                                  ? "bg-purple-500/15 text-purple-300 border-purple-500/20"
                                  : "bg-white/5 text-slate-300 border-white/10"
                              }`}
                            >
                              {entry.barcode ? "BARCODE" : entry.imageUrl ? "AI VISION" : "MANUAL"}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="font-bold text-white group-hover:text-emerald-300 transition-colors uppercase tracking-tighter truncate max-w-[150px]">
                              {entry.name}
                            </div>
                            <div className="text-[10px] text-slate-400 tracking-tighter">
                              @ {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white tabular-nums align-middle">{Math.round(entry.calories)}</td>
                        </tr>
                      ))}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-20 text-center text-slate-500 font-mono text-[10px] uppercase italic">
                            -- no entries logged today --
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Total:</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {Math.round(dailyLog.calories || 0)} / {profile.calorieTarget} kcal
                  </span>
                </div>
              </div>

              <div className="col-span-1 md:col-span-3 flex flex-col gap-4">
                <div className="hud-panel p-5 text-white flex flex-col gap-3 hud-glow">
                  <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Core Commands</h3>
                  <button
                    onClick={() => {
                      setScannerMode("food");
                      setActiveTab("scanner");
                    }}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-colors group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">📸</span>
                    <div className="text-left leading-tight">
                      <p className="text-sm font-bold">Vision Scan</p>
                      <p className="text-[10px] opacity-70 font-medium">Analyze plate photo</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab("search")} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-colors group">
                    <span className="text-xl group-hover:scale-110 transition-transform">🤳</span>
                    <div className="text-left leading-tight">
                      <p className="text-sm font-bold">Manual Search</p>
                      <p className="text-[10px] opacity-70 font-medium">Browse OFF Library</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setScannerMode("barcode");
                      setActiveTab("scanner");
                    }}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-colors group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🏷️</span>
                    <div className="text-left leading-tight">
                      <p className="text-sm font-bold">Barcode Scan</p>
                      <p className="text-[10px] opacity-70 font-medium">Camera or image</p>
                    </div>
                  </button>
                </div>

                <div className="hud-panel p-5 flex-1">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Library Pulse</h3>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Quick Find..."
                      className="w-full pl-8 pr-4 py-2 bg-white/5 rounded-lg text-xs font-bold border border-white/10 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400/40 transition-all text-white placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Search className="absolute left-2.5 top-2.5 text-slate-500 w-3.5 h-3.5" />
                  </div>
	                  <div className="space-y-1 max-h-[200px] overflow-auto pr-1">
	                    {searchResults.slice(0, 5).map((food, i) => (
                      <div
                        key={i}
                        onClick={() => openLogModalFromNutrition(food, "Quick Log", 100, "g")}
                        className="p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer group flex justify-between items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white line-clamp-1 uppercase tracking-tight">{food.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono tracking-tighter">
                            {food.calories} cal / {food.servingSize || "100g"}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono tracking-tighter">
                            P{Math.round(food.protein)} C{Math.round(food.carbs)} F{Math.round(food.fat)}
                            {typeof food.fiber === "number" ? ` • Fi ${Math.round(food.fiber)}` : ""}
                          </p>
                        </div>
                        <Plus className="w-3 h-3 text-slate-600 group-hover:text-emerald-400" />
                      </div>
                    ))}
                    {searchResults.length === 0 && !searchQuery && (
                      <p className="text-center py-4 text-[10px] text-slate-600 font-mono uppercase italic leading-tight">Enter search terms to populate buffer</p>
                    )}
	                  </div>
	                </div>

                <div className="hud-panel p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quick Replay</h3>
                    <button
                      onClick={() => {
                        copyFromYesterday();
                        refreshLocal();
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      Copy Yesterday
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setQuickListMode("recent")}
                      className={`py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors border ${
                        quickListMode === "recent"
                          ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setQuickListMode("frequent")}
                      className={`py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors border ${
                        quickListMode === "frequent"
                          ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      Frequent
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 max-h-[240px] overflow-auto pr-1">
                    {(quickListMode === "recent" ? recentTemplates : frequentTemplates).slice(0, 12).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => openLogModalFromTemplate(t, "Quick Log")}
                        className="w-full text-left p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {t.imageUrl ? (
                            <img src={t.imageUrl} className="w-10 h-10 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
                              <Pizza className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">{t.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono tracking-tighter">
                              P{Math.round(t.per100g.protein || 0)} C{Math.round(t.per100g.carbs || 0)} F{Math.round(t.per100g.fat || 0)} • per 100g
                            </p>
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-400 tabular-nums">
                            {Math.round(t.per100g.calories || 0)} kcal
                          </div>
                        </div>
                      </button>
                    ))}
                    {(quickListMode === "recent" ? recentTemplates : frequentTemplates).length === 0 && (
                      <p className="text-center py-6 text-[10px] text-slate-600 font-mono uppercase italic leading-tight">
                        Log something to build your replay list
                      </p>
                    )}
                  </div>
                </div>

                <button onClick={() => setActiveTab("profile")} className="hud-panel p-4 hover:border-emerald-400/40 transition-colors flex items-center justify-between group">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-300">Protocol Settings</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-300 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="hud-panel p-6 rounded-3xl">
                <h2 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em]">OpenFoodFacts Portal</h2>
                <div className="flex gap-3 items-stretch">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search food name… or paste barcode (digits)"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-2xl border border-white/10 font-bold text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all text-base placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                  >
                    Search
                  </button>
                </div>
                <p className="mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tip: Enter 12–13 digit UPC/EAN for instant lookup.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map((food, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i}
                    onClick={() => openLogModalFromNutrition(food, "Log Food", 100, "g")}
                    className="hud-panel p-4 flex items-center gap-4 hover:border-emerald-400/40 cursor-pointer transition-all active:scale-98 group"
                  >
                    <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                      {food.imageUrl ? <img src={food.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Pizza className="text-slate-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate uppercase tracking-tighter">{food.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono font-bold">
                        {food.calories} KCAL • {food.servingSize}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono font-bold">
                        P{Math.round(food.protein)} • C{Math.round(food.carbs)} • F{Math.round(food.fat)}
                        {typeof food.fiber === "number" ? ` • Fi ${Math.round(food.fiber)}` : ""}
                        {typeof food.sodiumMg === "number" ? ` • Na ${Math.round(food.sodiumMg)}mg` : ""}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-white/5 text-slate-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 group-hover:text-emerald-300 transition-colors border border-white/10">
                      <Plus className="w-5 h-5" />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <button onClick={() => setActiveTab("dashboard")} className="px-10 py-4 bg-white/5 border border-white/10 text-slate-200 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "scanner" && (
            <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto py-6 space-y-6">
              <div className="hud-panel p-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScannerMode("food")}
                  className={`py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-colors border ${
                    scannerMode === "food" ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Food Vision
                </button>
                <button
                  onClick={() => setScannerMode("barcode")}
                  className={`py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-colors border ${
                    scannerMode === "barcode" ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Barcode
                </button>
              </div>

              {scannerMode === "food" ? (
                <div className="hud-panel p-8 text-center space-y-6">
                  <div className="relative group mx-auto w-full max-w-md">
                    <div className="absolute -inset-4 bg-emerald-500/10 rounded-[42px] blur-2xl group-hover:bg-emerald-500/15 transition-all" />
                    <div className="w-full aspect-square border-2 border-white/10 border-dashed rounded-[36px] bg-white/5 flex flex-col items-center justify-center relative z-10 hover:border-emerald-400/40 transition-colors overflow-hidden">
                      {analyzeLoading ? (
                        <div className="flex flex-col items-center gap-6">
                          <div className="relative">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-20 h-20 border-[8px] border-emerald-500/10 border-t-emerald-400 rounded-full" />
                            <Flame className="absolute inset-0 m-auto text-emerald-400 w-8 h-8 animate-pulse" />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-black text-white tracking-[0.2em] uppercase">Processing Visuals</p>
                            <p className="font-mono text-[9px] text-slate-500 uppercase mt-2">Hold tight…</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center px-8">
                          <Camera className="w-12 h-12 text-slate-600" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">Drop a plate image to estimate macros + nutrients</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFoodPhoto(f);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">AI Visual Engine</h2>
                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">Meal scan → instant fuel log.</p>
                    <button
                      onClick={showVisionSetup}
                      className="mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      Vision Setup
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="hud-panel p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-white tracking-tight uppercase">Barcode Intake</h2>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2">Camera scan or upload a barcode image. Uses OpenFoodFacts.</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-slate-400">
                        <Barcode className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Loot ID</span>
                      </div>
                    </div>

                    {!isBarcodeDetectorSupported && (
                      <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-medium">
                        Barcode scanning isn’t supported in this browser. Use manual barcode entry in Search instead.
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Camera</p>
                        <p className="text-xs text-slate-300 mt-2">Point at an EAN/UPC barcode.</p>
                        <div className="mt-4 flex gap-2">
                          {!isBarcodeCameraActive ? (
                            <button
                              disabled={!isBarcodeDetectorSupported}
                              onClick={startBarcodeCamera}
                              className="flex-1 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                            >
                              Start
                            </button>
                          ) : (
                            <button
                              onClick={stopBarcodeCamera}
                              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                            >
                              Stop
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barcode Image</p>
                        <p className="text-xs text-slate-300 mt-2">Upload a photo/screenshot of the barcode.</p>
                        <div className="mt-4 relative">
                          <button
                            disabled={!isBarcodeDetectorSupported}
                            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-40"
                          >
                            Upload
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void decodeBarcodeFromImageFile(f);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {(barcodeStatus || isBarcodeCameraActive) && (
                      <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                        <p className="mt-2 font-mono text-xs text-slate-200">{barcodeStatus || (isBarcodeCameraActive ? "Scanning…" : "Idle")}</p>
                      </div>
                    )}

                    <div className={`mt-6 ${isBarcodeCameraActive ? "block" : "hidden"}`}>
                      <video ref={videoRef} muted playsInline className="w-full rounded-2xl border border-white/10 bg-black/40" />
                    </div>
                  </div>

                  {barcodeResult && (
                    <div className="hud-panel p-6 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detected Product</p>
                        <p className="text-white font-black uppercase tracking-tight truncate mt-2">{barcodeResult.name}</p>
                        <p className="text-slate-400 font-mono text-xs mt-2">
                          {barcodeResult.calories} kcal • P{barcodeResult.protein} C{barcodeResult.carbs} F{barcodeResult.fat}
                          {typeof barcodeResult.sodiumMg === "number" ? ` • Na ${barcodeResult.sodiumMg}mg` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => openLogModalFromNutrition(barcodeResult, "Log Barcode", 100, "g")}
                        className="shrink-0 px-6 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                      >
                        Portion & Log
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-2xl mx-auto space-y-6">
              <div className="hud-panel p-10 rounded-3xl flex flex-col items-center text-center space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_30px_rgba(16,185,129,0.22)] bg-white/5 flex items-center justify-center">
                    <Target className="w-8 h-8 text-emerald-300" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white leading-none">Player Profile</h2>
                  <p className="font-mono text-xs text-slate-500 mt-2 uppercase tracking-widest">Local-only build</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Weight</p>
                    <p className="text-3xl font-mono font-black text-white">
                      {profile.currentWeight} <span className="text-xs font-normal text-slate-500">kg</span>
                    </p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Goal</p>
                    <p className="text-3xl font-mono font-black text-emerald-300">
                      {profile.weightGoal} <span className="text-xs font-normal text-slate-500">kg</span>
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Daily Fuel Target (kcal)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={profileCalTarget}
                        onChange={(e) => setProfileCalTarget(Number(e.target.value))}
                        className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10 font-mono font-bold text-lg text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all"
                      />
                      <button onClick={saveProfileTargets} className="px-8 bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500/20 transition-colors">
                        Sync
                      </button>
                    </div>
                  </div>

                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Macro Targets (g)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={profileProtein}
                        onChange={(e) => setProfileProtein(Number(e.target.value))}
                        className="p-3 bg-white/5 rounded-xl border border-white/10 font-mono font-bold text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all"
                        placeholder="Protein"
                      />
                      <input
                        type="number"
                        value={profileCarbs}
                        onChange={(e) => setProfileCarbs(Number(e.target.value))}
                        className="p-3 bg-white/5 rounded-xl border border-white/10 font-mono font-bold text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all"
                        placeholder="Carbs"
                      />
                      <input
                        type="number"
                        value={profileFat}
                        onChange={(e) => setProfileFat(Number(e.target.value))}
                        className="p-3 bg-white/5 rounded-xl border border-white/10 font-mono font-bold text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400/40 transition-all"
                        placeholder="Fat"
                      />
                    </div>
                    <button onClick={saveProfileTargets} className="mt-3 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors">
                      Sync Macro Targets
                    </button>
                  </div>

                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Integrations</label>
                    <div className="hud-panel p-4 rounded-2xl">
                      <p className="text-xs text-slate-300">
                        Vision Scan runs server-side. In Netlify, add an environment variable named{" "}
                        <span className="font-mono">GEMINI_API_KEY</span>.
                      </p>
                      <button
                        onClick={showVisionSetup}
                        className="mt-3 w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                      >
                        How to set it
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    clearLocalCache();
                    setSearchQuery("");
                    setSearchResults([]);
                    refreshLocal();
                  }}
                  className="py-4 bg-white/5 border border-white/10 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Clear Cache
                </button>
                <button onClick={() => setActiveTab("dashboard")} className="py-4 bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-emerald-500/15 transition-all">
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-6 h-8 flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 border-t border-white/10 bg-slate-950/80 backdrop-blur shrink-0 uppercase tracking-widest z-50">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
          </span>
          <span className="hidden sm:inline">Storage: Local</span>
          <span className="hidden md:inline">Protocol: {profile.calorieTarget > 2000 ? "Mass Gain" : "Deficit"}</span>
        </div>
        <div className="flex gap-6">
          <span className="hidden sm:inline">Mode: Personal</span>
          <span>Buffer: {entries.length} Entries</span>
        </div>
      </footer>
    </div>
  );
}
