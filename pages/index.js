import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";

const IMG_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;

// Toast system
function Toasts({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          padding: "0.6rem 1rem", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer",
          maxWidth: 360, animation: "fadeIn 0.2s",
          background: t.type === "error" ? "#3b1113" : t.type === "success" ? "#0d2818" : "#1a1a2e",
          border: `1px solid ${t.type === "error" ? "#f85149" : t.type === "success" ? "#2ea043" : "#a78bfa"}`,
          color: t.type === "error" ? "#f85149" : t.type === "success" ? "#7ee787" : "#a78bfa",
        }}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}{t.message}
        </div>
      ))}
    </div>
  );
}

export default function CloudDrop() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [prefix, setPrefix] = useState("");
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("");
  const [envData, setEnvData] = useState(null);
  const [showInspector, setShowInspector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [overrideInputs, setOverrideInputs] = useState({});
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideResult, setOverrideResult] = useState(null);
  const inputRef = useRef();
  const toastId = useRef(0);

  const toast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const load = useCallback(async (p) => {
    const pfx = p ?? prefix;
    try {
      const res = await fetch(`/api/s3/list?prefix=${encodeURIComponent(pfx)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.objects);
      setFolders(data.folders);
      setBucket(data.bucket);
      setRegion(data.region);
    } catch (e) {
      toast(e.message, "error");
    }
    setLoading(false);
  }, [prefix]);

  const loadEnv = useCallback(async () => {
    try {
      const res = await fetch("/api/s3/env");
      setEnvData(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => { load(); loadEnv(); }, [load, loadEnv]);

  const navigate = (p) => { setPrefix(p); setLoading(true); load(p); };

  const upload = async (fileList) => {
    setUploading(true);
    try {
      for (const file of fileList) {
        const key = prefix + file.name;
        const ct = file.type || "application/octet-stream";
        const res = await fetch(`/api/s3/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(ct)}`);
        const text = await res.text();
        let result;
        try { result = JSON.parse(text); } catch { result = {}; }
        if (!res.ok || result.error) throw new Error(result.error || `Failed to get upload URL (${res.status})`);
        const put = await fetch(result.url, { method: "PUT", body: file, headers: { "Content-Type": ct } });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      }
      toast(`Uploaded ${fileList.length} file${fileList.length > 1 ? "s" : ""}`);
      await load();
    } catch (e) {
      toast(e.message, "error");
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };

  const handleDelete = async (key) => {
    if (!confirm(`Delete "${key}"?`)) return;
    try {
      const res = await fetch(`/api/s3/delete?key=${encodeURIComponent(key)}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`);
      if (data.error) throw new Error(data.error);
      setPreview(null);
      toast(`Deleted ${key}`);
      await load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleDownload = async (key) => {
    try {
      const res = await fetch(`/api/s3/download?key=${encodeURIComponent(key)}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!res.ok || data.error) return toast(data.error || `Download failed (${res.status})`, "error");
      window.open(data.url, "_blank");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handlePreview = async (key) => {
    if (!IMG_EXT.test(key)) return handleDownload(key);
    try {
      const res = await fetch(`/api/s3/download?key=${encodeURIComponent(key)}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!res.ok || data.error) return toast(data.error || `Preview failed (${res.status})`, "error");
      setPreview({ key, url: data.url });
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleOverride = async () => {
    setOverrideLoading(true);
    setOverrideResult(null);
    try {
      const overrides = Object.entries(envData.bindings).map(([key]) => ({
        Key: key,
        ...(overrideInputs[key] ? { KeyOverride: overrideInputs[key] } : {}),
      }));
      const res = await fetch("/api/s3/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOverrideResult(data.environmentVariables);
      toast("KeyOverride updated! Redeploy to see new env var names.", "info");
    } catch (e) {
      toast(e.message, "error");
    }
    setOverrideLoading(false);
  };

  const fmt = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
  };

  const totalSize = files.reduce((a, f) => a + f.size, 0);

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  };

  const icon = (key) => {
    if (IMG_EXT.test(key)) return "🖼️";
    if (/\.pdf$/i.test(key)) return "📕";
    if (/\.(zip|tar|gz|rar)$/i.test(key)) return "📦";
    if (/\.(mp4|mov|avi|webm)$/i.test(key)) return "🎬";
    if (/\.(mp3|wav|ogg)$/i.test(key)) return "🎵";
    if (/\.(doc|docx|txt|md)$/i.test(key)) return "📝";
    if (/\.(xls|xlsx|csv)$/i.test(key)) return "📊";
    return "📄";
  };

  return (
    <>
      <Head><title>CloudDrop</title></Head>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>☁️ CloudDrop</h1>
            <p style={{ color: "#888", fontSize: "0.85rem", marginTop: 4 }}>
              Powered by <span style={{ color: "#a78bfa" }}>Omega S3 Bindings</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowInspector(!showInspector)} style={{ ...btnSecondary, background: showInspector ? "#1a1a2e" : "#222", borderColor: showInspector ? "#a78bfa" : "#333" }}>
              🔍 Bindings
            </button>
            <button onClick={() => { load(); toast("Refreshed"); }} style={btnSecondary} disabled={loading}>↻</button>
          </div>
        </div>

        {/* Bindings Inspector */}
        {showInspector && envData && (
          <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#a78bfa", marginBottom: "1rem" }}>🔍 Bindings Inspector</h3>

            {/* Binding env vars */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={sectionLabel}>S3 Integration Binding</div>
              <div style={{ display: "grid", gap: 6 }}>
                {Object.entries(envData.bindings).map(([k, v]) => (
                  <div key={k} style={envRow}>
                    <span style={envBadge("binding")}>binding</span>
                    <code style={{ color: "#7ee787" }}>{k}</code>
                    <span style={{ color: "#555" }}>=</span>
                    <code style={{ color: v ? "#e5e5e5" : "#f85149" }}>{v ?? "(not injected)"}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom env vars */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={sectionLabel}>Custom Environment Variables</div>
              {Object.keys(envData.custom).length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#555" }}>No custom env vars detected.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {Object.entries(envData.custom).map(([k, v]) => (
                    <div key={k} style={envRow}>
                      <span style={envBadge("custom")}>custom</span>
                      <code style={{ color: "#7ee787" }}>{k}</code>
                      <span style={{ color: "#555" }}>=</span>
                      <code style={{ color: v === "••••••••" ? "#f0883e" : "#e5e5e5" }}>{v}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KeyOverride demo */}
            <div style={{ borderTop: "1px solid #2d2d44", paddingTop: "1.25rem" }}>
              <div style={sectionLabel}>⚡ Live KeyOverride Demo</div>
              <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: 12, lineHeight: 1.5 }}>
                Rename binding env vars without changing app code. Enter a new name and apply — Omega will inject the value under the new key on next deploy.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(envData.bindings).map(([k]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
                    <code style={{ color: "#7ee787", minWidth: 120 }}>{k}</code>
                    <span style={{ color: "#555" }}>→</span>
                    <input
                      type="text"
                      placeholder={k}
                      value={overrideInputs[k] || ""}
                      onChange={(e) => setOverrideInputs({ ...overrideInputs, [k]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleOverride} disabled={overrideLoading} style={{ ...btnPrimary, marginTop: 12 }}>
                {overrideLoading ? "Applying…" : "Apply KeyOverride"}
              </button>

              {overrideResult && (
                <div style={{ marginTop: 12, padding: "0.75rem", background: "#0d0d14", borderRadius: 8, fontSize: "0.8rem" }}>
                  <div style={{ color: "#7ee787", marginBottom: 6 }}>✓ Integration config updated:</div>
                  {overrideResult.map((v, i) => (
                    <div key={i} style={{ color: "#ccc", marginLeft: 8 }}>
                      <code>{v.Key}</code>
                      {v.KeyOverride && <span style={{ color: "#a78bfa" }}> → <code>{v.KeyOverride}</code></span>}
                      {" = "}<code style={{ color: "#888" }}>{v.Value}</code>
                    </div>
                  ))}
                  <p style={{ color: "#666", marginTop: 8, fontSize: "0.75rem" }}>
                    Redeploy to see the new env var names take effect in the app.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", fontSize: "0.8rem", color: "#888" }}>
          <span>📦 <strong style={{ color: "#e5e5e5" }}>{bucket}</strong></span>
          <span>🌍 {region}</span>
          <span>📂 {folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
          <span>📁 {files.length} file{files.length !== 1 ? "s" : ""}</span>
          <span>💾 {fmt(totalSize)}</span>
        </div>

        {/* Breadcrumb */}
        {prefix && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "1rem", fontSize: "0.85rem", flexWrap: "wrap" }}>
            <span onClick={() => navigate("")} style={{ cursor: "pointer", color: "#a78bfa" }}>🏠 root</span>
            {prefix.split("/").filter(Boolean).map((seg, i, arr) => {
              const path = arr.slice(0, i + 1).join("/") + "/";
              const isLast = i === arr.length - 1;
              return (
                <span key={path}>
                  <span style={{ color: "#555", margin: "0 2px" }}>/</span>
                  {isLast ? <strong style={{ color: "#e5e5e5" }}>{seg}</strong> : (
                    <span onClick={() => navigate(path)} style={{ cursor: "pointer", color: "#a78bfa" }}>{seg}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#a78bfa" : "#333"}`,
            borderRadius: 12, padding: "2.5rem", textAlign: "center", cursor: "pointer",
            background: dragOver ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.02)",
            transition: "all 0.2s", marginBottom: "2rem",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>{uploading ? "⏳" : "📁"}</div>
          <p style={{ color: "#888" }}>{uploading ? "Uploading…" : "Drop files here or click to upload"}</p>
          <input ref={inputRef} type="file" multiple onChange={(e) => { upload(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
        </div>

        {/* File grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#666" }}>Loading…</p>
        ) : folders.length === 0 && files.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666", padding: "3rem 0" }}>
            {prefix ? "Empty folder." : "No files yet. Drop something!"}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {folders.map((f) => {
              const name = f.slice(prefix.length).replace(/\/$/, "");
              return (
                <div key={f} onClick={() => navigate(f)} style={{ ...card, cursor: "pointer" }}>
                  <div style={{ padding: "1.5rem 1rem 1rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📂</div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 500, wordBreak: "break-all", lineHeight: 1.3 }}>{name}/</p>
                  </div>
                </div>
              );
            })}
            {files.map((f) => {
              const name = f.key.slice(prefix.length);
              return (
                <div key={f.key} style={card}>
                  <div onClick={() => handlePreview(f.key)} style={{ cursor: "pointer", padding: "1.5rem 1rem 0.75rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>{icon(f.key)}</div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 500, wordBreak: "break-all", lineHeight: 1.3 }}>{name}</p>
                  </div>
                  <div style={{ borderTop: "1px solid #222", padding: "0.5rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#888" }}>
                    <span>{fmt(f.size)} · {timeAgo(f.lastModified)}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleDownload(f.key)} title="Download" style={btnIcon}>⬇</button>
                      <button onClick={() => handleDelete(f.key)} title="Delete" style={{ ...btnIcon, color: "#f85149" }}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview modal */}
        {preview && (
          <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "pointer" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
              <img src={preview.url} alt={preview.key} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8 }} />
              <p style={{ textAlign: "center", marginTop: 8, color: "#aaa", fontSize: "0.85rem" }}>{preview.key}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const card = { background: "#161616", borderRadius: 10, border: "1px solid #222", overflow: "hidden" };
const btnSecondary = { background: "#222", color: "#e5e5e5", border: "1px solid #333", borderRadius: 8, padding: "0.4rem 0.8rem", cursor: "pointer", fontSize: "0.85rem" };
const btnPrimary = { background: "#a78bfa", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 };
const btnIcon = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "0.9rem", padding: 2 };
const envRow = { display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", padding: "4px 8px", background: "#0d0d14", borderRadius: 6 };
const sectionLabel = { fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };
const inputStyle = { background: "#0d0d14", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#e5e5e5", fontSize: "0.8rem", fontFamily: "monospace", flex: 1 };
const envBadge = (type) => ({
  fontSize: "0.65rem", padding: "1px 6px", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", flexShrink: 0,
  background: type === "binding" ? "rgba(167,139,250,0.15)" : "rgba(88,166,255,0.15)",
  color: type === "binding" ? "#a78bfa" : "#58a6ff",
});
