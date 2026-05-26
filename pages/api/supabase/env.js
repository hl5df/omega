export default function handler(req, res) {
  const supabase = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + "..."
      : null,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "********" : null,
  };

  const skip = new Set([
    ...Object.keys(supabase),
    "PATH", "HOME", "NODE_ENV", "NODE_PATH", "HOSTNAME", "PWD", "LANG",
    "TERM", "SHELL", "USER", "LOGNAME", "SHLVL", "_", "NEXT_RUNTIME",
    "PORT", "__NEXT_PRIVATE_STANDALONE_CONFIG",
  ]);

  const custom = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!skip.has(k) && !k.startsWith("__") && !k.startsWith("npm_") && !k.startsWith("NEXT_")) {
      custom[k] = /secret|key|token|password/i.test(k) ? "********" : v;
    }
  }

  res.json({ supabase, custom });
}
