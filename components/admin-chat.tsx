"use client";

import { useEffect, useState } from "react";

type Thread = { id: string; name: string; contact: string; latest: string; latestAt: string; unread: number };
type Message = { id: string; sender_role: "user" | "admin"; body: string; created_at: string };

export function AdminChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function loadThreads() {
    const response = await fetch("/api/admin/messages", { cache: "no-store" });
    const data = await response.json() as { threads?: Thread[]; error?: string };
    if (!response.ok) return setError(data.error ?? "Chat-уудыг авч чадсангүй.");
    setThreads(data.threads ?? []);
  }
  async function openThread(thread: Thread) {
    setSelected(thread); setLoading(true); setError("");
    const response = await fetch(`/api/admin/users/${thread.id}/messages`, { cache: "no-store" });
    const data = await response.json() as { messages?: Message[]; error?: string };
    setLoading(false); if (!response.ok) return setError(data.error ?? "Зурвасуудыг авч чадсангүй.");
    setMessages(data.messages ?? []); setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, unread: 0 } : item));
  }
  useEffect(() => { void loadThreads().finally(() => setLoading(false)); const timer = window.setInterval(() => void loadThreads(), 12_000); return () => window.clearInterval(timer); }, []);
  async function send() {
    if (!selected || !draft.trim()) return;
    setLoading(true); const response = await fetch(`/api/admin/users/${selected.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: draft.trim() }) });
    const data = await response.json() as { message?: Message; error?: string }; setLoading(false);
    if (!response.ok || !data.message) return setError(data.error ?? "Зурвас илгээж чадсангүй.");
    setMessages((current) => [...current, data.message!]); setDraft(""); void loadThreads();
  }
  return <section className="admin-chat-page"><div className="admin-chat-heading"><p className="section-kicker">ХЭРЭГЛЭГЧИЙН ЗУРВАС</p><h1>Chat төв</h1><span>Хэрэглэгчийн feedback болон admin notification.</span></div><div className="admin-chat-workspace"><aside>{loading && !threads.length ? <p>Ачаалж байна…</p> : threads.map((thread) => <button className={selected?.id === thread.id ? "active" : ""} key={thread.id} onClick={() => void openThread(thread)}><i>{thread.name.slice(0, 1).toUpperCase()}</i><span><b>{thread.name}</b><small>{thread.latest}</small></span>{thread.unread > 0 && <em>{thread.unread}</em>}</button>)}{!threads.length && !loading && <p>Одоогоор feedback алга.</p>}</aside><main>{selected ? <><header><b>{selected.name}</b><small>{selected.contact}</small></header><div className="admin-chat-thread">{messages.map((message) => <article key={message.id} className={message.sender_role}><b>{message.sender_role === "admin" ? "Та" : selected.name}</b><p>{message.body}</p><small>{new Intl.DateTimeFormat("mn-MN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}</small></article>)}</div><div className="admin-chat-input"><textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Хэрэглэгч рүү бичих…" /><button className="primary-button" disabled={loading || !draft.trim()} onClick={() => void send()}>Илгээх</button></div></> : <div className="admin-chat-empty">Зүүн талын хэрэглэгчээс chat сонгоно уу.</div>}</main></div>{error && <p className="form-error">⚠ {error}</p>}</section>;
}
