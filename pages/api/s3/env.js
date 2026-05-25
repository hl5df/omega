export default function handler(req, res) {
  // Binding-injected env vars (from Omega S3 integration)
  const bindings = {
    BUCKET_NAME: process.env.BUCKET_NAME ?? null,
    BUCKET_REGION: process.env.BUCKET_REGION ?? null,
  };

  // Custom env vars (set via put-environment-variables)
  const custom = {};
  const skip = new Set([...Object.keys(bindings), "PATH", "HOME", "NODE_ENV", "NODE_PATH", "HOSTNAME", "PWD", "LANG", "TERM", "SHELL", "USER", "LOGNAME", "SHLVL", "_", "NEXT_RUNTIME", "PORT", "__NEXT_PRIVATE_STANDALONE_CONFIG"]);
  for (const [k, v] of Object.entries(process.env)) {
    if (!skip.has(k) && !k.startsWith("__") && !k.startsWith("npm_") && !k.startsWith("NEXT_")) {
      custom[k] = /secret|key|token|password/i.test(k) ? "••••••••" : v;
    }
  }

  res.json({ bindings, custom });
}
