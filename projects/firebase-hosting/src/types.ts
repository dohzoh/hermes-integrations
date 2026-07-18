export interface FirebaseRelease {
  name: string;
  version: { name: string };
}

export interface FirebaseFileList {
  files: Array<{ path: string }>;
  nextPageToken?: string;
}

export interface CLIOptions {
  site: string;
  output?: string;
  concurrency: number;
}
