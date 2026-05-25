import { createClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createClient(req, res);

  const { error } = await supabase.rpc("version");

  if (error && error.code !== "PGRST202") {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({
    ok: true,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    message: "Supabase connection successful",
  });
}
