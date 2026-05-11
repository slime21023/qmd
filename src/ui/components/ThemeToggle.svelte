<script lang="ts">
  import { onMount } from "svelte";

  let theme: "light" | "dark" = "light";

  function applyTheme(nextTheme: "light" | "dark"): void {
    theme = nextTheme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("qmd-theme", theme);
  }

  function toggle(): void {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  onMount(() => {
    const saved = localStorage.getItem("qmd-theme");
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return;
    }

    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
</script>

<button class="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme" on:click={toggle}>
  {theme === "dark" ? "☾" : "☀"}
</button>
