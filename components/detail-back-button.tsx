"use client";

import Link from "next/link";

export function DetailBackButton({ fallback }: { fallback: string }) {
  return (
    <Link
      href={fallback}
      className="detail-back-button"
      aria-label="Өмнөх хэсэг рүү буцах"
    >
      <span aria-hidden="true">←</span> Буцах
    </Link>
  );
}
