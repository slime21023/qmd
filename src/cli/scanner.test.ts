import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanDirectory } from "./scanner";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "qmd-scanner-"));
  await mkdir(path.join(root, "guides"), { recursive: true });
  await mkdir(path.join(root, "drafts"), { recursive: true });
  await mkdir(path.join(root, "empty"), { recursive: true });
  await mkdir(path.join(root, "nested", "deep"), { recursive: true });
  await mkdir(path.join(root, "text-only"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Readme");
  await writeFile(path.join(root, "guides", "quickstart.markdown"), "# Quickstart");
  await writeFile(path.join(root, "guides", "ignore.txt"), "not markdown");
  await writeFile(path.join(root, "drafts", "hidden.md"), "# Hidden");
  await writeFile(path.join(root, "nested", "deep", "later.md"), "# Later");
  await writeFile(path.join(root, "text-only", "notes.txt"), "not markdown");
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("scanDirectory", () => {
  test("builds a sorted markdown-only tree", async () => {
    const result = await scanDirectory(root, { depth: Number.POSITIVE_INFINITY, ignore: [] });

    expect(result.markdownFiles.map((file) => file.path)).toEqual([
      "/drafts/hidden.md",
      "/guides/quickstart.markdown",
      "/nested/deep/later.md",
      "/README.md"
    ]);
    expect(result.tree.type).toBe("directory");
    expect(result.tree.children?.some((child) => child.name === "ignore.txt")).toBe(false);
    expect(result.tree.children?.some((child) => child.name === "empty")).toBe(false);
    expect(result.tree.children?.some((child) => child.name === "text-only")).toBe(false);
    expect(result.tree.children?.some((child) => child.name === "nested")).toBe(true);
  });

  test("honors ignore patterns", async () => {
    const result = await scanDirectory(root, { depth: Number.POSITIVE_INFINITY, ignore: ["drafts"] });

    expect(result.markdownFiles.map((file) => file.path)).not.toContain("/drafts/hidden.md");
  });

  test("honors depth limit", async () => {
    const result = await scanDirectory(root, { depth: 1, ignore: [] });

    expect(result.markdownFiles.map((file) => file.path)).toEqual(["/README.md"]);
    expect(result.tree.children?.map((child) => child.name)).toEqual(["README.md"]);
  });

  test("keeps the root directory when no markdown files are found", async () => {
    const markdownlessRoot = await mkdtemp(path.join(tmpdir(), "qmd-empty-"));

    try {
      await mkdir(path.join(markdownlessRoot, "notes"), { recursive: true });
      await writeFile(path.join(markdownlessRoot, "notes", "todo.txt"), "not markdown");

      const result = await scanDirectory(markdownlessRoot, { depth: Number.POSITIVE_INFINITY, ignore: [] });

      expect(result.markdownFiles).toEqual([]);
      expect(result.tree.type).toBe("directory");
      expect(result.tree.path).toBe("/");
      expect(result.tree.children).toEqual([]);
    } finally {
      await rm(markdownlessRoot, { recursive: true, force: true });
    }
  });
});
