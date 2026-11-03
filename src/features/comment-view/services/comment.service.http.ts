import { DEFAULT_MOBILE_SERVER_URL } from 'src/constants/server';

import type { CommentRequest, CommentResponse, CommentSetRequest } from '../types/comment.types';
import type { CommentService } from './comment.service';

export interface HttpCommentServiceOptions {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Development preview scenario; omitted on the normal service path. */
  scenario?: string;
  /**
   * Path override for the legacy `COMMENT` read endpoint.
   * Default: `/api/comment`
   */
  commentPath?: string;
  /**
   * Path override for the legacy `COMMENTSET` submit endpoint.
   * Default: `/api/commentSet`
   */
  commentSetPath?: string;
}

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out')), ms));
}

function buildUrl(base: string, path: string) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function addScenario(path: string, scenario?: string) {
  if (!scenario) return path;

  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  params.set('scenario', scenario);
  return `${pathname}?${params.toString()}`;
}

export function createHttpCommentService(opts: HttpCommentServiceOptions = {}): CommentService {
  const base =
    opts.baseUrl ?? (import.meta.env.VITE_API_BASE as string) ?? DEFAULT_MOBILE_SERVER_URL;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const commentPath = opts.commentPath ?? '/api/comment';
  const commentSetPath = opts.commentSetPath ?? '/api/commentSet';
  const commentPathWithScenario = addScenario(commentPath, opts.scenario);
  const commentSetPathWithScenario = addScenario(commentSetPath, opts.scenario);

  async function postJson(path: string, body: unknown) {
    const url = buildUrl(base, path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const allHeaders = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };
      const res = (await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: allHeaders,
          body: JSON.stringify(body),
          credentials: 'include',
          signal: controller.signal,
        }),
        timeout(timeoutMs),
      ])) as Response;

      if (!res || !('ok' in res)) throw new Error('No response');
      if (!res.ok) {
        let txt = res.statusText || `HTTP ${res.status}`;
        try {
          const j = await res.json();
          txt = j?.message ?? j?.error ?? txt;
        } catch {
          // ignore
        }
        throw new Error(String(txt));
      }

      const data = await res.json();
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /**
     * Legacy message name: `COMMENT`
     * POST {base}{commentPath} with the legacy body shape.
     */
    async comment(req: CommentRequest): Promise<CommentResponse> {
      const data = await postJson(commentPathWithScenario, req);
      return data as CommentResponse;
    },
    /**
     * Legacy message name: `COMMENTSET`
     * POST {base}{commentSetPath} with the legacy body shape.
     */
    async commentSet(req: CommentSetRequest): Promise<void> {
      await postJson(commentSetPathWithScenario, req);
    },
  };
}

export default createHttpCommentService;
