import { Command } from 'commander';
import { getLatestVersion, listFiles, fetchFiles } from './fetch-files.js';
import type { CLIOptions } from './types.js';

export function parseArgs(args: string[]): CLIOptions {
  const program = new Command();
  program
    .name('firebase-hosting-fetch')
    .description('Fetch all files from a Firebase Hosting site')
    .argument('<site>', 'Firebase Hosting site name')
    .option('-o, --output <dir>', 'Output directory', './downloaded')
    .option('-c, --concurrency <n>', 'Max concurrent fetches', '100')
    .parse(args);

  const opts = program.opts();
  const site = program.args[0];
  if (!site) throw new Error('site name is required');

  return {
    site,
    output: opts.output,
    concurrency: parseInt(opts.concurrency, 10)
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  console.log(`Fetching files from ${opts.site}...`);

  const token = process.env.FIREBASE_TOKEN;
  if (!token) {
    console.error('ERROR: FIREBASE_TOKEN environment variable is required');
    process.exit(1);
  }

  const versionName = await getLatestVersion(opts.site);
  const versionId = versionName.split('/').pop()!;
  const outputDir = opts.output || `${opts.site}_${versionId}`;

  console.log(`Version: ${versionId}`);
  console.log(`Output: ${outputDir}`);

  const files = await listFiles(versionName, token);
  console.log(`Found ${files.length} files`);

  await fetchFiles(opts.site, token, files, outputDir, opts.concurrency);
  console.log('Complete!');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
