import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { FileNode } from "../shared/types";

export interface ScanResult {
  root: string;
  tree: FileNode;
  markdownFiles: FileNode[];
}

export interface ScanOptions {
  depth: number;
  ignore: string[];
}

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export async function scanDirectory(rootPath: string, options: ScanOptions): Promise<ScanResult> {
  const root = path.resolve(rootPath);
  const rootStats = await stat(root);

  if (!rootStats.isDirectory()) {
    throw new Error(`Target path is not a directory: ${root}`);
  }

  const markdownFiles: FileNode[] = [];
  const tree = await scanNode(root, root, 0, options, markdownFiles);

  return { root, tree: tree ?? rootNode(root), markdownFiles };
}

export function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function toRelativePath(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath).split(path.sep).join("/");
  return relative ? `/${relative}` : "/";
}

async function scanNode(
  root: string,
  absolutePath: string,
  depth: number,
  options: ScanOptions,
  markdownFiles: FileNode[]
): Promise<FileNode | null> {
  const stats = await stat(absolutePath);
  const name = depth === 0 ? path.basename(root) : path.basename(absolutePath);

  if (!stats.isDirectory()) {
    const node: FileNode = {
      name,
      type: "file",
      path: toRelativePath(root, absolutePath),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    };
    markdownFiles.push(node);
    return node;
  }

  const node = rootNode(absolutePath, name, toRelativePath(root, absolutePath));

  if (depth >= options.depth) {
    return depth === 0 ? node : null;
  }

  const entries = await readdir(absolutePath, { withFileTypes: true });
  const sorted = entries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  for (const entry of sorted) {
    if (shouldIgnore(entry.name, options.ignore)) continue;

    const childPath = path.join(absolutePath, entry.name);

    if (entry.isDirectory()) {
      const child = await scanNode(root, childPath, depth + 1, options, markdownFiles);
      if (child) node.children?.push(child);
      continue;
    }

    if (entry.isFile() && isMarkdownPath(entry.name)) {
      const child = await scanNode(root, childPath, depth + 1, options, markdownFiles);
      if (child) node.children?.push(child);
    }
  }

  return depth === 0 || node.children?.length ? node : null;
}

function rootNode(absolutePath: string, name = path.basename(absolutePath), relativePath = "/"): FileNode {
  return {
    name,
    type: "directory",
    path: relativePath,
    children: []
  };
}

function shouldIgnore(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === name) return true;
    if (pattern.includes("*")) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
      return new RegExp(`^${escaped}$`).test(name);
    }
    return false;
  });
}
