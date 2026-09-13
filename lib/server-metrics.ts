import "server-only";

import { readFile, statfs } from "node:fs/promises";
import { cpus, loadavg, platform } from "node:os";

type CpuSample = { total: number; idle: number };
type NetworkSample = { received: number; sent: number; at: number };

let previousCpu: CpuSample | undefined;
let previousNetwork: NetworkSample | undefined;

const numberFrom = (source: string, key: string) => {
  const match = source.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
  return match ? Number(match[1]) : 0;
};

async function linuxMetrics() {
  const [cpuSource, memorySource, networkSource, uptimeSource, disk] = await Promise.all([
    readFile("/proc/stat", "utf8"),
    readFile("/proc/meminfo", "utf8"),
    readFile("/proc/net/dev", "utf8"),
    readFile("/proc/uptime", "utf8"),
    statfs("/"),
  ]);
  const cpuValues = cpuSource.match(/^cpu\s+(.+)$/m)?.[1].trim().split(/\s+/).map(Number) ?? [];
  const currentCpu = {
    total: cpuValues.reduce((sum, value) => sum + value, 0),
    idle: (cpuValues[3] ?? 0) + (cpuValues[4] ?? 0),
  };
  const cpuPercent = previousCpu
    ? Math.max(0, Math.min(100, (1 - (currentCpu.idle - previousCpu.idle) / Math.max(1, currentCpu.total - previousCpu.total)) * 100))
    : 0;
  previousCpu = currentCpu;

  const network = networkSource.split("\n").slice(2).reduce((total, line) => {
    const [name, values] = line.trim().split(":");
    if (!name || !values || name === "lo") return total;
    const fields = values.trim().split(/\s+/).map(Number);
    return { received: total.received + (fields[0] ?? 0), sent: total.sent + (fields[8] ?? 0) };
  }, { received: 0, sent: 0 });
  const now = Date.now();
  const currentNetwork = { ...network, at: now };
  const elapsedSeconds = previousNetwork ? Math.max(0.001, (now - previousNetwork.at) / 1000) : 0;
  const receivedPerSecond = previousNetwork ? Math.max(0, (network.received - previousNetwork.received) / elapsedSeconds) : 0;
  const sentPerSecond = previousNetwork ? Math.max(0, (network.sent - previousNetwork.sent) / elapsedSeconds) : 0;
  const networkSampled = Boolean(previousNetwork);
  previousNetwork = currentNetwork;

  const memoryTotal = numberFrom(memorySource, "MemTotal") * 1024;
  const memoryAvailable = numberFrom(memorySource, "MemAvailable") * 1024;
  const memoryUsed = Math.max(0, memoryTotal - memoryAvailable);
  const diskTotal = Number(disk.blocks) * Number(disk.bsize);
  const diskFree = Number(disk.bavail) * Number(disk.bsize);
  const diskUsed = Math.max(0, diskTotal - diskFree);

  return {
    available: true,
    cpu: { percent: Math.round(cpuPercent * 10) / 10, cores: cpus().length, load: loadavg().map((value) => Math.round(value * 100) / 100) },
    memory: { total: memoryTotal, used: memoryUsed, percent: memoryTotal ? Math.round(memoryUsed / memoryTotal * 1000) / 10 : 0 },
    disk: { total: diskTotal, used: diskUsed, percent: diskTotal ? Math.round(diskUsed / diskTotal * 1000) / 10 : 0 },
    network: { receivedPerSecond, sentPerSecond, sampled: networkSampled },
    uptimeSeconds: Math.floor(Number(uptimeSource.split(" ")[0]) || 0),
  };
}

export async function getServerMetrics() {
  try {
    const metrics = await linuxMetrics();
    const constrained = metrics.cpu.percent >= 90 || metrics.memory.percent >= 92 || metrics.disk.percent >= 95;
    const warning = metrics.cpu.percent >= 75 || metrics.memory.percent >= 82 || metrics.disk.percent >= 85;
    return { ...metrics, platform: platform(), health: constrained ? "critical" : warning ? "warning" : "healthy", process: { uptimeSeconds: Math.floor(process.uptime()), memoryBytes: process.memoryUsage().rss } };
  } catch {
    return { available: false, platform: platform(), health: "unknown" as const };
  }
}
