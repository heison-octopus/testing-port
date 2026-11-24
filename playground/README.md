# BHSS playground control

This local stage selector keeps demonstrations isolated:

- Playground v1 runs `../portfolio-poc` unchanged.
- Playground v3 runs `../portfolio-poc-v3` on its own JWT/API and Vite ports for comparison.
- Playground v2 runs `../portfolio-poc-v2` with a separate SQLite database and `/api/v2` contract.
- Playground v4 runs `../portfolio-poc-v4` with its own V4 SQLite database, React + Vite client, JWT sessions and `/api` contract.

Install dependencies in each playground once, then run:

```sh
cd playground
npm start
```

Open `http://127.0.0.1:3000`. Add future stages to `registry.json`; the launcher does not need stage-specific code. V3 is listed at `http://127.0.0.1:5180` with API `http://127.0.0.1:3300`; V4 is listed at `http://127.0.0.1:5184` with API `http://127.0.0.1:4194`. The selector also polls every stage and shows an endpoint matrix with the reachable host or `Failed`.
