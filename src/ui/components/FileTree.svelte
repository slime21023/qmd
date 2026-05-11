<script lang="ts">
  import type { FileNode } from "../types";
  import FileTreeNode from "./FileTreeNode.svelte";

  export let tree: FileNode | null;
  export let selectedPath = "";
  export let onSelect: (node: FileNode) => void;
</script>

<nav class="file-tree" aria-label="Markdown files">
  {#if tree}
    {#if tree.children?.length}
      <ul>
        {#each tree.children as child (child.path)}
          <FileTreeNode node={child} {selectedPath} level={0} {onSelect} />
        {/each}
      </ul>
    {:else}
      <p class="empty">No Markdown files found.</p>
    {/if}
  {:else}
    <p class="empty">Loading files...</p>
  {/if}
</nav>
