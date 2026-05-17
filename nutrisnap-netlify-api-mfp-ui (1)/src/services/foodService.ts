export const searchOpenFoodFacts = async (query: string): Promise<NutritionData[]> => {
  const qRaw = query.trim();
  if (!qRaw) return [];

  const q = qRaw.toLowerCase();
  const url = `/api/food/search?q=${encodeURIComponent(qRaw)}`;

  const includesAllTokens = (text: string, tokens: string[]) =>
    tokens.every((t) => text.includes(t));

  const tokens = q.split(/\s+/).filter(Boolean);

  const scoreProduct = (name: string, brand: string) => {
    const n = name.toLowerCase();
    const b = brand.toLowerCase();

    // hard penalties for obvious garbage
    if (!n) return -999;
    if (n.includes("water") || n.includes("eau")) return -50;

    // scoring
    let score = 0;

    // exact query in name wins
    if (n.includes(q)) score += 50;

    // all tokens present in name is strong
    if (includesAllTokens(n, tokens)) score += 25;

    // token hits anywhere (name/brand)
    for (const t of tokens) {
      if (n.includes(t)) score += 6;
      if (b.includes(t)) score += 2;
    }

    // shorter names usually more “generic food” (better)
    score += Math.max(0, 20 - n.length / 10);

    return score;
  };

  try {
    const response = await fetch(url);
    const data = await response.json();

    const products = Array.isArray(data.products) ? data.products : [];

    const mapped = products
      .map((product: any) => {
        const name = (product.product_name || "").trim();
        const brand = (product.brands || "").trim();

        const calories = Math.round(toNum(product.nutriments?.["energy-kcal_100g"]));
        const protein = Math.round(toNum(product.nutriments?.protein_100g));
        const carbs = Math.round(toNum(product.nutriments?.carbohydrates_100g));
        const fat = Math.round(toNum(product.nutriments?.fat_100g));

        // FILTER: must have a real name + real calories
        if (!name) return null;
        if (!Number.isFinite(calories) || calories <= 0) return null;

        // FILTER: must match query somewhat (prevents random results)
        const haystack = `${name} ${brand}`.toLowerCase();
        if (!includesAllTokens(haystack, tokens)) return null;

        const fiber = Math.round(toNum(product.nutriments?.fiber_100g));
        const sugar = Math.round(toNum(product.nutriments?.sugars_100g));
        const sodiumMg = Math.round(toNum(product.nutriments?.sodium_100g) * 1000);

        const score = scoreProduct(name, brand);

        return {
          name,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodiumMg,
          barcode: product.code,
          // your API v2 search returns image_url (not image_front_small_url)
          imageUrl: product.image_url || product.image_front_small_url,
          servingSize: product.serving_size || "100g",
          // @ts-ignore (local helper field for sorting only)
          _score: score,
        } as any;
      })
      .filter(Boolean) as any[];

    // SORT best matches first + keep top 25
    mapped.sort((a, b) => (b._score || 0) - (a._score || 0));

    // strip the private field before returning
    return mapped.slice(0, 25).map(({ _score, ...rest }: any) => rest);
  } catch (error) {
    console.error("Open Food Facts Search Error:", error);
    return [];
  }
};
