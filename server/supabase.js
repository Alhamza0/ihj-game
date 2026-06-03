// ============================ Supabase (server · service role) ============================
// مُسوَّر بالبيئة: بدون SUPABASE_URL/SERVICE_ROLE_KEY تصبح كل الدوال no-op
// فتعمل اللعبة تماماً بلا حسابات (التطوير المحلي + اختبار e2e).
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnabled = !!(URL && KEY);

const sb = supabaseEnabled
  ? createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

console.log(supabaseEnabled
  ? "🗄️  Supabase: الحسابات والليدربورد مُفعّلة"
  : "🗄️  Supabase: غير مُهيّأ — اللعب كضيف فقط (لا حفظ)");

// يتحقّق من JWT الصادر عن Supabase ويعيد هوية اللاعب أو null
export async function verifyToken(jwt) {
  if (!sb || !jwt) return null;
  try {
    const { data, error } = await sb.auth.getUser(jwt);
    if (error || !data?.user) return null;
    const u = data.user;
    const meta = u.user_metadata || {};
    return {
      uid: u.id,
      name: (meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "لاعب")),
      avatar: meta.avatar_url || meta.picture || null,
    };
  } catch (e) {
    return null;
  }
}

// يحفظ نتيجة المباراة. غير حاجب — يُستدعى دون await من تدفّق اللعبة.
// players = [{ auth:{uid,name,avatar}|null, name, score, placement, isWinner }]
export async function recordMatch({ code, rounds }, players) {
  if (!sb || !players?.length) return;
  try {
    const signedIn = players.filter(p => p.auth?.uid);
    if (signedIn.length) {
      await sb.from("profiles").upsert(
        signedIn.map(p => ({ id: p.auth.uid, display_name: p.name, avatar_url: p.auth.avatar })),
        { onConflict: "id" }
      );
    }
    const winner = players.find(p => p.isWinner && p.auth?.uid);
    const { data: match, error } = await sb.from("matches")
      .insert({ code, rounds, player_count: players.length, winner_id: winner ? winner.auth.uid : null })
      .select("id").single();
    if (error || !match) { if (error) console.warn("matches insert:", error.message); return; }
    const { error: mpErr } = await sb.from("match_players").insert(players.map(p => ({
      match_id: match.id,
      profile_id: p.auth?.uid || null,
      name: p.name,
      score: p.score,
      placement: p.placement,
      is_winner: !!p.isWinner,
    })));
    if (mpErr) console.warn("match_players insert:", mpErr.message);
  } catch (e) {
    console.warn("recordMatch failed:", e?.message || e);
  }
}
