<script lang="ts">
  import type { FileNode } from "../types";

  export let node: FileNode;
  export let selectedPath = "";
  export let level = 0;
  export let onSelect: (node: FileNode) => void;

  let expanded = level === 0;

  $: isSelected = node.type === "file" && node.path === selectedPath;
  $: hasChildren = Boolean(node.children?.length);

  function activate(): void {
    if (node.type === "directory") {
      expanded = !expanded;
      return;
    }

    onSelect(node);
  }
</script>

<li>
  <button
    class:selected={isSelected}
    class:directory={node.type === "directory"}
    style={`--level: ${level}`}
    type="button"
    aria-expanded={node.type === "directory" ? expanded : undefined}
    on:click={activate}
  >
    <span class="twist" aria-hidden="true">
      {#if node.type === "directory"}
        {expanded ? "▾" : "▸"}
      {:else}
        ·
      {/if}
    </span>
    <span class="name">{node.name}</span>
  </button>

  {#if node.type === "directory" && expanded && hasChildren}
    <ul>
      {#each node.children ?? [] as child (child.path)}
        <svelte:self node={child} {selectedPath} level={level + 1} {onSelect} />
      {/each}
    </ul>
  {/if}
</li>
