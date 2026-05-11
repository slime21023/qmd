<script lang="ts">
  import type { FileNode } from "../types";
  import FileTree from "./FileTree.svelte";
  import SearchBar from "./SearchBar.svelte";

  export let tree: FileNode | null;
  export let root = "";
  export let selectedPath = "";
  export let onSelect: (node: FileNode) => void;
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <div>
      <strong>{tree?.name ?? "Qmd"}</strong>
      {#if root}
        <small title={root}>{root}</small>
      {/if}
    </div>
  </div>
  <SearchBar />
  <FileTree {tree} {selectedPath} {onSelect} />
</aside>
