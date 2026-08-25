"use client";
import { useState } from "react";
import type { Category } from "@/lib/categories";
export function AdminCategories({ initial }: { initial: Category[] }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  async function add(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as {
      category?: Category;
      error?: string;
    };
    if (!response.ok || !data.category)
      return setError(data.error ?? "Алдаа гарлаа.");
    setItems((current) =>
      [...current, data.category!].sort((a, b) =>
        a.name.localeCompare(b.name, "mn"),
      ),
    );
    setName("");
    setError("");
  }
  async function edit(item: Category) {
    const next = window.prompt("Ангиллын шинэ нэр", item.name)?.trim();
    if (!next || next === item.name) return;
    const response = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, name: next }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, name: next } : value,
        ),
      );
  }
  async function remove(item: Category) {
    if (!window.confirm(`“${item.name}” ангиллыг устгах уу?`)) return;
    const response = await fetch(
      `/api/admin/categories?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" },
    );
    if (response.ok)
      setItems((current) => current.filter((value) => value.id !== item.id));
  }
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h1>Ангилал</h1>
          <p>Navigation болон upload form-д харагдах ангиллууд</p>
        </div>
      </div>
      <form className="category-create" onSubmit={add}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Шинэ ангиллын нэр"
        />
        <button className="primary-button">＋ Нэмэх</button>
      </form>
      {error && <p className="form-error">⚠ {error}</p>}
      <div className="category-admin-list">
        {items.map((item) => (
          <article key={item.id}>
            <b>{item.name}</b>
            <div>
              <button onClick={() => void edit(item)}>Засах</button>
              <button className="danger" onClick={() => void remove(item)}>
                Устгах
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
