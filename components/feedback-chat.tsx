"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; sender_role: "user" | "admin"; body: string; created_at: string };

export function FeedbackChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<Message>();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const ids = useRef(new Set<string>());
  const initialized = useRef(false);
  async function loadMessages(notify = false) {
    const response = await fetch("/api/messages", { cache: "no-store" });
    if (response.status === 401) { setAvailable(false); return; }
    const data = await response.json() as { messages?: Message[]; error?: string };
    if (!response.ok) { setError(data.error ?? "Зурвасуудыг авч чадсангүй."); return; }
    const next = data.messages ?? [];
    const incoming = next.filter((message) => message.sender_role === "admin" && initialized.current && !ids.current.has(message.id));
    ids.current = new Set(next.map((message) => message.id)); initialized.current = true;
    setAvailable(true); setMessages(next);
    if (notify && incoming.length) {
      const latest = incoming.at(-1);
      setUnread((value) => value + incoming.length); setToast(latest);
      if (latest && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const systemNotification = new Notification("Хүрээ админ", { body: latest.body, icon: "/pwa/icon-192.png", tag: "khuree-admin-message" });
        systemNotification.onclick = () => { window.focus(); openChat(); systemNotification.close(); };
      }
    }
  }
  useEffect(() => {
    if (typeof Notification !== "undefined") setNotificationPermission(Notification.permission);
    setLoading(true); setError("");
    void loadMessages().catch(() => setError("Сүлжээний алдаа гарлаа.")).finally(() => setLoading(false));
    const timer = window.setInterval(() => void loadMessages(true).catch(() => {}), 12_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!available || notificationPermission !== "default" || typeof Notification === "undefined") return;
    const askNativePermission = () => { void Notification.requestPermission().then(setNotificationPermission); };
    window.addEventListener("pointerdown", askNativePermission, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", askNativePermission, true);
  }, [available, notificationPermission]);
  async function send() {
    const message = draft.trim();
    if (!message || loading) return;
    setLoading(true); setError("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
    const data = await response.json() as { message?: Message; error?: string };
    setLoading(false);
    if (!response.ok || !data.message) return setError(data.error ?? "Зурвас илгээж чадсангүй.");
    ids.current.add(data.message.id); setMessages((current) => [...current, data.message!]); setDraft("");
  }
  function openChat() { setOpen(true); setUnread(0); setToast(undefined); }
  return <div className="feedback-chat">{toast && <button className="feedback-chat-toast" onClick={openChat}><b>Хүрээ админ</b><span>{toast.body}</span></button>}<button className="feedback-chat-trigger" onClick={() => open ? setOpen(false) : openChat()} aria-expanded={open}>▰ <span>Санал хүсэлт</span>{unread > 0 && <em>{unread}</em>}</button>{open && <section className="feedback-chat-panel"><header><div><small>ХҮРЭЭ ТУСЛАМЖ</small><b>Админ руу бичих</b></div><button onClick={() => setOpen(false)} aria-label="Хаах">×</button></header>{loading && !messages.length ? <p className="feedback-chat-empty">Түр хүлээнэ үү…</p> : !available && !error ? <p className="feedback-chat-empty">Зурвас бичихийн тулд эхлээд нэвтэрнэ үү.</p> : <><div className="feedback-chat-list">{messages.map((message) => <article className={message.sender_role} key={message.id}><b>{message.sender_role === "admin" ? "Хүрээ админ" : "Та"}</b><p>{message.body}</p><small>{new Intl.DateTimeFormat("mn-MN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}</small></article>)}{!messages.length && <p className="feedback-chat-empty">Санал, хүсэлтээ энд бичээрэй.</p>}</div><div className="feedback-chat-compose"><textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Зурвасаа бичнэ үү…" /><button disabled={loading || !draft.trim()} onClick={() => void send()}>Илгээх</button></div></>}{error && <p className="form-error">⚠ {error}</p>}</section>}</div>;
}
