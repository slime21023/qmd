import { get, writable } from "svelte/store";
import type { ApiError, FileResponse } from "../types";

export interface CurrentFile {
  path: string;
  name: string;
  content: string;
  size: number;
  modifiedAt: string;
  isLoading: boolean;
  error: string | null;
}

export const currentFile = writable<CurrentFile | null>(null);

export async function loadFile(path: string): Promise<void> {
  const existing = get(currentFile);

  currentFile.set({
    path,
    name: existing?.path === path ? existing.name : "",
    content: existing?.path === path ? existing.content : "",
    size: existing?.path === path ? existing.size : 0,
    modifiedAt: existing?.path === path ? existing.modifiedAt : "",
    isLoading: true,
    error: null
  });

  try {
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    const payload = (await response.json()) as FileResponse | ApiError;

    if (!response.ok || "error" in payload) {
      throw new Error("message" in payload ? payload.message : "The file could not be loaded.");
    }

    currentFile.set({
      ...payload,
      isLoading: false,
      error: null
    });
  } catch (error) {
    currentFile.update((value) => ({
      path,
      name: value?.name ?? "",
      content: value?.content ?? "",
      size: value?.size ?? 0,
      modifiedAt: value?.modifiedAt ?? "",
      isLoading: false,
      error: error instanceof Error ? error.message : "The file could not be loaded."
    }));
  }
}
