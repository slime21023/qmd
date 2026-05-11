import { derived, writable } from "svelte/store";
import type { FileNode } from "../types";

export const fileTree = writable<FileNode | null>(null);
export const rootPath = writable("");
export const searchQuery = writable("");

export const filteredTree = derived([fileTree, searchQuery], ([$fileTree, $searchQuery]) => {
  if (!$fileTree) return null;

  const query = $searchQuery.trim().toLowerCase();
  if (!query) return $fileTree;

  return filterNode($fileTree, query) ?? { ...$fileTree, children: [] };
});

export const flatFiles = derived(fileTree, ($fileTree) => {
  if (!$fileTree) return [];
  return flattenFiles($fileTree);
});

function filterNode(node: FileNode, query: string): FileNode | null {
  if (node.type === "file") {
    return node.name.toLowerCase().includes(query) ? node : null;
  }

  const children = node.children?.map((child) => filterNode(child, query)).filter(Boolean) as
    | FileNode[]
    | undefined;

  if (children?.length) {
    return { ...node, children };
  }

  return null;
}

function flattenFiles(node: FileNode): FileNode[] {
  if (node.type === "file") return [node];
  return node.children?.flatMap((child) => flattenFiles(child)) ?? [];
}
