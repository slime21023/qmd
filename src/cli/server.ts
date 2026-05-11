import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FileNode } from "../shared/types";
import { STATIC_ASSETS } from "./assets.generated";
import { handleApiRequest } from "./router";

export interface ServerOptions {
  root: string;
  tree: FileNode;
  markdownFiles: FileNode[];
  port: number;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

export function startServer(options: ServerOptions): Bun.Server<undefined> {
  const distPath = path.resolve("dist");

  return Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        return handleApiRequest(request, {
          root: options.root,
          tree: options.tree,
          markdownFiles: options.markdownFiles
        });
      }

      return serveStatic(distPath, url.pathname);
    }
  });
}

async function serveStatic(distPath: string, requestPath: string): Promise<Response> {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const embedded = STATIC_ASSETS[normalizedPath] ?? STATIC_ASSETS["/index.html"];

  if (embedded) {
    return new Response(Buffer.from(embedded.base64, "base64"), {
      headers: { "content-type": embedded.contentType }
    });
  }

  const resolved = path.resolve(distPath, `.${normalizedPath}`);
  const relative = path.relative(distPath, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = existsSync(resolved) ? resolved : path.join(distPath, "index.html");

  try {
    const body = await readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
    return new Response(body, { headers: { "content-type": contentType } });
  } catch {
    return new Response(
      "Qmd UI has not been built yet. Run `bun run build:ui` or use `bun run dev` with Vite.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" }
      }
    );
  }
}
