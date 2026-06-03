// ============================ auth (Supabase · client anon) ============================
// مُسوَّر بالبيئة: بدون VITE_SUPABASE_URL/ANON_KEY تُخفى ميزات الحساب وتعمل اللعبة كضيف.
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authEnabled = !!(URL && ANON);

export const sb = authEnabled
  ? createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

let _session = null;
const listeners = new Set();

if (sb) {
  sb.auth.getSession().then(({ data }) => { _session = data.session; emit(); });
  sb.auth.onAuthStateChange((_e, session) => { _session = session; emit(); });
}
function emit() { listeners.forEach(fn => { try { fn(currentUser()); } catch (e) {} }); }

// يستدعي fn فوراً وعند كل تغيّر في الجلسة؛ يعيد دالة إلغاء الاشتراك
export function onAuthChange(fn) { listeners.add(fn); fn(currentUser()); return () => listeners.delete(fn); }

export function currentUser() {
  if (!_session?.user) return null;
  const u = _session.user, m = u.user_metadata || {};
  return {
    uid: u.id,
    name: m.full_name || m.name || (u.email ? u.email.split("@")[0] : "لاعب"),
    avatar: m.avatar_url || m.picture || null,
    email: u.email || null,
  };
}

export function getAccessToken() { return _session?.access_token || null; }

export async function signInWithGoogle() {
  if (!sb) return;
  await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.href },   // يعود لنفس الصفحة (يحفظ ?room= إن وُجد)
  });
}

export async function signOut() { if (sb) await sb.auth.signOut(); }
