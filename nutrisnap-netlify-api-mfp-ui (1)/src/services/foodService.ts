export interface NutritionData {
  name: string;
  calories: number; // per 100g
  protein: number; // per 100g
  carbs: number; // per 100g
  fat: number; // per 100g
  fiber?: number; // per 100g
  sugar?: number; // per 100g
  sodiumMg?: number; // per 100g
  barcode?: string;
  imageUrl?: string;
  servingSize?: string;
  brand?: string;
}

const toNum = (value: any): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const includesAllTokens = (text: string, tokens: string[]) =>
  tokens.every((t) => text.includes(t));

export const searchOpenFoodFacts = async (query: string): Promise<NutritionData[]> => {
  const qRaw = query.trim();
  if (!qRaw) return [];

  const q = qRaw.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const url = `/api/food/search?q=${encodeURIComponent(qRaw)}`;

  const scoreProduct = (name: string, brand: string) => {
    const n = name.toLowerCase();
    const b = brand.toLowerCase();

    if (!n) return -999;

    let score = 0;

    // exact query in name wins
    if (n.includes(q)) score += 60;

    // all tokens present in name is strong
    if (includesAllTokens(n, tokens)) score += 25;

    // token hits anywhere (name/brand)
    for (const t of tokens) {
      if (n.includes(t)) score += 6;
      if (b.includes(t)) score += 2;
    }

    // shorter names usually more “generic food”
    score += Math.max(0, 20 - n.length / 10);

    return score;
  };

  try {
    const response = await fetch(url);
    const data = await response.json();

    const products = Array.isArray(data.products) ? data.products : [];

    const mapped = products
      .map((product: any) => {
        const name = String(product.product_name || "").trim();
        const brand = String(product.brands || "").trim();

        // OpenFoodFacts nutriments are usually per 100g
        const calories = Math.round(toNum(product.nutriments?.["energy-kcal_100g"]));
        const protein = Math.round(toNum(product.nutriments?.protein_100g));
        const carbs = Math.round(toNum(product.nutriments?.carbohydrates_100g));
        const fat = Math.round(toNum(product.nutriments?.fat_100g));

        // FILTER: must have name + calories + match tokens somewhere
        if (!name) return null;
        if (!Number.isFinite(calories) || calories <= 0) return null;

        const haystack = `${name} ${brand}`.toLowerCase();
        if (!includesAllTokens(haystack, tokens)) return null;

        const fiber = Math.round(toNum(product.nutriments?.fiber_100g));
        const sugar = Math.round(toNum(product.nutriments?.sugars_100g));
        const sodiumMg = Math.round(toNum(product.nutriments?.sodium_100g) * 1000);

        const score = scoreProduct(name, brand);

        return {
          name,
          brand: brand || undefined,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodiumMg,
          barcode: product.code,
          imageUrl: product.image_url || product.image_front_small_url,
          servingSize: product.serving_size || "100g",
          // local sort only
          _score: score,
        } as any;
      })
      .filter(Boolean) as any[];

    mapped.sort((a, b) => (b._score || 0) - (a._score || 0));

    return mapped.slice(0, 25).map(({ _score, ...rest }: any) => rest);
  } catch (error) {
    console.error("Food search error:", error);
    return [];
  }
};

export const getNutritionFromBarcode = async (barcode: string): Promise<NutritionData | null> => {
  const url = `/api/food/barcode/${encodeURIComponent(barcode)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data?.status !== 1) return null;

    const product = data.product;

    return {
      name: String(product.product_name || "Unknown Product"),
      brand: product.brands ? String(product.brands) : undefined,
      calories: Math.round(toNum(product.nutriments?.["energy-kcal_100g"])),
      protein: Math.round(toNum(product.nutriments?.protein_100g)),
      carbs: Math.round(toNum(product.nutriments?.carbohydrates_100g)),
      fat: Math.round(toNum(product.nutriments?.fat_100g)),
      fiber: Math.round(toNum(product.nutriments?.fiber_100g)),
      sugar: Math.round(toNum(product.nutriments?.sugars_100g)),
      sodiumMg: Math.round(toNum(product.nutriments?.sodium_100g) * 1000),
      barcode: product.code,
      imageUrl: product.image_url || product.image_front_small_url,
      servingSize: product.serving_size || "100g",
    };
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return null;
  }
};

export const analyzePhoto = async (
  imageFile: File
): Promise<{ items: NutritionData[]; total: any }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;

        const response = await fetch("/api/nutrition/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (!response.ok) throw new Error("Failed to analyze image");
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};

