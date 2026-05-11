<script lang="ts">
  import DOMPurify from "dompurify";
  import hljs from "highlight.js";
  import { marked } from "marked";
  import { currentFile } from "../stores/currentFile";

  $: file = $currentFile;
  $: rendered = file?.content ? renderMarkdown(file.content) : "";

  function renderMarkdown(markdown: string): string {
    const html = marked.parse(markdown, {
      async: false,
      breaks: false,
      gfm: true
    }) as string;

    const document = new DOMParser().parseFromString(html, "text/html");

    document.querySelectorAll("pre code").forEach((block) => {
      const className = block.getAttribute("class") ?? "";
      const language = className.match(/language-([\w-]+)/)?.[1];
      const source = block.textContent ?? "";
      const highlighted =
        language && hljs.getLanguage(language)
          ? hljs.highlight(source, { language }).value
          : hljs.highlightAuto(source).value;
      block.innerHTML = highlighted;
      block.classList.add("hljs");
    });

    document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
      const text = heading.textContent ?? "";
      const id = slugify(text);
      if (!id) return;
      heading.id = id;
      const anchor = document.createElement("a");
      anchor.href = `#${id}`;
      anchor.className = "heading-anchor";
      anchor.textContent = "#";
      heading.append(" ", anchor);
    });

    return DOMPurify.sanitize(document.body.innerHTML);
  }

  function slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function formatDate(value: string): string {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }
</script>

<main class="markdown-shell">
  {#if file?.isLoading}
    <div class="state">Loading...</div>
  {:else if file?.error}
    <div class="state error">{file.error}</div>
  {:else if file?.content}
    <header class="document-header">
      <div>
        <h1>{file.name}</h1>
        <p>{formatDate(file.modifiedAt)} · {file.size.toLocaleString()} bytes</p>
      </div>
    </header>
    <article class="markdown-body">
      {@html rendered}
    </article>
  {:else}
    <div class="state">Select a Markdown file to read.</div>
  {/if}
</main>
