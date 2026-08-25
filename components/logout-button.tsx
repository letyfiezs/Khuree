"use client";
export function LogoutButton() {
  return (
    <button
      className="logout-button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Гарах
    </button>
  );
}
