"use client";

import { useEffect, useState } from "react";

type Message = { id: string; sender_role: "user" | "admin"; body: string; created_at: string };

export function FeedbackChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setLoading(true); setError("");
    fetch("/api/messages", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return setAvailable(false);
      const data = await response.json() as { messages?: Message[]; error?: string };
      if (!response.ok) setError(data.error ?? "Зурвасуудыг авч чадсангүй.");
      else { setAvailable(true); setMessages(data.messages ?? []); }
    }).catch(() => setError("Сүлжээний алдаа гарлаа.")).finally(() => setLoading(false));
  }, [open]);
  async function send() {
    const message = draft.trim();
    if (!message || loading) return;
    setLoading(true); setError("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
    const data = await response.json() as { message?: Message; error?: string };
    setLoading(false);
    if (!response.ok || !data.message) return setError(data.error ?? "Зурвас илгээж чадсангүй.");
    setMessages((current) => [...current, data.message!]); setDraft("");
  }
  return <div className="feedback-chat"><button className="feedback-chat-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>▰ <span>Санал хүсэлт</span></button>{open && <section className="feedback-chat-panel"><header><div><small>ХҮРЭЭ ТУСЛАМЖ</small><b>Админ руу бичих</b></div><button onClick={() => setOpen(false)} aria-label="Хаах">×</button></header>{loading && !messages.length ? <p className="feedback-chat-empty">Түр хүлээнэ үү…</p> : !available && !error ? <p className="feedback-chat-empty">Зурвас бичихийн тулд эхлээд нэвтэрнэ үү.</p> : <><div className="feedback-chat-list">{messages.map((message) => <article className={message.sender_role} key={message.id}><b>{message.sender_role === "admin" ? "Хүрээ админ" : "Та"}</b><p>{message.body}</p><small>{new Intl.DateTimeFormat("mn-MN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}</small></article>)}{!messages.length && <p className="feedback-chat-empty">Санал, хүсэлтээ энд бичээрэй.</p>}</div><div className="feedback-chat-compose"><textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Зурвасаа бичнэ үү…" /><button disabled={loading || !draft.trim()} onClick={() => void send()}>Илгээх</button></div></>}{error && <p className="form-error">⚠ {error}</p>}</section>}</div>;
}
