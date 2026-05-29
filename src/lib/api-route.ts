import "server-only";

import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);

/** Compress JSON bodies at or above this size when the client accepts gzip. */
const COMPRESSION_THRESHOLD_BYTES = 1024;

export function stripNullishReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export function serializeApiJson(data: unknown): string {
  return JSON.stringify(data, stripNullishReplacer);
}

function acceptsGzip(request: Request | undefined): boolean {
  const accept = request?.headers.get("accept-encoding") ?? "";
  return accept.includes("gzip");
}

export interface CacheControlOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}

export interface ApiJsonResponseOptions {
  status?: number;
  headers?: HeadersInit;
  request?: Request;
}

function buildCacheControlHeader(options?: CacheControlOptions): string | null {
  if (!options) {
    return null;
  }

  const parts: string[] = [];
  if (options.maxAge !== undefined) {
    parts.push(`max-age=${options.maxAge}`);
  }
  if (options.sMaxAge !== undefined) {
    parts.push(`s-maxage=${options.sMaxAge}`);
  }
  if (options.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

export async function apiJsonResponse(
  data: unknown,
  cacheControl?: CacheControlOptions,
  options?: ApiJsonResponseOptions,
): Promise<Response> {
  const json = serializeApiJson(data);
  const bodyBytes = Buffer.from(json, "utf-8");

  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  const cacheHeader = buildCacheControlHeader(cacheControl);
  if (cacheHeader) {
    headers.set("Cache-Control", cacheHeader);
  }

  const shouldCompress =
    bodyBytes.length >= COMPRESSION_THRESHOLD_BYTES && acceptsGzip(options?.request);

  if (shouldCompress) {
    const compressed = await gzipAsync(bodyBytes);
    headers.set("Content-Encoding", "gzip");
    headers.set("Vary", "Accept-Encoding");
    return new Response(compressed, {
      status: options?.status ?? 200,
      headers,
    });
  }

  return new Response(json, {
    status: options?.status ?? 200,
    headers,
  });
}

export async function apiErrorResponse(
  data: unknown,
  status: number,
  options?: ApiJsonResponseOptions,
): Promise<Response> {
  return apiJsonResponse(data, undefined, { ...options, status });
}
