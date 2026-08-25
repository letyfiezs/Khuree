import "server-only";

const CLASS_A = new Set([
  "ListBuckets", "PutBucket", "ListObjects", "PutObject", "CopyObject",
  "CompleteMultipartUpload", "CreateMultipartUpload", "LifecycleStorageTierTransition",
  "ListMultipartUploads", "UploadPart", "UploadPartCopy", "ListParts",
  "PutBucketEncryption", "PutBucketCors", "PutBucketLifecycleConfiguration",
]);
const CLASS_B = new Set([
  "HeadBucket", "HeadObject", "GetObject", "UsageSummary", "GetBucketEncryption",
  "GetBucketLocation", "GetBucketCors", "GetBucketLifecycleConfiguration",
]);

export type R2OperationMetrics = {
  configured: boolean;
  classA: number;
  classB: number;
  other: number;
  classARemaining: number;
  classBRemaining: number;
  classACostUsd: number;
  classBCostUsd: number;
  periodStart: string;
  periodEnd: string;
  error?: string;
};

let cached: { expiresAt: number; value: R2OperationMetrics } | undefined;

export async function getR2OperationMetrics(): Promise<R2OperationMetrics> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const accountTag = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const base = {
    classA: 0, classB: 0, other: 0,
    classARemaining: 1_000_000, classBRemaining: 10_000_000,
    classACostUsd: 0, classBCostUsd: 0,
    periodStart: start.toISOString(), periodEnd: now.toISOString(),
  };
  if (!accountTag || !bucketName || !token) {
    return { configured: false, ...base, error: "Cloudflare Analytics API token тохируулаагүй." };
  }
  const query = `query R2Operations($accountTag: string!, $startDate: Time!, $endDate: Time!, $bucketName: string!) {
    viewer { accounts(filter: { accountTag: $accountTag }) {
      r2OperationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $startDate, datetime_leq: $endDate, bucketName: $bucketName }) {
        sum { requests }
        dimensions { actionType }
      }
    } }
  }`;
  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { accountTag, bucketName, startDate: start.toISOString(), endDate: now.toISOString() } }),
      cache: "no-store",
    });
    const payload = await response.json() as {
      data?: { viewer?: { accounts?: { r2OperationsAdaptiveGroups?: { sum?: { requests?: number }; dimensions?: { actionType?: string } }[] }[] } };
      errors?: { message?: string }[];
    };
    if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message || `Cloudflare API ${response.status}`);
    const groups = payload.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups ?? [];
    let classA = 0, classB = 0, other = 0;
    for (const group of groups) {
      const requests = Number(group.sum?.requests ?? 0);
      const action = group.dimensions?.actionType ?? "";
      if (CLASS_A.has(action)) classA += requests;
      else if (CLASS_B.has(action)) classB += requests;
      else other += requests;
    }
    const value: R2OperationMetrics = {
      configured: true, classA, classB, other,
      classARemaining: Math.max(0, 1_000_000 - classA),
      classBRemaining: Math.max(0, 10_000_000 - classB),
      classACostUsd: Math.ceil(Math.max(0, classA - 1_000_000) / 1_000_000) * 4.5,
      classBCostUsd: Math.ceil(Math.max(0, classB - 10_000_000) / 1_000_000) * 0.36,
      periodStart: start.toISOString(), periodEnd: now.toISOString(),
    };
    cached = { expiresAt: Date.now() + 5 * 60_000, value };
    return value;
  } catch (error) {
    return { configured: false, ...base, error: error instanceof Error ? error.message : "Cloudflare metrics татаж чадсангүй." };
  }
}
