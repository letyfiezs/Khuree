"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminChatLink({ active }: { active: boolean }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = async () => { const response = await fetch("/api/admin/messages", { cache: "no-store" }); if (!response.ok) return; const data = await response.json() as { threads?: { unread: number }[] }; setUnread((data.threads ?? []).reduce((sum, thread) => sum + thread.unread, 0)); };
    void load(); const timer = window.setInterval(() => void load(), 12_000); return () => window.clearInterval(timer);
  }, []);
  return <Link className={active ? "active" : ""} href="/admin/chat">◌ <span>Chat</span>{unread > 0 && <em className="admin-chat-badge">{unread}</em>}</Link>;
}
