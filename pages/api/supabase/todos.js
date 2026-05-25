import { createClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createClient(req, res);

  if (req.method === "GET") {
    const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const { data, error } = await supabase.from("todos").insert({ title }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
