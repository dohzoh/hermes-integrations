# Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore` (update existing)

**Interfaces:**
- Consumes: None
- Produces: None

## Steps

- [ ] **Step 1: Create package.json**

```json
{
  "name": "firebase-hosting-fetch",
  "version": "1.0.0",
  "description": "Fetch all files from a Firebase Hosting site with Unicode/Japanese support",
  "type": "module",
  "bin": "./dist/cli.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "firebase-tools": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Update .gitignore**

Add to existing `.gitignore`:
```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

- [ ] **Step 5: Verify build works**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "chore: initialize project with TypeScript, commander, vitest"
```
