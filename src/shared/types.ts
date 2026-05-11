export interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

export interface FilesResponse {
  root: string;
  tree: FileNode;
}

export interface FileResponse {
  path: string;
  name: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export interface SearchResponse {
  query: string;
  results: Pick<FileNode, "name" | "path">[];
}

export interface ApiError {
  error: string;
  message: string;
}

export interface CliArgs {
  dir: string;
  port: number;
  open: boolean;
  depth: number;
  ignore: string[];
}
