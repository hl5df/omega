import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { createClient } from "../lib/supabase-browser";

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, []);

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
