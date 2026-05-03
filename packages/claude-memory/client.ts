import { Agent, fetch as undiciFetch } from "undici";
import type { ClaudeMemoryConfig } from "./config.js";

const ipv4Agent = new Agent({ connect: { family: 4 } as any });
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
  tags?: string[];
  topic_key?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  similarity?: number;
};

export type LanCreateParams = Omit<
  LanMemory,
  "id" | "created_at" | "updated_at" | "similarity"
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

type ClientConfig = Pick<ClaudeMemoryConfig, "apiKey" | "projectId" | "baseUrl">;

interface CacheEntry<T> {
  result: T;
  expiry: number;
}

interface RateLimitState {
  timestamps: number[];
}

type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  pagination?: { total?: number; page?: number; limit?: number };
};

type FetchResponse = Awaited<ReturnType<typeof undiciFetch>>;
type ResolvedAuthHeader = {
  name: "Authorization" | "X-API-Key";
  value: string;
};

async function tryReadKeytarPassword(
  service: string,
  account: string,
): Promise<string | null> {
  try {
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<unknown>;
    const keytarModule = await dynamicImport("keytar");
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
  private readonly CACHE_TTL_MS = 60_000;
  private readonly CACHE_MAX_SIZE = 50;
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;
  private readonly RATE_LIMIT_MAX_REQ = 60;

  constructor(cfg: ClientConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.apiKey = cfg.apiKey || "";
    this.projectId = cfg.projectId || "";
    this.cache = new Map();
    this.rateLimit = { timestamps: [] };
  }

  private resolveEnvVars(s: string): string {
    return s.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
      const val = process.env[varName];
      if (!val) {
        throw new Error(`Environment variable ${varName} is not set`);
      }
      return val;
    });
  }

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
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, {
      result,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.enforceRateLimit();

    const url = this.buildRequestUrl(path);
    const authHeader = await this.resolveAuthHeader();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [authHeader.name]: authHeader.value,
    };
    if (this.projectId.trim()) {
      headers["X-Project-Scope"] = this.projectId;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await undiciFetch(url, {
        ...options,
        dispatcher: ipv4Agent,
      } as any);

      if (this.shouldRetryViaMcp(url, response.status)) {
        const retryResponse = await undiciFetch(this.buildRequestUrl(path, true), {
          ...options,
          dispatcher: ipv4Agent,
        } as any);
        return this.handleResponse<T>(retryResponse);
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        const retryResponse = await undiciFetch(url, {
          ...options,
          dispatcher: ipv4Agent,
        } as any);
        return this.handleResponse<T>(retryResponse);
      }

      return this.handleResponse<T>(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const cause = (err as any)?.cause;
      const causeCode =
        cause && typeof cause === "object" && "code" in cause
          ? String((cause as { code?: unknown }).code ?? "")
          : "";
      const causeMsg =
        cause instanceof Error ? ` (cause: ${cause.message} ${causeCode})` : "";
      throw new Error(`LanOnasis unreachable: ${message}${causeMsg} [url=${url}]`);
    }
  }

  private async handleResponse<T>(response: FetchResponse): Promise<T> {
    const status = response.status;
    const body = await response.text();

    if (status === 401) {
      throw new Error(
        "LanOnasis authentication failed — refresh with `lanonasis auth login` or set LANONASIS_API_KEY",
      );
    }
    if (status >= 500) {
      throw new Error(`LanOnasis server error (${status}): ${body}`);
    }
    if (!response.ok) {
      throw new Error(`LanOnasis error (${status}): ${body}`);
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return undefined as unknown as T;
    }

    return JSON.parse(trimmed) as T;
  }

  private buildRequestUrl(path: string, useMcpSurface = false): string {
    if (!useMcpSurface) {
      return `${this.baseUrl}${path}`;
    }

    const mcpPath = path.startsWith("/api/v1/memory")
      ? path.replace("/api/v1/memory", "/memory")
      : path;

    return `https://mcp.lanonasis.com/api/v1${mcpPath}`;
  }

  private shouldRetryViaMcp(url: string, status: number): boolean {
    return status === 401 && url.startsWith("https://api.lanonasis.com/");
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
    const configuredApiKey = this.apiKey.trim()
      ? this.resolveEnvVars(this.apiKey).trim()
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

  private invalidateSearchCache(): void {
    for (const key of this.cache.keys()) {
      if (key.includes(":search:") || key.includes(":list:")) {
        this.cache.delete(key);
      }
    }
  }

  async searchMemories(params: LanSearchParams): Promise<LanMemory[]> {
    const cacheKey = this.cacheKey("search", params);
    const cached = this.getFromCache<LanMemory[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const requestBody: Record<string, unknown> = {
      query: params.query,
      threshold: params.threshold,
      limit: params.limit,
    };
    if (params.type) {
      requestBody.type = params.type;
    }
    if (params.tags) {
      requestBody.tags = params.tags;
    }
    if (params.topic_key) {
      requestBody.topic_key = params.topic_key;
    }
    if (params.include_deleted !== undefined) {
      requestBody.include_deleted = params.include_deleted;
    }
    if (params.response_mode) {
      requestBody.response_mode = params.response_mode;
    }
    if (params.metadata) {
      requestBody.metadata = params.metadata;
    }

    const raw = await this.request<unknown>(
      "POST",
      "/api/v1/memory/search",
      requestBody,
    );
    const result = this.unwrap<LanMemory[]>(raw);
    this.setCache(cacheKey, result);
    return result;
  }

  async createMemory(params: LanCreateParams): Promise<LanMemory> {
    const requestBody: Record<string, unknown> = {
      title: params.title,
      content: params.content,
      type: params.type,
      metadata: {
        ...(params.metadata ?? {}),
        source: "claude-code",
      },
    };
    if (params.tags) {
      requestBody.tags = params.tags;
    }
    if (params.topic_key) {
      requestBody.topic_key = params.topic_key;
    }
    if (params.idempotency_key) {
      requestBody.idempotency_key = params.idempotency_key;
    }
    if (params.continuity_key) {
      requestBody.continuity_key = params.continuity_key;
    }
    if (params.write_intent) {
      requestBody.write_intent = params.write_intent;
    }

    const raw = await this.request<unknown>("POST", "/api/v1/memory", requestBody);
    this.invalidateSearchCache();
    return this.unwrap<LanMemory>(raw);
  }

  async getMemory(id: string): Promise<LanMemory> {
    const raw = await this.request<unknown>("GET", `/api/v1/memory/${id}`);
    return this.unwrap<LanMemory>(raw);
  }

  async listMemories(params?: {
    limit?: number;
    page?: number;
    type?: LanMemoryType;
    tags?: string[];
    topic_key?: string;
    include_deleted?: boolean;
  }): Promise<{ memories: LanMemory[]; total: number }> {
    const cacheKey = this.cacheKey("list", params ?? {});
    const cached = this.getFromCache<{ memories: LanMemory[]; total: number }>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.set("limit", params.limit.toString());
    }
    if (params?.page) {
      queryParams.set("page", params.page.toString());
    }
    if (params?.type) {
      queryParams.set("type", params.type);
    }
    if (params?.tags) {
      params.tags.forEach((tag) => queryParams.append("tags", tag));
    }
    if (params?.topic_key) {
      queryParams.set("topic_key", params.topic_key);
    }
    if (params?.include_deleted !== undefined) {
      queryParams.set("include_deleted", String(params.include_deleted));
    }

    const query = queryParams.toString();
    const path = `/api/v1/memory/list${query ? `?${query}` : ""}`;
    const raw = await this.request<unknown>("GET", path);
    const envelope = raw as ApiEnvelope<LanMemory[]>;
    const result = {
      memories: envelope.data ?? (Array.isArray(raw) ? raw : []),
      total: envelope.pagination?.total ?? 0,
    };
    this.setCache(cacheKey, result);
    return result;
  }

  async updateMemory(
    id: string,
    updates: Partial<Omit<LanMemory, "id">>,
  ): Promise<LanMemory> {
    const raw = await this.request<unknown>("POST", "/api/v1/memory/update", {
      id,
      ...updates,
    });
    this.invalidateSearchCache();
    return this.unwrap<LanMemory>(raw);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.request<void>("DELETE", `/api/v1/memory/delete?id=${id}`);
    this.invalidateSearchCache();
  }

  async getHealth(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>(
      "GET",
      "/api/v1/health",
    );
  }
}
