<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { searchQuery } from "../stores/fileTree";

  let value = "";
  let input: HTMLInputElement;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function updateSearch(nextValue: string): void {
    value = nextValue;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => searchQuery.set(value), 300);
  }

  function clear(): void {
    value = "";
    searchQuery.set("");
    input?.focus();
  }

  function handleKeydown(event: KeyboardEvent): void {
    const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (isSearchShortcut) {
      event.preventDefault();
      input?.focus();
    }
  }

  onMount(() => window.addEventListener("keydown", handleKeydown));
  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
    if (timer) clearTimeout(timer);
  });
</script>

<div class="search">
  <span aria-hidden="true">Search</span>
  <input
    bind:this={input}
    value={value}
    type="search"
    placeholder="Find Markdown files"
    aria-label="Search Markdown files"
    on:input={(event) => updateSearch(event.currentTarget.value)}
  />
  {#if value}
    <button type="button" aria-label="Clear search" title="Clear search" on:click={clear}>×</button>
  {/if}
</div>
