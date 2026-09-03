"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminUserItem } from "@/lib/admin-users";

const formatDateTime = (value?: string) => {
  if (!value) return { date: "Ороогүй", time: "—" };
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
    time: new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date),
  };
};
const remainingDays = (value?: string) => value ? Math.max(1, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : 30;
const planNames: Record<string, string> = { movie: "Кино", series: "Олон ангит", vertical: "Босоо драма", adult: "+18", vip: "VIP" };
const ONLINE_WINDOW_MS = 3 * 60_000;
const PRESENCE_REFRESH_INTERVAL_MS = 15_000;
type UserFilter = "all" | "vip" | "packages" | "none";
const money = new Intl.NumberFormat("mn-MN");

export function AdminUsers({ initial }: { initial: AdminUserItem[] }) {
  const [users, setUsers] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [saving, setSaving] = useState<string>();
  const [error, setError] = useState("");
  const [accessUser, setAccessUser] = useState<AdminUserItem>();
  const [deleteUser, setDeleteUser] = useState<AdminUserItem>();
  const [deviceUser, setDeviceUser] = useState<AdminUserItem>();
  const [accessDays, setAccessDays] = useState(30);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/admin/users/presence", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { users: { id: string; lastSeenAt?: string; watching?: AdminUserItem["watching"] }[]; checkedAt: string };
      const presence = new Map(data.users.map((user) => [user.id, user]));
      setUsers((current) => current.map((user) => ({ ...user, lastSeenAt: presence.get(user.id)?.lastSeenAt, watching: presence.get(user.id)?.watching })));
      setCheckedAt(new Date(data.checkedAt).getTime());
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), PRESENCE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);
  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("mn");
    return users.filter((user) => {
      const matchesFilter = filter === "all" || (filter === "vip" ? user.qpayPaidPlans.includes("vip") : filter === "packages" ? !user.qpayPaidPlans.includes("vip") && user.qpayPaidCount > 0 : user.qpayPaidCount === 0);
      const matchesQuery = !value || [user.name, user.phone, user.email, user.watching?.title ?? ""].some((field) => field.toLocaleLowerCase("mn").includes(value));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, users]);
  const paymentSummary = useMemo(() => ({
    total: users.reduce((sum, user) => sum + user.qpayPaidAmount, 0),
    count: users.reduce((sum, user) => sum + user.qpayPaidCount, 0),
    vip: users.filter((user) => user.qpayPaidPlans.includes("vip")).length,
    packages: users.filter((user) => !user.qpayPaidPlans.includes("vip") && user.qpayPaidCount > 0).length,
    none: users.filter((user) => user.qpayPaidCount === 0).length,
  }), [users]);

  async function setPermission(user: AdminUserItem, permission: "movie" | "series" | "vertical" | "adult", allowed: boolean) {
    setSaving(user.id);
    setError("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permission, allowed }),
    });
    const data = await response.json() as { error?: string };
    setSaving(undefined);
    if (!response.ok) return setError(data.error ?? "Эрхийг өөрчилж чадсангүй.");
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, watchPermissions: { ...item.watchPermissions, [permission]: allowed } } : item));
  }
  async function updateAccess(action: "grant" | "revoke") {
    if (!accessUser) return;
    setSaving(accessUser.id); setError("");
    const response = await fetch(`/api/admin/users/${accessUser.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, days: accessDays }) });
    const data = await response.json() as { error?: string; entitlement?: { enabled: boolean; expiresAt?: string; activePlans?: string[] } };
    setSaving(undefined);
    if (!response.ok || !data.entitlement) return setError(data.error ?? "Эрх шинэчилж чадсангүй.");
    setUsers((current) => current.map((user) => user.id === accessUser.id ? { ...user, accessEnabled: data.entitlement!.enabled, accessExpiresAt: data.entitlement!.expiresAt, activePlans: data.entitlement!.activePlans ?? user.activePlans } : user));
    setAccessUser(undefined);
  }
  async function confirmDelete() {
    if (!deleteUser) return;
    setSaving(deleteUser.id); setError("");
    const response = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    setSaving(undefined);
    if (!response.ok) return setError(data.error ?? "Хэрэглэгчийг устгаж чадсангүй.");
    setUsers((current) => current.filter((user) => user.id !== deleteUser.id));
    setDeleteUser(undefined);
  }
  async function removeDevice(deviceId: string) {
    if (!deviceUser) return;
    setSaving(deviceId); setError("");
    const response = await fetch(`/api/admin/users/${deviceUser.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "remove_device", deviceId }) });
    const data = await response.json() as { devices?: AdminUserItem["devices"]; error?: string };
    setSaving(undefined);
    if (!response.ok || !data.devices) return setError(data.error ?? "Төхөөрөмж хасаж чадсангүй.");
    const updated = { ...deviceUser, devices: data.devices };
    setDeviceUser(updated);
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  }

  return <>
    <div className="admin-toolbar user-admin-toolbar">
      <div><p className="section-kicker">ХЭРЭГЛЭГЧИЙН УДИРДЛАГА</p><h1>Хэрэглэгчид</h1><div className="user-summary"><span><b>{users.length}</b> нийт</span><span className="online-count"><i /> <b>{users.filter((user) => user.lastSeenAt && checkedAt - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW_MS).length}</b> онлайн</span><span><b>{users.filter((user) => user.accessEnabled).length}</b> эрхтэй</span></div></div>
      <div className="admin-payment-summary"><small>QPAY ОРЛОГО</small><strong>₮{money.format(paymentSummary.total)}</strong><span>{paymentSummary.count} төлөлт · Гараар олгосон эрх ороогүй</span></div>
      <label className="user-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр, утас, имэйлээр хайх" /></label>
    </div>
    <div className="user-filter-tabs" role="tablist" aria-label="Хэрэглэгчийн ангилал">{([ ["all", `Бүгд · ${users.length}`], ["vip", `Бүтэн VIP · ${paymentSummary.vip}`], ["packages", `1–3 багц · ${paymentSummary.packages}`], ["none", `Эрх аваагүй · ${paymentSummary.none}`] ] as [UserFilter, string][]).map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {error && <p className="form-error">⚠ {error}</p>}
    <div className="admin-table users-table">
      <div className="table-head"><span>ХЭРЭГЛЭГЧ</span><span>ТӨЛӨВ</span><span>ИДЭВХ</span><span>ЕРӨНХИЙ ЭРХ</span><span>ҮЗЭХ ЗӨВШӨӨРӨЛ</span><span>ҮЙЛДЭЛ</span></div>
      {visible.map((user) => { const created = formatDateTime(user.createdAt); const lastSignIn = formatDateTime(user.lastSignInAt); const lastSeen = formatDateTime(user.lastSeenAt); const online = Boolean(user.lastSeenAt && checkedAt - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW_MS); return <div className="table-row" key={user.id}>
        <div className="title-cell user-identity"><i className={online ? "user-online-avatar" : ""}>{user.name.slice(0, 1).toUpperCase()}</i><span><b>{user.name}</b><small>{user.phone || user.email || "Холбоо барих мэдээлэлгүй"}</small><em>{user.qpayPaidPlans.includes("vip") ? "QPAY VIP" : user.qpayPaidCount ? "QPAY БАГЦ" : "ЭРХ АВААГҮЙ"}</em></span></div>
        <span className={`presence-status ${online ? "online" : "offline"}`}><b><i />{online ? "Онлайн" : "Офлайн"}</b><small>{user.watching ? "Одоо үзэж байна" : online ? "Яг одоо сайтад байна" : user.lastSeenAt ? `${lastSeen.date} · ${lastSeen.time}` : "Одоогоор мэдээлэлгүй"}</small>{user.watching && <em className="watching-title">{user.watching.title}</em>}</span>
        <span className="user-activity"><b>Сүүлд нэвтэрсэн</b><span>{lastSignIn.date} · {lastSignIn.time}</span><small>Бүртгүүлсэн: {created.date}</small></span>
        <button className={`access-manage ${user.accessEnabled ? "active" : "expired"}`} onClick={() => { setAccessUser(user); setAccessDays(remainingDays(user.accessExpiresAt)); }}><span>{user.accessEnabled ? "● Эрх нээлттэй" : "○ Эрх хаалттай"}</span><b>{user.accessEnabled ? (user.accessExpiresAt ? formatDateTime(user.accessExpiresAt).date : "Хугацаагүй") : "Тохируулах"}</b><small>{user.activePlans.length ? user.activePlans.map((plan) => planNames[plan] ?? plan).join(" · ") : "Ерөнхий эрх"}</small></button>
        <div className="permission-group">{(["movie", "series", "vertical", "adult"] as const).map((permission) => { const label = permission === "movie" ? "Кино" : permission === "series" ? "Олон ангит" : permission === "vertical" ? "Босоо" : "+18"; return <button title={`${label}: ${user.watchPermissions[permission] ? "Нээлттэй" : "Хаалттай"}`} key={permission} className={`permission-toggle ${user.watchPermissions[permission] ? "enabled" : "disabled"}`} disabled={saving === user.id || user.role === "admin"} onClick={() => void setPermission(user, permission, !user.watchPermissions[permission])}><i>{saving === user.id ? "…" : user.watchPermissions[permission] ? "✓" : "×"}</i><span>{label}</span></button>; })}</div>
        <div className="user-row-actions"><button className="user-devices-button" onClick={() => setDeviceUser(user)}>▣ {user.devices.length} / {user.role === "admin" ? "∞" : "3"}</button><button className="user-delete-button" disabled={saving === user.id || user.role === "admin"} onClick={() => setDeleteUser(user)}>{user.role === "admin" ? "Хамгаалагдсан" : "Устгах"}</button></div>
      </div>})}
      {!visible.length && <p className="empty-catalog">Хэрэглэгч олдсонгүй.</p>}
    </div>
    {accessUser && <div className="device-modal-backdrop access-modal-backdrop"><section className="device-modal access-modal"><button className="access-modal-close" aria-label="Хаах" onClick={() => setAccessUser(undefined)}>×</button><div className="access-modal-heading"><i>◇</i><div><p className="section-kicker">НЭГДСЭН ЭРХИЙН УДИРДЛАГА</p><h2>{accessUser.name}</h2></div></div><p>QPay болон гараар олгосон бүх эрхийг нэг дороос удирдана. Хугацааг өөрчилбөл тухайн хэрэглэгчийн эрх шууд шинэчлэгдэнэ.</p><div className={`access-status-card ${accessUser.accessEnabled ? "enabled" : "disabled"}`}><div><span><i />{accessUser.accessEnabled ? "ЭРХ ИДЭВХТЭЙ" : "ЭРХ ХААЛТТАЙ"}</span><b>{accessUser.activePlans.length ? accessUser.activePlans.map((plan) => planNames[plan] ?? plan).join(" · ") : "Гараар олгосон ерөнхий эрх"}</b></div><em>{accessUser.accessEnabled ? <><strong>{remainingDays(accessUser.accessExpiresAt)}</strong> хоног</> : "—"}</em><small>{accessUser.accessEnabled && accessUser.accessExpiresAt ? `Дуусах: ${formatDateTime(accessUser.accessExpiresAt).date}` : "Одоогоор үзэх боломжгүй"}</small></div><div className="access-days-field"><label htmlFor="access-days"><span>Өнөөдрөөс эхлэх хугацаа</span><small>1–3650 хоног</small></label><div><button type="button" onClick={() => setAccessDays((days) => Math.max(1, days - 1))}>−</button><input id="access-days" type="number" min="1" max="3650" value={accessDays} onChange={(event) => setAccessDays(Number(event.target.value))} /><b>хоног</b><button type="button" onClick={() => setAccessDays((days) => Math.min(3650, days + 1))}>＋</button></div></div><p className="access-helper"><i>i</i><span>Хадгалах үед дуусах хугацааг өнөөдрөөс шинээр тооцно. Одоогийн хугацааг өсгөж эсвэл багасгаж болно.</span></p><div className="device-modal-actions access-modal-actions"><button className="primary-button" disabled={saving === accessUser.id} onClick={() => void updateAccess("grant")}>{saving === accessUser.id ? "Хадгалж байна…" : "✓ Хугацааг хадгалж нээх"}</button><button className="danger-button" disabled={saving === accessUser.id} onClick={() => void updateAccess("revoke")}>⊘ Бүх эрхийг хаах</button></div></section></div>}
    {deleteUser && <div className="device-modal-backdrop"><section className="device-modal access-modal delete-access-modal"><button className="access-modal-close" aria-label="Хаах" onClick={() => setDeleteUser(undefined)}>×</button><p className="section-kicker">ХЭРЭГЛЭГЧ УСТГАХ</p><h2>{deleteUser.name}</h2><p>Энэ хэрэглэгчийн нэвтрэх бүртгэл болон profile мэдээлэл бүрмөсөн устна. Энэ үйлдлийг буцаах боломжгүй.</p><div className="device-summary"><b>{deleteUser.phone || deleteUser.email || deleteUser.id}</b></div><div className="device-modal-actions"><button className="danger-button" disabled={saving === deleteUser.id} onClick={() => void confirmDelete()}>{saving === deleteUser.id ? "Устгаж байна…" : "Бүрмөсөн устгах"}</button><button disabled={saving === deleteUser.id} onClick={() => setDeleteUser(undefined)}>Болих</button></div></section></div>}
    {deviceUser && <div className="device-modal-backdrop access-modal-backdrop"><section className="device-modal access-modal admin-device-manager"><button className="access-modal-close" aria-label="Хаах" onClick={() => setDeviceUser(undefined)}>×</button><p className="section-kicker">ТӨХӨӨРӨМЖИЙН УДИРДЛАГА</p><h2>{deviceUser.name}</h2><p>{deviceUser.phone || deviceUser.email} · {deviceUser.devices.length} / {deviceUser.role === "admin" ? "∞" : "3"} төхөөрөмж</p><div className="admin-device-list">{deviceUser.devices.map((device) => <article key={device.id}><i>▣</i><div><b>{device.name}</b><small>Сүүлд ашигласан: {formatDateTime(device.lastSeenAt).date} · {formatDateTime(device.lastSeenAt).time}</small></div><button disabled={saving === device.id} onClick={() => void removeDevice(device.id)}>{saving === device.id ? "Хасаж байна…" : "Хасах"}</button></article>)}{!deviceUser.devices.length && <div className="record-empty">Бүртгэлтэй төхөөрөмж байхгүй.</div>}</div></section></div>}
  </>;
}
