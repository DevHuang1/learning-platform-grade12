import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function hasSupabase() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Browser client (client components / browser env). Uses cookies for session.
 */
export function createClient(): SupabaseClient {
  if (!hasSupabase()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

function makeProxy(target: any, name: string) {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (!target) return makeProxy(null, `${name}.${String(prop)}`);
        const value = target[prop];
        if (typeof value === "function") {
          return (...args: unknown[]) => {
            const result = value.apply(target, args);
            return typeof result === "object" && result !== null
              ? makeProxy(result, `${name}.${String(prop)}`)
              : result;
          };
        }
        return typeof value === "object" && value !== null
          ? makeProxy(value, `${name}.${String(prop)}`)
          : value;
      },
    },
  ) as any;
}

let _browserClient: SupabaseClient | null = null;

function browserClient(): SupabaseClient {
  if (!hasSupabase()) return null as unknown as SupabaseClient;
  if (!_browserClient) _browserClient = createClient();
  return _browserClient;
}

/**
 * Lazily-resolved browser client. When env vars are missing it resolves to a
 * no-op chain so the app still runs offline / during prerender. All db helpers
 * guard with hasSupabase() before use.
 */
export const supabase: SupabaseClient = new Proxy(
  {},
  {
    get(_t, prop) {
      const target = browserClient();
      return (makeProxy(target, "supabase") as any)[prop];
    },
  },
) as any;