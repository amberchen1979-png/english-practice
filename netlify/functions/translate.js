// Netlify Function: 代理呼叫 Groq API，把中文句子翻譯成英文，並列出關鍵單字。
// 金鑰放在 Netlify 環境變數 GROQ_API_KEY，不會出現在前端程式碼或瀏覽器裡。
//
// 前端呼叫方式： POST /.netlify/functions/translate  { "zh": "今天是下雨天" }
// 回傳格式：      { "en": "Today is a rainy day.", "words": [{ "en": "rainy", "zh": "多雨的" }, ...] }

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b"; // 注意：llama-3.3-70b-versatile 對此帳號回傳 404 model_not_found，改用免費帳號可用的模型

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
規則：
1. 翻譯要忠於原句的意思與語氣，用自然、道地的英文表達，但不要自行加入原句沒有的比喻、俚語或誇張語氣。例如「提醒你」不要翻成 "Just a heads-up"（語氣太隨性），翻成 "Just a reminder" 或 "Keep in mind that..." 更貼近原句。
2. 句子的正式程度、語氣要盡量貼近原文：正式的中文用正式的英文，輕鬆口語的中文才用輕鬆口語的英文，不要單方面把語氣「升級」成更口語或更誇張。
3. 避免逐字直翻造成的生硬感，但也避免過度意譯而偏離原意。
4. 從你翻出的英文句子中，挑出 3-8 個對學習者有幫助的單字或片語（排除 a, the, is, to 這類太基礎的字)。
5. 只能輸出一個 JSON 物件，格式為：
{"en": "英文翻譯", "words": [{"en": "單字或片語", "zh": "繁體中文意思"}, ...]}
不要輸出任何 JSON 以外的文字、不要用 markdown code block 包起來。`;

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
          { role: "user", content: zh },
        ],
        temperature: 0.3,
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
