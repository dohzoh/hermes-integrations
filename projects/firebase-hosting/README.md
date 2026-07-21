# firebase-hosting-fetch

> Issue: [https://github.com/dohzoh/hermes-integrations/issues/2](https://github.com/dohzoh/hermes-integrations/issues/2)

Fetch all files from a Firebase Hosting site with Unicode/Japanese filename support.

## Getting Started

```bash
npm install
export FIREBASE_TOKEN="your-token"  # from firebase login:ci
npm run start -- <site_name>
```

## Usage

```
npx firebase-hosting-fetch <site> [options]

Arguments:
  site                   Firebase Hosting site name

Options:
  -o, --output <dir>     Output directory (default: <site>_<version>)
  -c, --concurrency <n>  Max concurrent fetches (default: 100)
  -h, --help             display help for command
```

### Examples

```bash
# Fetch all files from a site
npx firebase-hosting-fetch my-site

# Custom output directory and concurrency
npx firebase-hosting-fetch my-site -o ./downloaded -c 50
```

## Structure

```
firebase-hosting-fetch/
├── src/
│   ├── cli.ts            # CLI entry point (commander)
│   ├── fetch-files.ts    # Core logic: list, fetch, write
│   └── types.ts          # Shared types
├── tests/
│   └── fetch-files.test.ts
├── docs/
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
npm run build    # Compile TypeScript
npm test         # Run tests
npm run test:watch  # Watch mode
```
