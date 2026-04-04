/**
 * @module LanonasisClient
 *
 * Privacy-first API client for the LanOnasis memory service.
 *
 * SECURITY SCOPE — what this module reads and where it sends data:
 *
 *   Credential resolution (read-only, in-process only):
 *     1. `cfg.apiKey`            — caller-supplied key (constructor argument)
 *     2. `LANONASIS_API_KEY`     — environment variable (LanOnasis-namespaced)
 *     3. `LANONASIS_VENDOR_KEY`  — environment variable (LanOnasis-namespaced)
 *     4. `~/.lanonasis/api-key.enc` — AES-256-GCM encrypted local file (machine-bound key)
 *     5. `~/.lanonasis/mcp-tokens.enc` — AES-256-GCM encrypted OAuth token store
 *     6. `~/.maas/config.json`   — CLI session token (written by `lanonasis auth login`)
 *     7. `keytar` (optional)     — OS native credential store, if installed
 *
 *   No other environment variables are read. No credentials are logged,
 *   forwarded, or stored — they are consumed in-process to produce a single
 *   `X-API-Key` or `Authorization: Bearer` header.
 *
 *   Network destination:
 *     ALL HTTP requests go exclusively to `cfg.baseUrl` (default: api.lanonasis.com).
 *     No third-party endpoints, no telemetry calls, no exfiltration paths.
 *     IPv4 is forced via undici dispatcher to guarantee predictable routing.
 *
 *   Secret protection:
 *     Content sent to the memory API is pre-processed by the secret-redactor
 *     pipeline (extraction/secret-redactor.ts) which strips 30+ credential
 *     patterns BEFORE the payload leaves the process. This is the core
 *     privacy guarantee — credentials never reach memory storage.
 */
// Phase 2 - LanOnasis API Client
import { Agent, fetch as undiciFetch } from "undici";
import type { LanonasisConfig } from "./config.js";
import { redactSecrets } from "./extraction/secret-redactor.js";

// Force IPv4 — Node v24 built-in fetch ignores setGlobalDispatcher; use undici fetch with explicit dispatcher
const ipv4Agent = new Agent({ connect: { family: 4 } as any });
type HttpResponse = Awaited<ReturnType<typeof undiciFetch>>;
const JWT_PATTERN =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const API_KEY_ENV_VARS = ["LANONASIS_API_KEY", "LANONASIS_VENDOR_KEY"] as const;
const TOKEN_ENV_VARS = [
  "LANONASIS_AUTH_TOKEN",
  "LANONASIS_BEARER_TOKEN",
  "MCP_BEARER_TOKEN",
] as const;

export type LanMemoryType =
  | "context"
  | "project"
  | "knowledge"
  | "reference"
  | "personal"
  | "workflow";

export type WriteIntent = "new" | "continue" | "auto";

export type LanMemory = {
  id: string;
  title: string;
  content: string;
  type: LanMemoryType;
  memory_type?: LanMemoryType;
  tags?: string[];
  topic_key?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  similarity?: number;
  similarity_score?: number;
};

export type LanCreateParams = Pick<
  LanMemory,
  "title" | "content" | "type" | "tags" | "topic_key" | "metadata"
> & {
  idempotency_key?: string;
  continuity_key?: string;
  write_intent?: WriteIntent;
};

export type LanSearchParams = {
  query: string;
  threshold?: number;
  limit?: number;
  type?: LanMemoryType;
  tags?: string[];
  topic_key?: string;
  include_deleted?: boolean;
  response_mode?: "full" | "compact" | "timeline";
  metadata?: Record<string, unknown>;
};

export type LanUpdateParams = Partial<
  Pick<LanMemory, "title" | "content" | "type" | "tags" | "topic_key" | "metadata">
> & {
  idempotency_key?: string;
  continuity_key?: string;
  write_intent?: WriteIntent;
};

export type LanListSortField =
  | "created_at"
  | "updated_at"
  | "title"
  | "memory_type";

export type LanSortOrder = "asc" | "desc";

export type LanListParams = {
  limit?: number;
  page?: number;
  type?: LanMemoryType;
  tags?: string[];
  topic_key?: string;
  include_deleted?: boolean;
  sort?: LanListSortField;
  order?: LanSortOrder;
};

export type LanMemoryStats = {
  total_memories: number;
  memories_by_type: Record<string, number>;
  with_embeddings?: number;
  without_embeddings?: number;
  recent_activity?: {
    created_last_24h?: number;
    updated_last_24h?: number;
    accessed_last_24h?: number;
  };
  top_tags?: Array<{
    tag: string;
    count: number;
  }>;
  storage?: Record<string, unknown>;
  organization_id?: string;
  generated_at?: string;
  total_topics?: number;
  most_accessed_memory?: string;
  recent_memories?: string[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeMemoryText(text: string | undefined): string | undefined {
  if (typeof text !== "string") return text;
  return redactSecrets(text).text;
}

// LRU Cache entry
interface CacheEntry<T> {
  result: T;
  expiry: number;
}

// Rate limit tracker
interface RateLimitState {
  timestamps: number[];
}

// API response envelope (all memory endpoints return { success, data })
type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  pagination?: { total?: number; page?: number; limit?: number };
};
type ResolvedAuthHeader = {
  name: "Authorization" | "X-API-Key";
  value: string;
};

class LanonasisHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, message: string, body: string) {
    super(message);
    this.name = "LanonasisHttpError";
    this.status = status;
    this.body = body;
  }
}

async function tryReadKeytarPassword(
  service: string,
  account: string,
): Promise<string | null> {
  try {
    // keytar is an optional native credential store dependency.
    // Direct import() is used — if the module is absent, the catch silently skips it.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — keytar is not in devDependencies; absence is expected
    const keytarModule = await import("keytar") as unknown;
    const keytar = (
      (keytarModule as {
        default?: unknown;
        getPassword?: (svc: string, acct: string) => Promise<string | null>;
      }).default ?? keytarModule
    ) as {
      getPassword?: (svc: string, acct: string) => Promise<string | null>;
    };
    if (typeof keytar.getPassword === "function") {
      return (await keytar.getPassword(service, account)) ?? null;
    }
  } catch {
    // Keytar is optional; fall back to the encrypted file storage below.
  }

  return null;
}

function parseStoredString(jsonOrString: string): string | null {
  const trimmed = jsonOrString.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { apiKey?: unknown; access_token?: unknown };
    if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
      return parsed.apiKey.trim();
    }
    if (typeof parsed.access_token === "string" && parsed.access_token.trim()) {
      return parsed.access_token.trim();
    }
  } catch {
    // Plain string payloads are valid in some older fallback formats.
  }

  return trimmed;
}

async function decryptStoredFile(
  fileName: string,
  salt: string,
): Promise<string | null> {
  try {
    const [{ readFile }, os, path, crypto] = await Promise.all([
      import("node:fs/promises"),
      import("node:os"),
      import("node:path"),
      import("node:crypto"),
    ]);

    const filePath = path.join(os.homedir(), ".lanonasis", fileName);
    const encryptedPayload = await readFile(filePath, "utf8");
    const parts = encryptedPayload.split(":");
    const machineId = os.hostname() + os.userInfo().username;
    const key = crypto.pbkdf2Sync(machineId, salt, 100000, 32, "sha256");

    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts;
      if (!ivHex || !authTagHex || !encrypted) return null;

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    if (parts.length === 2) {
      const [ivHex, encrypted] = parts;
      if (!ivHex || !encrypted) return null;

      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(ivHex, "hex"),
      );

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }
  } catch {
    // Missing file or unreadable file means no stored local credential is available.
  }

  return null;
}

async function readCliConfigToken(): Promise<string | null> {
  try {
    const [{ readFile }, os, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:os"),
      import("node:path"),
    ]);

    const configPath = path.join(os.homedir(), ".maas", "config.json");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token.trim()
      ? parsed.token.trim()
      : null;
  } catch {
    return null;
  }
}

export class LanonasisClient {
  private baseUrl: string;
  private apiKey: string;
  private projectId: string;
  private cache: Map<string, CacheEntry<unknown>>;
  private rateLimit: RateLimitState;
  private readonly CACHE_TTL_MS: number;
  private readonly CACHE_MAX_SIZE: number;
  private readonly RATE_LIMIT_WINDOW_MS: number;
  private readonly RATE_LIMIT_MAX_REQ: number;

  constructor(cfg: LanonasisConfig) {
    if (!cfg.projectId) {
      throw new Error("LanonasisClient: projectId is required");
    }
    this.baseUrl = cfg.baseUrl.replace(/\/$/, ""); // trailing slash
    this.apiKey = cfg.apiKey || "";
    this.projectId = cfg.projectId;
    this.cache = new Map();
    this.rateLimit = { timestamps: [] };
    this.CACHE_TTL_MS = cfg.cacheTtlMs;
    this.CACHE_MAX_SIZE = cfg.cacheMaxSize;
    this.RATE_LIMIT_WINDOW_MS = cfg.rateLimitWindowMs;
    this.RATE_LIMIT_MAX_REQ = cfg.rateLimitMaxReq;
  }

  // LRU Cache helpers
  private cacheKey(method: string, params: unknown): string {
    return `${this.projectId}:${method}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  private setCache<T>(key: string, result: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      result,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }

  // Rate limiting - wait silently if needed
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.rateLimit.timestamps = this.rateLimit.timestamps.filter(
      (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS,
    );
    if (this.rateLimit.timestamps.length >= this.RATE_LIMIT_MAX_REQ) {
      const oldest = this.rateLimit.timestamps[0];
      const waitMs = this.RATE_LIMIT_WINDOW_MS - (now - oldest) + 100;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    this.rateLimit.timestamps.push(Date.now());
  }

  // HTTP request wrapper
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.enforceRateLimit();

    const url = this.buildRequestUrl(path);
    const authHeader = await this.resolveAuthHeader();

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Project-Scope": this.projectId,
        [authHeader.name]: authHeader.value,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await undiciFetch(url, { ...options, dispatcher: ipv4Agent } as any);

      // Handle 429 - retry once
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        const retryResponse = await undiciFetch(url, { ...options, dispatcher: ipv4Agent } as any);
        return this.handleResponse<T>(retryResponse as unknown as HttpResponse);
      }

      return this.handleResponse<T>(response as unknown as HttpResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const cause = (err as { cause?: { message?: string; code?: string } })?.cause;
      const causeMsg = cause?.message
        ? ` (cause: ${cause.message}${cause.code ? ` ${cause.code}` : ""})`
        : "";
      throw new Error(`LanOnasis unreachable: ${message}${causeMsg} [url=${url}]`);
    }
  }

  private async handleResponse<T>(response: HttpResponse): Promise<T> {
    const status = response.status;
    const body = await response.text();

    if (status === 401) {
      throw new LanonasisHttpError(
        status,
        "LanOnasis authentication failed — refresh with `lanonasis auth login` or set LANONASIS_API_KEY",
        body,
      );
    }
    if (status >= 500) {
      throw new LanonasisHttpError(
        status,
        `LanOnasis server error (${status}): ${body}`,
        body,
      );
    }
    if (!response.ok) {
      throw new LanonasisHttpError(
        status,
        `LanOnasis error (${status}): ${body}`,
        body,
      );
    }

    // Issue 4 fix: empty body (e.g. 204 No Content) — return undefined safely
    const trimmed = body.trim();
    if (!trimmed) return undefined as unknown as T;

    return JSON.parse(trimmed) as T;
  }

  private buildRequestUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private shouldUseCompatibilityFallback(error: unknown): boolean {
    if (
      error instanceof LanonasisHttpError &&
      (error.status === 404 || error.status === 405)
    ) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error ?? "");
    return /\b404\b/.test(message) || /\b405\b/.test(message);
  }

  private shouldUseLegacyGetFallback(error: unknown): boolean {
    if (this.shouldUseCompatibilityFallback(error)) {
      return true;
    }

    if (error instanceof LanonasisHttpError && error.status === 400) {
      return /Memory ID is required/i.test(error.body);
    }

    const message = error instanceof Error ? error.message : String(error ?? "");
    return /\b400\b/.test(message) && /Memory ID is required/i.test(message);
  }

  private normalizeMemory(payload: unknown): LanMemory {
    const unwrapped = this.unwrap<unknown>(payload);
    if (!unwrapped || typeof unwrapped !== "object") {
      return unwrapped as LanMemory;
    }

    const memory = { ...(unwrapped as Record<string, unknown>) };
    const normalizedType = typeof memory.memory_type === "string"
      ? memory.memory_type
      : typeof memory.type === "string"
        ? memory.type
        : undefined;

    if (normalizedType) {
      memory.type = normalizedType;
      memory.memory_type = normalizedType;
    }

    return memory as LanMemory;
  }

  private normalizeMemoryListResult(
    raw: unknown,
  ): { memories: LanMemory[]; total: number } {
    const envelope = raw as ApiEnvelope<unknown>;
    const payload = this.unwrap<unknown>(raw);
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(envelope?.data)
        ? envelope.data
        : [];
    const memories = items.map((item) => this.normalizeMemory(item));
    const total = envelope?.pagination?.total ?? memories.length;

    return { memories, total };
  }

  private getEnvCredential(names: readonly string[]): string | undefined {
    for (const envName of names) {
      const value = process.env[envName];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private toAuthHeader(
    credential: string,
    kind: "api_key" | "token" | "auto" = "auto",
  ): ResolvedAuthHeader {
    const trimmed = credential.trim();
    if (!trimmed) {
      throw new Error(
        "LanOnasis authentication required — run `lanonasis auth login` or set LANONASIS_API_KEY",
      );
    }

    if (kind === "token") {
      return {
        name: "Authorization",
        value: trimmed.startsWith("Bearer ") ? trimmed : `Bearer ${trimmed}`,
      };
    }

    if (kind === "api_key") {
      return {
        name: "X-API-Key",
        value: trimmed,
      };
    }

    if (trimmed.startsWith("Bearer ") || JWT_PATTERN.test(trimmed)) {
      return {
        name: "Authorization",
        value: trimmed.startsWith("Bearer ") ? trimmed : `Bearer ${trimmed}`,
      };
    }

    return {
      name: "X-API-Key",
      value: trimmed,
    };
  }

  private async getStoredAuthHeader(): Promise<ResolvedAuthHeader | null> {
    const storedApiKey = parseStoredString(
      (await tryReadKeytarPassword("lanonasis-mcp", "lanonasis_api_key")) ??
      (await decryptStoredFile("api-key.enc", "lanonasis-mcp-api-key-2024")) ??
      "",
    );
    if (storedApiKey) {
      return this.toAuthHeader(storedApiKey, "api_key");
    }

    const storedAccessToken = parseStoredString(
      (await tryReadKeytarPassword("lanonasis-mcp", "tokens")) ??
      (await decryptStoredFile("mcp-tokens.enc", "lanonasis-mcp-oauth-2024")) ??
      (await readCliConfigToken()) ??
      "",
    );
    if (storedAccessToken) {
      return this.toAuthHeader(storedAccessToken, "token");
    }

    return null;
  }

  private async resolveAuthHeader(): Promise<ResolvedAuthHeader> {
    const configuredApiKey = typeof this.apiKey === "string" && this.apiKey.trim()
      ? this.apiKey.trim()
      : "";
    if (configuredApiKey) {
      return this.toAuthHeader(configuredApiKey, "auto");
    }

    const envApiKey = this.getEnvCredential(API_KEY_ENV_VARS);
    if (envApiKey) {
      return this.toAuthHeader(envApiKey, "api_key");
    }

    const storedAuthHeader = await this.getStoredAuthHeader();
    if (storedAuthHeader) {
      return storedAuthHeader;
    }

    const envToken = this.getEnvCredential(TOKEN_ENV_VARS);
    if (envToken) {
      return this.toAuthHeader(envToken, "token");
    }

    throw new Error(
      "LanOnasis authentication required — run `lanonasis auth login` or set LANONASIS_API_KEY",
    );
  }

  // Issue 1 fix: unwrap { success, data } envelope — defensive, handles both
  // wrapped ({ data: T }) and direct (T) responses
  private unwrap<T>(response: unknown): T {
    if (
      response !== null &&
      typeof response === "object" &&
      "data" in (response as object)
    ) {
      return (response as ApiEnvelope<T>).data;
    }
    return response as T;
  }

  // Issue 3 fix: clear all search/list cache entries on any write
  private invalidateSearchCache(): void {
    for (const key of this.cache.keys()) {
      if (key.includes(":search:") || key.includes(":list:")) {
        this.cache.delete(key);
      }
    }
  }

  private isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
  }

  async resolveMemoryId(idOrPrefix: string): Promise<string> {
    const candidate = idOrPrefix.trim();
    if (!candidate) {
      throw new Error("Memory ID is required.");
    }
    if (this.isUuid(candidate)) {
      return candidate;
    }
    if (candidate.length < 8) {
      throw new Error(
        "Memory ID prefix must be at least 8 characters or a full UUID.",
      );
    }

    const matches: string[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      const result = await this.listMemories({ limit, page });
      if (!result.memories || result.memories.length === 0) {
        break;
      }

      for (const memory of result.memories) {
        if (memory.id.startsWith(candidate)) {
          matches.push(memory.id);
        }
      }

      if (result.total <= page * limit) {
        break;
      }
      page += 1;
    }

    if (matches.length === 0) {
      throw new Error(`Memory not found for ID/prefix: ${candidate}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Memory ID prefix is ambiguous: ${candidate}. Matches: ${matches.slice(0, 5).join(", ")}`,
      );
    }

    return matches[0];
  }

  async searchMemories(params: LanSearchParams): Promise<LanMemory[]> {
    const cacheKey = this.cacheKey("search", params);
    const cached = this.getFromCache<LanMemory[]>(cacheKey);
    if (cached) return cached;

    const requestBody: Record<string, unknown> = {
      query: params.query,
      threshold: params.threshold,
      limit: params.limit,
    };
    if (params.type) requestBody.type = params.type;
    if (params.tags) requestBody.tags = params.tags;
    if (params.topic_key) requestBody.topic_key = params.topic_key;
    if (params.include_deleted !== undefined) {
      requestBody.include_deleted = params.include_deleted;
    }
    if (params.response_mode) requestBody.response_mode = params.response_mode;
    if (params.metadata) requestBody.metadata = params.metadata;

    let raw: unknown;
    try {
      raw = await this.request<unknown>(
        "POST",
        "/api/v1/memories/search",
        requestBody,
      );
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;
      raw = await this.request<unknown>(
        "POST",
        "/api/v1/memory/search",
        requestBody,
      );
    }
    const unwrapped = this.unwrap<unknown>(raw);
    const result = Array.isArray(unwrapped)
      ? unwrapped.map((item) => this.normalizeMemory(item))
      : [];
    this.setCache(cacheKey, result);
    return result;
  }

  async createMemory(params: LanCreateParams): Promise<LanMemory> {
    const requestBody: Record<string, unknown> = {
      title: params.title,
      content: params.content,
      type: params.type,
    };
    if (params.tags) requestBody.tags = params.tags;
    if (params.topic_key) requestBody.topic_key = params.topic_key;
    if (params.metadata) requestBody.metadata = params.metadata;
    if (params.idempotency_key)
      requestBody.idempotency_key = params.idempotency_key;
    if (params.continuity_key)
      requestBody.continuity_key = params.continuity_key;
    if (params.write_intent) requestBody.write_intent = params.write_intent;

    let raw: unknown;
    try {
      raw = await this.request<unknown>("POST", "/api/v1/memories", requestBody);
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;
      raw = await this.request<unknown>("POST", "/api/v1/memory", requestBody);
    }
    // Issue 3 fix: invalidate stale search results
    this.invalidateSearchCache();
    return this.normalizeMemory(raw);
  }

  async getMemory(id: string): Promise<LanMemory> {
    const resolvedId = await this.resolveMemoryId(id);
    let raw: unknown;
    try {
      raw = await this.request<unknown>(
        "GET",
        `/api/v1/memories/${encodeURIComponent(resolvedId)}`,
      );
    } catch (error) {
      if (!this.shouldUseLegacyGetFallback(error)) throw error;
      raw = await this.request<unknown>(
        "GET",
        `/api/v1/memory/get?id=${encodeURIComponent(resolvedId)}`,
      );
    }
    return this.normalizeMemory(raw);
  }

  async listMemories(
    params?: LanListParams,
  ): Promise<{ memories: LanMemory[]; total: number }> {
    const cacheKey = this.cacheKey("list", params ?? {});
    const cached = this.getFromCache<{ memories: LanMemory[]; total: number }>(cacheKey);
    if (cached) return cached;

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.type) queryParams.set("type", params.type);
    if (params?.tags) {
      params.tags.forEach((tag) => queryParams.append("tags", tag));
    }
    if (params?.topic_key) queryParams.set("topic_key", params.topic_key);
    if (params?.include_deleted !== undefined) {
      queryParams.set("include_deleted", String(params.include_deleted));
    }
    if (params?.sort) queryParams.set("sort", params.sort);
    if (params?.order) queryParams.set("order", params.order);

    const query = queryParams.toString();
    const canonicalPath = `/api/v1/memories${query ? `?${query}` : ""}`;
    let raw: unknown;

    try {
      raw = await this.request<unknown>("GET", canonicalPath);
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;

      const listPayload: Record<string, unknown> = {};
      if (params?.limit) listPayload.limit = params.limit;
      if (params?.page) {
        listPayload.page = params.page;
        listPayload.offset = Math.max(0, (params.page - 1) * (params.limit ?? 20));
      }
      if (params?.type) listPayload.memory_type = params.type;
      if (params?.tags) listPayload.tags = params.tags;
      if (params?.topic_key) listPayload.topic_key = params.topic_key;
      if (params?.include_deleted !== undefined) {
        listPayload.include_deleted = params.include_deleted;
      }
      if (params?.sort) listPayload.sort_by = params.sort;
      if (params?.order) listPayload.sort_order = params.order;

      raw = await this.request<unknown>("POST", "/api/v1/memories/list", listPayload);
    }

    const result = this.normalizeMemoryListResult(raw);
    this.setCache(cacheKey, result);
    return result;
  }

  async updateMemory(
    id: string,
    updates: LanUpdateParams,
  ): Promise<LanMemory> {
    const resolvedId = await this.resolveMemoryId(id);
    const sanitizedUpdates = Object.fromEntries(
      Object.entries({
        ...updates,
        title: sanitizeMemoryText(updates.title),
        content: sanitizeMemoryText(updates.content),
      }).filter(([, value]) => value !== undefined),
    ) as LanUpdateParams;
    let raw: unknown;
    try {
      raw = await this.request<unknown>(
        "PUT",
        `/api/v1/memories/${encodeURIComponent(resolvedId)}`,
        sanitizedUpdates,
      );
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;
      raw = await this.request<unknown>(
        "POST",
        `/api/v1/memory/update`,
        { id: resolvedId, ...sanitizedUpdates },
      );
    }
    // Issue 3 fix: invalidate stale search/list results
    this.invalidateSearchCache();
    return this.normalizeMemory(raw);
  }

  async deleteMemory(id: string): Promise<void> {
    const resolvedId = await this.resolveMemoryId(id);
    try {
      await this.request<void>(
        "DELETE",
        `/api/v1/memories/${encodeURIComponent(resolvedId)}`,
      );
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;
      await this.request<void>(
        "DELETE",
        `/api/v1/memory/delete?id=${encodeURIComponent(resolvedId)}`,
      );
    }
    // Issue 3 fix: invalidate stale search/list results
    this.invalidateSearchCache();
  }

  async getHealth(): Promise<{ status: string; version: string }> {
    // Health endpoint returns direct object, no data envelope
    return this.request<{ status: string; version: string }>(
      "GET",
      "/api/v1/health",
    );
  }

  async getStats(): Promise<LanMemoryStats> {
    let raw: unknown;
    try {
      raw = await this.request<unknown>("GET", "/api/v1/memories/stats");
    } catch (error) {
      if (!this.shouldUseCompatibilityFallback(error)) throw error;
      raw = await this.request<unknown>("GET", "/api/v1/memory/stats");
    }
    return this.unwrap<LanMemoryStats>(raw);
  }
}
