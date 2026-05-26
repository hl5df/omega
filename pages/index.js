import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { createClient } from "../lib/supabase-browser";

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envData, setEnvData] = useState(null);
  const [showEnv, setShowEnv] = useState(false);
  const inputRef = useRef();
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });
    setTodos(data || []);
    setLoading(false);
  };

  const loadEnv = async () => {
    const res = await fetch("/api/supabase/env");
    setEnvData(await res.json());
  };

  useEffect(() => { load(); loadEnv(); }, []);

  const addTodo = async (e) => {
    e.preventDefault();
    const title = inputRef.current.value.trim();
    if (!title) return;
    inputRef.current.value = "";
    await supabase.from("todos").insert({ title });
    load();
  };

  const toggleTodo = async (id, is_complete) => {
    await supabase.from("todos").update({ is_complete: !is_complete }).eq("id", id);
    load();
  };

  const deleteTodo = async (id) => {
    await supabase.from("todos").delete().eq("id", id);
    load();
  };

  return (
    <>
      <Head><title>Omega Todos</title></Head>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Omega Todos</h1>
          <p style={{ color: "#888", fontSize: "0.85rem", marginTop: 4 }}>
            Powered by <span style={{ color: "#3ecf8e" }}>Supabase</span> + <span style={{ color: "#fff" }}>Vercel</span>
          </p>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => setShowEnv(!showEnv)} style={{
            background: showEnv ? "#1a1a2e" : "#222", color: "#e5e5e5",
            border: `1px solid ${showEnv ? "#3ecf8e" : "#333"}`, borderRadius: 8,
            padding: "0.4rem 0.8rem", cursor: "pointer", fontSize: "0.85rem",
          }}>
            {showEnv ? "Hide" : "Show"} Env Vars
          </button>
        </div>

        {showEnv && envData && (
          <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#3ecf8e", marginBottom: "1rem" }}>Supabase Binding</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {Object.entries(envData.supabase).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", padding: "4px 8px", background: "#0d0d14", borderRadius: 6 }}>
                  <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", background: "rgba(62,207,142,0.15)", color: "#3ecf8e" }}>binding</span>
                  <code style={{ color: "#7ee787" }}>{k}</code>
                  <span style={{ color: "#555" }}>=</span>
                  <code style={{ color: v ? "#e5e5e5" : "#f85149" }}>{v ?? "(not set)"}</code>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <h3 style={{ fontSize: "0.9rem", color: "#58a6ff", marginBottom: "1rem" }}>Custom Environment Variables</h3>
              {Object.keys(envData.custom).length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#555" }}>No custom env vars detected.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {Object.entries(envData.custom).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", padding: "4px 8px", background: "#0d0d14", borderRadius: 6 }}>
                      <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", background: "rgba(88,166,255,0.15)", color: "#58a6ff" }}>custom</span>
                      <code style={{ color: "#7ee787" }}>{k}</code>
                      <span style={{ color: "#555" }}>=</span>
                      <code style={{ color: v === "********" ? "#f0883e" : "#e5e5e5" }}>{v}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={addTodo} style={{ display: "flex", gap: 8, marginBottom: "2rem" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="What needs to be done?"
            style={{
              flex: 1, background: "#161616", border: "1px solid #333", borderRadius: 8,
              padding: "0.75rem 1rem", color: "#e5e5e5", fontSize: "0.9rem", outline: "none",
            }}
          />
          <button type="submit" style={{
            background: "#3ecf8e", color: "#0a0a0a", border: "none", borderRadius: 8,
            padding: "0.75rem 1.25rem", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
          }}>
            Add
          </button>
        </form>

        {loading ? (
          <p style={{ color: "#666", textAlign: "center" }}>Loading...</p>
        ) : todos.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: "2rem 0" }}>No todos yet. Add one above!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todos.map((todo) => (
              <div key={todo.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#161616", border: "1px solid #222", borderRadius: 8, padding: "0.75rem 1rem",
              }}>
                <input
                  type="checkbox"
                  checked={todo.is_complete}
                  onChange={() => toggleTodo(todo.id, todo.is_complete)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#3ecf8e" }}
                />
                <span style={{
                  flex: 1, fontSize: "0.9rem",
                  textDecoration: todo.is_complete ? "line-through" : "none",
                  color: todo.is_complete ? "#666" : "#e5e5e5",
                }}>
                  {todo.title}
                </span>
                <button onClick={() => deleteTodo(todo.id)} style={{
                  background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "1rem",
                }}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#555", textAlign: "center" }}>
          {todos.length} todo{todos.length !== 1 ? "s" : ""} &middot; {todos.filter(t => t.is_complete).length} complete
        </div>
      </div>
    </>
  );
}
