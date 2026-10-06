"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SegmentResponse = {
  videoUrl?: string;
  segmentMinutes?: 3 | 5;
};

export function VerticalPartList({ slug }: { slug: string }) {
  const [source, setSource] = useState("");
  const [segmentMinutes, setSegmentMinutes] = useState<3 | 5>(3);
  const [partCount, setPartCount] = useState(0);
  const [message, setMessage] = useState("Хэсгүүдийг тооцоолж байна…");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/vertical/${encodeURIComponent(slug)}/segments`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 403 ? "Үзэх эрхтэй төхөөрөмжөөс хэсгүүдийг сонгоно уу." : "Хэсгүүдийг ачаалж чадсангүй.");
      return response.json() as Promise<SegmentResponse>;
    }).then((data) => {
      if (!data.videoUrl) throw new Error("Видео холбоогүй байна.");
      setSegmentMinutes(data.segmentMinutes === 5 ? 5 : 3);
      setSource(data.videoUrl);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Хэсгүүдийг ачаалж чадсангүй.");
    });
    return () => controller.abort();
  }, [slug]);

  return (
    <div className="vertical-detail-parts-list">
      {source && partCount === 0 && (
        <video
          className="vertical-duration-probe"
          src={source}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (Number.isFinite(duration) && duration > 0) {
              setPartCount(Math.max(1, Math.ceil(duration / (segmentMinutes * 60))));
            } else setMessage("Видеоны уртыг уншиж чадсангүй.");
          }}
          onError={() => setMessage("Хэсгүүдийг ачаалж чадсангүй.")}
        />
      )}
      {partCount > 0
        ? Array.from({ length: partCount }, (_, index) => (
          <Link href={`/watch/${encodeURIComponent(slug)}?part=${index + 1}`} key={index}>
            <span>{index + 1}</span>
            <small>{index + 1}-р хэсэг</small>
          </Link>
        ))
        : <p>{message}</p>}
    </div>
  );
}
