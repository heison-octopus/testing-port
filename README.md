# BHSS student growth portfolio MVP

This repository contains the BHSS student-growth Portfolio documentation, data contracts and local proof-of-concept applications. The Portfolio is intended to show learning and growth through activities, reflection, evidence and human review rather than operate as a marks leaderboard.

The setup commands below assume macOS, Linux or WSL.

## Prerequisites

- Node.js 22.13 or newer with `node:sqlite`; Node 22 LTS is recommended.
- npm, which is included with Node.js.
- Git for obtaining and updating the repository.

Check the installed versions:

```bash
node --version
npm --version
```

If Node Version Manager is available, install and select the latest Node 22 release with:

```bash
nvm install 22
nvm use 22
```

## Install and run both Portfolio versions

V1 and v2 are separate applications with separate dependencies and SQLite databases. There is no root-level npm package, so do not run `npm install` in the repository root.

After cloning the repository, open its root directory and install both applications from their lockfiles:

```bash
cd BHSS-MVP
npm ci --prefix portfolio-poc
npm ci --prefix portfolio-poc-v2
```

Start the stage selector and both applications:

```bash
npm --prefix playground run dev
```

Open the required address:

| Application | Address |
| --- | --- |
| Stage selector | <http://127.0.0.1:3000> |
| Portfolio v1 | <http://127.0.0.1:5173> |
| Portfolio v2 | <http://127.0.0.1:5174> |

The selector starts both POCs. Press `Ctrl+C` in the terminal to stop the selector and its child processes. Do not start the individual applications in other terminals at the same time, because their ports will already be in use.

## Run only Portfolio v2

```bash
cd portfolio-poc-v2
npm ci
npm run dev
```

Development mode starts the following services:

| Service | Address |
| --- | --- |
| V2 website | <http://127.0.0.1:5174> |
| V2 API | <http://127.0.0.1:3200/api/v2> |
| Deterministic Time Infinity roster fixture | <http://127.0.0.1:3210> |

No `.env` file or external service is required for the standard v2 demonstration. The SQLite database is created, migrated and seeded automatically on first start.

Verify the v2 installation:

```bash
npm run build
npm test
```

The browser tests require Playwright Chromium to be installed once:

```bash
npx playwright install chromium
npm run test:e2e
```

Run all v2 build and test checks with:

```bash
npm run test:all
```

See [`portfolio-poc-v2/README.md`](portfolio-poc-v2/README.md) for the demonstrated workflows, database lifecycle and architecture boundaries.

## Run only Portfolio v1

```bash
cd portfolio-poc
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. The v1 API runs at <http://127.0.0.1:3100>.

Verify the v1 installation:

```bash
npm run build
npm test
```

See [`portfolio-poc/README.md`](portfolio-poc/README.md) for the v1 demonstration scope and deliberate limitations.

## Optional local LLM for v2

V2 works without an LLM. To enable local learner-narrative generation, copy the server-only environment template:

```bash
cd portfolio-poc-v2
cp .env.example .env
```

Edit `.env` and supply the approved local provider values:

```dotenv
LOCAL_LLM_BASE_URL=http://your-server/v1
LOCAL_LLM_API_KEY=your-secret
LOCAL_LLM_MODEL=your-model-id
```

Check model discovery and start v2:

```bash
npm run llm:models
npm run dev
```

Never rename server secrets with a `VITE_` prefix. Vite exposes variables carrying that prefix to the browser bundle.

## Local databases and reset

Each POC creates its own local database:

| Application | Database |
| --- | --- |
| V1 | `portfolio-poc/portfolio.sqlite` |
| V2 | `portfolio-poc-v2/playground-v2.sqlite` |

To reset a POC, stop its server and remove only its listed database together with matching `-wal` and `-shm` companion files. The next start recreates the database from the seed data. This permanently removes local demonstration changes, so retain a copy first if those changes are needed.

### Create an empty v2 schema database

V2 can generate a separate SQLite file containing the complete current schema without loading demonstration data:

```bash
cd portfolio-poc-v2
npm run db:create-empty
```

This creates `playground-v2-empty.sqlite`. It contains all migrated tables and the schema migration ledger, but no school, user, activity, evidence or Portfolio rows.

To choose another output path:

```bash
npm run db:create-empty -- ./my-empty.sqlite
```

The generator will not overwrite an existing database. Start the application against the schema-only file with:

```bash
POC_V2_DB=./playground-v2-empty.sqlite POC_V2_SEED_MODE=none npm run dev
```

The account picker will be empty until initial school and identity data are loaded. Return to the normal seeded demonstration by stopping this process and running `npm run dev` without those two environment variables.

## Common startup problems

| Problem | Check |
| --- | --- |
| `node:sqlite` cannot be found | Upgrade to Node.js 22.13 or newer. |
| `vite` or `concurrently` cannot be found | Run `npm ci` inside the relevant POC, or use the `--prefix` installation commands above. |
| An address is already in use | Stop another v1, v2 or stage-selector process using the same port. |
| V2 local AI generation is unavailable | This is expected without valid `LOCAL_LLM_*` settings; the rest of v2 remains usable. |
| Playwright cannot find Chromium | Run `npx playwright install chromium` inside `portfolio-poc-v2`. |

## Documentation

- [`output/English/README.md`](output/English/README.md) indexes the current English architecture, SRS and planning documents.
- [`output/Chinese/README.md`](output/Chinese/README.md) indexes the aligned Traditional Chinese documents.
- [`playground/README.md`](playground/README.md) describes the local stage selector.
- Original supplied documents remain evidence and are not silently rewritten as approved requirements.
