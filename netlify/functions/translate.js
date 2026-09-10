// Netlify Function: 代理呼叫 Groq API，把中文句子翻譯成英文，並列出關鍵單字。
// 金鑰放在 Netlify 環境變數 GROQ_API_KEY，不會出現在前端程式碼或瀏覽器裡。
//
// 前端呼叫方式： POST /.netlify/functions/translate  { "zh": "今天是下雨天" }
// 回傳格式：      { "en": "Today is a rainy day.", "words": [{ "en": "rainy", "zh": "多雨的" }, ...] }

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// 注意：llama-3.3-70b-versatile 對此帳號回傳 404 model_not_found。
// gpt-oss-20b 翻譯品質偏生硬，改試 gpt-oss-120b（同帳號可能可用，模型較大、語言能力較好）。
// 如果 120b 也回傳 404，把這行改回 "openai/gpt-oss-20b" 即可。
const MODEL = "openai/gpt-oss-120b";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "伺服器尚未設定 GROQ_API_KEY，請到 Netlify 專案設定加入這個環境變數。" }),
    };
  }

  let zh;
  try {
    const body = JSON.parse(event.body || "{}");
    zh = (body.zh || "").trim();
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "請求格式錯誤" }) };
  }

  if (!zh) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "請提供要翻譯的中文句子" }) };
  }

  const systemPrompt = `你是專業的中翻英老師，服務對象是台灣的上班族，用來練習日常與職場英文口說。
把使用者的中文句子翻成一個母語者會「自然說出口」的英文句子——不是逐字直翻，也不要刻意加油添醋、改變原本的語氣或正式程度。可以重組語序、合併子句，只要聽起來自然就好。
同時從英文句子裡挑 3-8 個對學習者有幫助的單字或片語（排除 a, the, is, to 這類太基礎的字），每個附上一句簡短英文解釋（像字典的英英解釋，10 個字內）。
只能輸出一個 JSON 物件：{"en": "英文翻譯", "words": [{"en": "單字或片語", "zh": "繁體中文意思", "def": "簡短英文解釋"}, ...]}，不要輸出 JSON 以外的文字，不要用 markdown code block 包起來。`;

  const fewShot = [
    {
      role: "user",
      content: "今天淘汰舊咖啡杯，換了一個新的，喝起咖啡，心情變很好",
    },
    {
      role: "assistant",
      content: JSON.stringify({
        en: "I replaced my old coffee cup with a new one today, and drinking coffee just puts me in a better mood.",
        words: [
          { en: "replaced", zh: "更換", def: "put a new thing in place of an old one" },
          { en: "puts me in a mood", zh: "讓我心情變成…", def: "makes someone feel a certain way" },
        ],
      }),
    },
    {
      role: "user",
      content: "提醒你，股票不要隨便亂下單",
    },
    {
      role: "assistant",
      content: JSON.stringify({
        en: "Just a reminder — don't place stock trades carelessly.",
        words: [
          { en: "reminder", zh: "提醒", def: "something that helps you remember" },
          { en: "carelessly", zh: "隨便地", def: "without careful thought" },
        ],
      }),
    },
  ];

  try {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...fewShot,
          { role: "user", content: zh },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Groq API error", resp.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `翻譯服務發生問題 (${resp.status})：${errText.slice(0, 300)}`,
          detail: errText,
        }),
      };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "翻譯結果解析失敗", raw: content }) };
    }

    if (!parsed.en) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "翻譯結果格式不正確", raw: content }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ en: parsed.en, words: Array.isArray(parsed.words) ? parsed.words : [] }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "呼叫翻譯服務失敗：" + e.message }) };
  }
};
