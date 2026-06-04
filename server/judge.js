// ============================ تحكيم هجين (قاموس + Claude Haiku) ============================
// مُسوَّر بالبيئة: بدون ANTHROPIC_API_KEY لا تحكيم آلي (تعمل اللعبة بسلوكها الحالي).
// مبدأ: القاموس يؤكّد المعروف؛ غير المعروف يُحال للذكاء؛ عند أي فشل لا نرفض شيئاً (المضيف يصحّح).
import Anthropic from "@anthropic-ai/sdk";
import { CATS, norm, matchLetter } from "@ihj/shared";
import { inDictionary, CLOSED_CATS, STRICT_CATS } from "@ihj/shared/dictionaries";

// الذكاء اختياري؛ القاموس يعمل دائماً (بلا تكلفة).
export const aiEnabled = !!process.env.ANTHROPIC_API_KEY;
export const judgeEnabled = true;   // التحكيم الآلي فعّال دائماً (قاموس + ذكاء إن وُجد المفتاح)

const client = aiEnabled ? new Anthropic() : null;
const MODEL = "claude-haiku-4-5";
const catName = id => (CATS.find(c => c.id === id)?.nm) || id;

console.log(aiEnabled
  ? "🤖 التحكيم: قاموس + ذكاء (Claude Haiku)"
  : "🤖 التحكيم: قاموس فقط (بلا مفتاح ذكاء)");

// كاش في الذاكرة لنتائج الذكاء: `${cat}|${letter}|${normWord}` -> bool
const verdictCache = new Map();
const ck = (cat, letter, w) => `${cat}|${letter}|${w}`;

const SYSTEM_RULES =
  "أنت حَكَمٌ في لعبة «إنسان · حيوان · جماد» العربية. " +
  "لكل عنصر (فئة + كلمة) قرّر: هل الكلمة إجابةٌ حقيقيةٌ تنتمي فعلاً لتلك الفئة وتبدأ بالحرف المعطى بالعربية؟ " +
  "اقبل الكلمات الصحيحة حتى لو فيها خطأ إملائي بسيط أو اختلاف في الهمزات/الألف/التاء المربوطة. " +
  "ارفض: الكلمات غير الحقيقية، الحروف العشوائية أو المكرّرة (مثل «خخخ»)، الكلمات التي لا تنتمي للفئة، " +
  "والكلمات التي لا تبدأ بالحرف المطلوب. " +
  "كن منصفاً ومتساهلاً مع الإجابات المعقولة. أعِد النتيجة بصيغة JSON فقط دون أي شرح.";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { cat: { type: "string" }, word: { type: "string" }, valid: { type: "boolean" } },
        required: ["cat", "word", "valid"],
      },
    },
  },
  required: ["results"],
};

// entries: [{ key, vals }] · cats: [catId] · letter
// يعيد: { [key]: { [cat]: { valid, src } } } للإجابات المطابقة للحرف وغير الفارغة فقط
export async function judgeRound(letter, cats, entries) {
  const out = {};

  // candidates للذكاء: cat -> Set(normWord)  ؛ ونحتفظ بربط (key,cat)->normWord
  const aiWords = {};
  const cellWord = {};

  for (const e of entries) {
    const vals = e.vals || {};
    for (const cat of cats) {
      const raw = (vals[cat] || "").trim();
      if (!raw || !matchLetter(raw, letter)) continue;   // الفارغ/غير المطابق = ٠ أصلاً
      const w = norm(raw);
      (cellWord[e.key] ||= {})[cat] = w;
      const closed = CLOSED_CATS.includes(cat);

      // 1) القاموس: ما هو معروف → صحيح فوراً (مجاناً)
      if (closed && inDictionary(cat, raw)) {
        (out[e.key] ||= {})[cat] = { valid: true, src: "dict" };
        continue;
      }
      // 2) غير معروف في القاموس
      if (aiEnabled) {
        const cached = verdictCache.get(ck(cat, letter, w));
        if (cached !== undefined) { (out[e.key] ||= {})[cat] = { valid: cached, src: "cache" }; continue; }
        (aiWords[cat] ||= new Set()).add(w);   // يُحال للذكاء
      } else if (closed && STRICT_CATS.includes(cat)) {
        // بلا ذكاء: الفئة الصارمة (بلدان) قائمتها شبه كاملة → رفض غير الموجود (المضيف يعكس)
        (out[e.key] ||= {})[cat] = { valid: false, src: "dict" };
      }
      // غير ذلك (فئة مفتوحة/مساعِدة بلا ذكاء) → نتركها للمضيف
    }
  }
  if (!aiEnabled) return out;   // اكتفينا بالقاموس

  // نداء الذكاء (واحد للجولة) لِما تبقّى
  const items = Object.entries(aiWords)
    .map(([cat, set]) => ({ cat, name: catName(cat), words: [...set] }))
    .filter(it => it.words.length);

  if (items.length) {
    const verdicts = await callJudge(letter, items);   // Map(`${cat}|${word}` -> bool) أو null عند الفشل
    if (verdicts) {
      // خزّن في الكاش
      for (const { cat, words } of items) {
        for (const w of words) {
          const v = verdicts.get(`${cat}|${w}`);
          if (v !== undefined) verdictCache.set(ck(cat, letter, w), v);
        }
      }
      // طبّق على الخلايا
      for (const e of entries) {
        const byCat = cellWord[e.key];
        if (!byCat) continue;
        for (const cat of Object.keys(byCat)) {
          if ((out[e.key]?.[cat])) continue;   // مُقرّر سلفاً (قاموس/كاش)
          const v = verdicts.get(`${cat}|${byCat[cat]}`);
          if (v !== undefined) (out[e.key] ||= {})[cat] = { valid: v, src: "ai" };
        }
      }
    }
    // عند الفشل (verdicts=null): لا نضيف شيئاً → لا رفض (سلوك آمن)
  }
  return out;
}

async function callJudge(letter, items) {
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: [{ type: "text", text: SYSTEM_RULES, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: "الحرف المطلوب: «" + letter + "»\n" +
          "حكّم العناصر التالية وأعِد results مطابقاً للحقول cat/word/valid:\n" +
          JSON.stringify(items, null, 0),
      }],
    });
    const text = (res.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const data = JSON.parse(text);
    const map = new Map();
    for (const r of (data.results || [])) {
      if (r && typeof r.cat === "string" && typeof r.word === "string") {
        map.set(`${r.cat}|${norm(r.word)}`, !!r.valid);
      }
    }
    return map;
  } catch (e) {
    console.warn("judge call failed:", e?.message || e);
    return null;   // فشل → لا رفض
  }
}
