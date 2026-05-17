export interface NutritionData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
  barcode?: string;
  imageUrl?: string;
  servingSize?: string;
}

const toNum = (value: any): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const searchOpenFoodFacts = async (query: string): Promise<NutritionData[]> => {
  const url = `/api/food/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.products || []).map((product: any) => ({
      name: product.product_name || "Unknown Product",
      calories: Math.round(toNum(product.nutriments?.["energy-kcal_100g"])),
      protein: Math.round(toNum(product.nutriments?.protein_100g)),
      carbs: Math.round(toNum(product.nutriments?.carbohydrates_100g)),
      fat: Math.round(toNum(product.nutriments?.fat_100g)),
      fiber: Math.round(toNum(product.nutriments?.fiber_100g)),
      sugar: Math.round(toNum(product.nutriments?.sugars_100g)),
      sodiumMg: Math.round(toNum(product.nutriments?.sodium_100g) * 1000),
      barcode: product.code,
      imageUrl: product.image_front_small_url,
      servingSize: product.serving_size || "100g"
    }));
  } catch (error) {
    console.error("Open Food Facts Search Error:", error);
    return [];
  }
};

export const getNutritionFromBarcode = async (barcode: string): Promise<NutritionData | null> => {
  const url = `/api/food/barcode/${barcode}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 1) {
      const product = data.product;
      return {
        name: product.product_name || "Unknown Product",
        calories: Math.round(toNum(product.nutriments?.["energy-kcal_100g"])),
        protein: Math.round(toNum(product.nutriments?.protein_100g)),
        carbs: Math.round(toNum(product.nutriments?.carbohydrates_100g)),
        fat: Math.round(toNum(product.nutriments?.fat_100g)),
        fiber: Math.round(toNum(product.nutriments?.fiber_100g)),
        sugar: Math.round(toNum(product.nutriments?.sugars_100g)),
        sodiumMg: Math.round(toNum(product.nutriments?.sodium_100g) * 1000),
        barcode: product.code,
        imageUrl: product.image_front_small_url,
        servingSize: product.serving_size || "100g"
      };
    }
    return null;
  } catch (error) {
    console.error("Open Food Facts Barcode Error:", error);
    return null;
  }
};

export const analyzePhoto = async (
  imageFile: File,
  _options: { geminiApiKey?: string } = {}
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
