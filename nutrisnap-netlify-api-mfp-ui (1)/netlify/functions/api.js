const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

const text = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    ...extraHeaders,
  },
  body,
});

const extractJson = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];
  const obj = raw.match(/{[\s\S]*}/);
  return obj?.[0] || null;
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return text(200, "ok", {
      "access-control-allow-methods": "GET,POST,OPTIONS",
    });
  }

  const urlPath = (() => {
    try {
      const u = new URL(event.rawUrl || event.url || "", "https://example.com");
      return u.pathname || "";
    } catch {
      return event.path || "";
    }
  })();

  let subpath = urlPath
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "");

  if (!subpath.startsWith("/")) subpath = `/${subpath}`;


  try {
    // /api/food/search?q=...
    if (event.httpMethod === "GET" && subpath === "/food/search") {
      const q = event.queryStringParameters?.q;
      if (!q) return json(400, { error: "Query is required" });

      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        q
      )}&search_simple=1&action=process&json=1&page_size=20`;

      const response = await fetch(url, { headers: { "User-Agent": "NutriStack - Web - 1.0" } });
      const data = await response.json();
      return json(200, data);
    }

    // /api/food/barcode/:code
    const barcodeMatch = subpath.match(/^\/food\/barcode\/([^/]+)$/);
    if (event.httpMethod === "GET" && barcodeMatch) {
      const code = barcodeMatch[1];
      const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;
      const response = await fetch(url, { headers: { "User-Agent": "NutriStack - Web - 1.0" } });
      const data = await response.json();
      return json(200, data);
    }

    // /api/nutrition/vision
    if (event.httpMethod === "POST" && subpath === "/nutrition/vision") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return json(500, { error: "GEMINI_API_KEY is not set on the server." });

      const body = event.body ? JSON.parse(event.body) : {};
      const image = body?.image;
      if (!image) return json(400, { error: "Image data is required" });

      const base64Data = String(image).split(",")[1] || String(image);

      const prompt =
        "Analyze this image of food and provide an estimated list of ingredients and their nutritional values. " +
        "Return JSON with an 'items' array, where each item has: name, calories, protein, carbs, fat, and optionally fiber, sugar, sodiumMg. " +
        "Also include a 'total' object with summed fields. Use grams for macros and milligrams for sodium (sodiumMg).";

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: "image/jpeg", data: base64Data } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (!resp.ok) {
        const t = await resp.text();
        return json(500, { error: "Vision request failed", status: resp.status, raw: t });
      }

      const data = await resp.json();
      const modelText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonStr = extractJson(modelText);
      if (!jsonStr) return json(500, { error: "Failed to parse AI response", raw: modelText });

      try {
        return json(200, JSON.parse(jsonStr));
      } catch {
        return json(500, { error: "Failed to parse AI JSON", raw: modelText });
      }
    }

    return json(404, { error: "Not found" });
  } catch (e) {
    return json(500, { error: "Server error", message: e?.message || String(e) });
  }
};

