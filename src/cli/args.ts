import type { CliArgs } from "../shared/types";

export interface ParseResult {
  args?: CliArgs;
  exit?: {
    code: number;
    message: string;
  };
}

const DEFAULT_IGNORES = ["node_modules", ".git"];

export function parseArgs(argv: string[], version: string): ParseResult {
  const args: CliArgs = {
    dir: ".",
    port: 3000,
    open: true,
    depth: Number.POSITIVE_INFINITY,
    ignore: [...DEFAULT_IGNORES]
  };

  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token === "--help" || token === "-h") {
      return { exit: { code: 0, message: helpText() } };
    }

    if (token === "--version" || token === "-v") {
      return { exit: { code: 0, message: version } };
    }

    if (token === "--no-open") {
      args.open = false;
      continue;
    }

    if (token === "--port" || token === "-p") {
      const value = argv[index + 1];
      if (!value) return error("Missing value for --port.");
      index += 1;
      args.port = parsePositiveInteger(value, "--port");
      if (!Number.isFinite(args.port)) return error("Port must be a positive integer.");
      continue;
    }

    if (token === "--depth" || token === "-d") {
      const value = argv[index + 1];
      if (!value) return error("Missing value for --depth.");
      index += 1;
      args.depth = parsePositiveInteger(value, "--depth");
      if (!Number.isFinite(args.depth)) return error("Depth must be a positive integer.");
      continue;
    }

    if (token === "--ignore" || token === "-i") {
      const value = argv[index + 1];
      if (!value) return error("Missing value for --ignore.");
      index += 1;
      args.ignore.push(value);
      continue;
    }

    if (token.startsWith("--port=")) {
      args.port = parsePositiveInteger(token.slice("--port=".length), "--port");
      if (!Number.isFinite(args.port)) return error("Port must be a positive integer.");
      continue;
    }

    if (token.startsWith("--depth=")) {
      args.depth = parsePositiveInteger(token.slice("--depth=".length), "--depth");
      if (!Number.isFinite(args.depth)) return error("Depth must be a positive integer.");
      continue;
    }

    if (token.startsWith("--ignore=")) {
      args.ignore.push(token.slice("--ignore=".length));
      continue;
    }

    if (token.startsWith("-")) {
      return error(`Unknown option: ${token}`);
    }

    positional.push(token);
  }

  if (positional.length > 1) {
    return error("Only one directory argument is supported.");
  }

  if (positional[0]) args.dir = positional[0];

  return { args };
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Number.NaN;
  }

  if (option === "--port" && parsed > 65535) {
    return Number.NaN;
  }

  return parsed;
}

function error(message: string): ParseResult {
  return {
    exit: {
      code: 1,
      message: `${message}\n\n${helpText()}`
    }
  };
}

function helpText(): string {
  return `Qmd - Quick Markdown Viewer

Usage:
  qmd [directory] [options]

Options:
  -p, --port <number>     HTTP server port (default: 3000)
      --no-open           Do not open the browser on start
  -d, --depth <number>    Maximum recursive scan depth
  -i, --ignore <pattern>  Ignore file or directory pattern; repeatable
  -v, --version           Display version
  -h, --help              Display help
`;
}
