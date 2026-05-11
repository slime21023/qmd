#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { version } from "../../package.json";
import { parseArgs } from "./args";
import { scanDirectory } from "./scanner";
import { startServer } from "./server";

async function main(): Promise<void> {
  const parsed = parseArgs(Bun.argv.slice(2), version);

  if (parsed.exit) {
    const output = parsed.exit.code === 0 ? console.log : console.error;
    output(parsed.exit.message);
    process.exit(parsed.exit.code);
  }

  const args = parsed.args;
  if (!args) return;

  try {
    const stats = await stat(args.dir);
    if (!stats.isDirectory()) {
      throw new Error(`Target path is not a directory: ${args.dir}`);
    }

    const scan = await scanDirectory(args.dir, {
      depth: args.depth,
      ignore: args.ignore
    });

    const server = startServer({
      root: scan.root,
      tree: scan.tree,
      markdownFiles: scan.markdownFiles,
      port: args.port
    });

    const url = `http://${server.hostname}:${server.port}`;
    printStartup(scan.root, scan.markdownFiles.length, url);

    if (args.open) {
      openBrowser(url);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Qmd failed: ${message}`);
    process.exit(1);
  }
}

function printStartup(root: string, count: number, url: string): void {
  console.log(`✦ Qmd - Quick Markdown Viewer
─────────────────────────────────
📁 Directory : ${root}
📄 Found     : ${count} Markdown files
🌐 Server    : ${url}
─────────────────────────────────
Press Ctrl+C to stop`);
}

function openBrowser(url: string): void {
  const command =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

void main();
