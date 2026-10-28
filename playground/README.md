# BHSS playground control

This local stage selector keeps demonstrations isolated:

- Playground v1 runs `../portfolio-poc` unchanged.
- Playground v2 runs `../portfolio-poc-v2` with a separate SQLite database and `/api/v2` contract.

Install dependencies in each playground once, then run:

```sh
cd playground
npm start
```

Open `http://127.0.0.1:3000`. Add future stages to `registry.json`; the launcher does not need stage-specific code.
