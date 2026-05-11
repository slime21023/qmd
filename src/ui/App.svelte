<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import MarkdownView from "./components/MarkdownView.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import ThemeToggle from "./components/ThemeToggle.svelte";
  import { currentFile, loadFile } from "./stores/currentFile";
  import { filteredTree, fileTree, flatFiles, rootPath, searchQuery } from "./stores/fileTree";
  import type { ApiError, FileNode, FilesResponse } from "./types";

  let sidebarOpen = true;
  let sidebarWidth = 280;
  let isResizing = false;
  let loadError = "";

  $: selectedPath = $currentFile?.path ?? "";
  $: files = $flatFiles;

  async function loadFiles(): Promise<void> {
    try {
      const response = await fetch("/api/files");
      const payload = (await response.json()) as FilesResponse | ApiError;
      if (!response.ok || "error" in payload) {
        throw new Error("message" in payload ? payload.message : "File tree could not be loaded.");
      }

      rootPath.set(payload.root);
      fileTree.set(payload.tree);
      loadError = "";
    } catch (error) {
      loadError = error instanceof Error ? error.message : "File tree could not be loaded.";
    }
  }

  function selectFile(node: FileNode): void {
    if (node.type === "file") {
      void loadFile(node.path);
      if (window.innerWidth < 768) sidebarOpen = false;
    }
  }

  function moveSelection(offset: number): void {
    if (!files.length) return;

    const currentIndex = files.findIndex((file) => file.path === selectedPath);
    const nextIndex = currentIndex === -1 ? 0 : Math.max(0, Math.min(files.length - 1, currentIndex + offset));
    const nextFile = files[nextIndex];
    if (nextFile) void loadFile(nextFile.path);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      searchQuery.set("");
      if (window.innerWidth < 768) sidebarOpen = false;
      return;
    }

    if (event.key === "[" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      moveSelection(-1);
      return;
    }

    if (event.key === "]" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      moveSelection(1);
      return;
    }

    if (event.ctrlKey && event.key === "\\") {
      event.preventDefault();
      sidebarOpen = !sidebarOpen;
    }
  }

  function startResize(): void {
    isResizing = true;
  }

  function resize(event: MouseEvent): void {
    if (!isResizing) return;
    sidebarWidth = Math.max(220, Math.min(460, event.clientX));
  }

  function stopResize(): void {
    isResizing = false;
  }

  onMount(() => {
    void loadFiles();
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
  });
</script>

<div class:resizing={isResizing} class="app-shell" style={`--sidebar-width: ${sidebarWidth}px`}>
  <header class="topbar">
    <button
      class="icon-button"
      type="button"
      aria-label="Toggle sidebar"
      title="Toggle sidebar"
      on:click={() => (sidebarOpen = !sidebarOpen)}
    >
      ☰
    </button>
    <div class="brand">
      <strong>✦ Qmd</strong>
      <span>Quick Markdown Viewer</span>
    </div>
    <ThemeToggle />
  </header>

  {#if loadError}
    <div class="banner">{loadError}</div>
  {/if}

  <div class="workspace">
    {#if sidebarOpen}
      <div class="sidebar-wrap">
        <Sidebar tree={$filteredTree} root={$rootPath} {selectedPath} onSelect={selectFile} />
        <button
          class="resize-handle"
          type="button"
          aria-label="Resize sidebar"
          title="Resize sidebar"
          on:mousedown={startResize}
        ></button>
      </div>
    {/if}

    <MarkdownView />
  </div>
</div>
