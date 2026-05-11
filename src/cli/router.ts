import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ApiError, FileNode, FileResponse, FilesResponse, SearchResponse } from "../shared/types";
import { isMarkdownPath } from "./scanner";

export interface RouterContext {
  root: string;
  tree: FileNode;
  markdownFiles: FileNode[];
}

export async function handleApiRequest(request: Request, context: RouterContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/files") {
    return json<FilesResponse>({ root: context.root, tree: context.tree });
  }

  if (url.pathname === "/api/file") {
    return handleFile(url, context);
  }

  if (url.pathname === "/api/search") {
    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const results = query
      ? context.markdownFiles
          .filter((file) => file.name.toLowerCase().includes(query))
          .map((file) => ({ name: file.name, path: file.path }))
      : [];

    return json<SearchResponse>({ query, results });
  }

  return jsonError(404, "NOT_FOUND", "The requested API route does not exist.");
}

export function resolveMarkdownPath(root: string, requestedPath: string): string | null {
  const relative = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;
  const resolved = path.resolve(root, relative);
  const relativeToRoot = path.relative(root, resolved);

  if (relativeToRoot === "" || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  if (!isMarkdownPath(resolved)) {
    return null;
  }

  return resolved;
}

function json<T>(payload: T, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function jsonError(status: number, error: string, message: string): Response {
  return json<ApiError>({ error, message }, status);
}

async function handleFile(url: URL, context: RouterContext): Promise<Response> {
  const requestedPath = url.searchParams.get("path");

  if (!requestedPath) {
    return jsonError(400, "BAD_REQUEST", "The path query parameter is required.");
  }

  const absolutePath = resolveMarkdownPath(context.root, requestedPath);

  if (!absolutePath) {
    return jsonError(403, "FORBIDDEN", "The requested file is outside the scanned directory or is not Markdown.");
  }

  try {
    const [content, stats] = await Promise.all([readFile(absolutePath, "utf8"), stat(absolutePath)]);

    if (!stats.isFile()) {
      return jsonError(404, "FILE_NOT_FOUND", "The specified file could not be found.");
    }

    return json<FileResponse>({
      path: normalizeRequestPath(context.root, absolutePath),
      name: path.basename(absolutePath),
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return jsonError(404, "FILE_NOT_FOUND", "The specified file could not be found.");
    }

    return jsonError(500, "INTERNAL_ERROR", "The file could not be read.");
  }
}

function normalizeRequestPath(root: string, absolutePath: string): string {
  return `/${path.relative(root, absolutePath).split(path.sep).join("/")}`;
}
