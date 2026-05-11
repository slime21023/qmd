import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ApiError, FileResponse, FilesResponse, SearchResponse } from "../shared/types";
import { handleApiRequest, resolveMarkdownPath } from "./router";
import { scanDirectory } from "./scanner";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "qmd-router-"));
  await writeFile(path.join(root, "README.md"), "# Hello");
  await writeFile(path.join(root, "notes.txt"), "private");
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("resolveMarkdownPath", () => {
  test("allows markdown inside root", () => {
    expect(resolveMarkdownPath(root, "/README.md")).toBe(path.join(root, "README.md"));
  });

  test("rejects traversal and non-markdown files", () => {
    expect(resolveMarkdownPath(root, "../README.md")).toBeNull();
    expect(resolveMarkdownPath(root, "/notes.txt")).toBeNull();
  });
});

describe("handleApiRequest", () => {
  async function context() {
    const scan = await scanDirectory(root, { depth: Number.POSITIVE_INFINITY, ignore: [] });
    return {
      root: scan.root,
      tree: scan.tree,
      markdownFiles: scan.markdownFiles
    };
  }

  test("returns file tree", async () => {
    const response = await handleApiRequest(new Request("http://qmd.local/api/files"), await context());
    const payload = (await response.json()) as FilesResponse;

    expect(response.status).toBe(200);
    expect(payload.tree.children?.[0]?.name).toBe("README.md");
  });

  test("returns markdown file content", async () => {
    const response = await handleApiRequest(
      new Request("http://qmd.local/api/file?path=%2FREADME.md"),
      await context()
    );
    const payload = (await response.json()) as FileResponse;

    expect(response.status).toBe(200);
    expect(payload.content).toBe("# Hello");
  });

  test("returns search matches by filename", async () => {
    const response = await handleApiRequest(new Request("http://qmd.local/api/search?q=read"), await context());
    const payload = (await response.json()) as SearchResponse;

    expect(payload.results).toEqual([{ name: "README.md", path: "/README.md" }]);
  });

  test("rejects invalid file reads", async () => {
    const response = await handleApiRequest(
      new Request("http://qmd.local/api/file?path=..%2FREADME.md"),
      await context()
    );
    const payload = (await response.json()) as ApiError;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("FORBIDDEN");
  });
});
