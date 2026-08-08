# ChainDemo

A small, self-contained blockchain simulator with a browser-based GUI. Add transactions,
mine them into blocks with proof-of-work, tamper with a block to see the chain break, and
validate the chain — all from the browser.

## Quick start

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

## Learn how it works

Open <http://localhost:3000/tutorial.html> (or click "Tutorial" in the app) for a
walkthrough of hashing, chaining, proof-of-work mining, and tamper detection, explained
against this repository's actual code.

## Run the tests

```bash
npm test
```

Runs the `node:test` suite in `test/blockchain.test.js`, covering hash chaining, mining
difficulty, tamper detection, transaction validation, and JSON persistence round-trips.

## Project layout

```
blockchain.js             Core Block/Blockchain classes (framework-free)
server.js                 Express app: REST API + chain.json persistence + static file serving
public/                   Browser GUI (index.html, styles.css, app.js)
tutorial.html             Standalone written walkthrough of the concepts and code
test/blockchain.test.js   Unit tests for the core module
chain.json                Generated at runtime; holds the persisted chain (git-ignored)
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/chain` | Full chain |
| GET | `/api/pending` | Pending (unmined) transactions |
| POST | `/api/transactions` | Queue a transaction `{from, to, amount}` |
| POST | `/api/mine` | Mine pending transactions into a new block |
| GET | `/api/validate` | Check chain validity |
| POST | `/api/tamper` | Deliberately corrupt a block's transaction (demo only) |
| GET/POST | `/api/difficulty` | Read/set mining difficulty (1–5) |
