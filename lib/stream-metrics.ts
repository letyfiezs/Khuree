import "server-only";

const ACTIVE_WINDOW_MS = 45_000;
const streams = new Map<string, { bitrateKbps?: number; lastSeenAt: number }>();

export function reportStreamMetric(sessionId: string, bitrateKbps?: number) {
  streams.set(sessionId, {
    bitrateKbps: typeof bitrateKbps === "number" && Number.isFinite(bitrateKbps) && bitrateKbps > 0 && bitrateKbps <= 100_000 ? bitrateKbps : undefined,
    lastSeenAt: Date.now(),
  });
}

export function removeStreamMetric(sessionId: string) {
  streams.delete(sessionId);
}

export function getActiveStreamMetrics() {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [sessionId, stream] of streams) if (stream.lastSeenAt < cutoff) streams.delete(sessionId);
  const active = [...streams.values()];
  const measured = active.filter((stream) => stream.bitrateKbps);
  const bitrateKbps = measured.reduce((sum, stream) => sum + (stream.bitrateKbps ?? 0), 0);
  return {
    activeStreams: active.length,
    measuredStreams: measured.length,
    bitrateKbps: Math.round(bitrateKbps),
    averageBitrateKbps: measured.length ? Math.round(bitrateKbps / measured.length) : 0,
  };
}
