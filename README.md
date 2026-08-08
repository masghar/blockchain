<div align="center">

<img src="assets/banner.svg" alt="ChainDemo — a JavaScript blockchain simulator with proof-of-work mining, tamper detection, and a live web GUI" width="100%" />

### A hands-on **blockchain simulator** built with **Node.js, Express, and vanilla JavaScript**

Mine blocks with real proof-of-work · tamper with data and watch the chain break · learn how blockchains actually work by reading (and running) the code

[![License: MIT](https://img.shields.io/badge/License-MIT-37c977.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-5b8cff.svg)](https://nodejs.org)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No build step](https://img.shields.io/badge/frontend-no%20build%20step-informational.svg)](#tech-stack)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

[**Live Demo**](#quick-start) · [**Tutorial**](tutorial.html) · [**API Reference**](#api-reference) · [**FAQ**](#faq)

</div>

---

## What is ChainDemo?

**ChainDemo** is a small, self-contained **blockchain simulator with a browser-based GUI** —
built to make the core ideas behind blockchain technology (cryptographic hashing, block
chaining, proof-of-work mining, and tamper-evidence) tangible in a few minutes, instead of
abstract theory.

It's a great starting point if you're learning **how blockchain works**, teaching a
workshop, prepping for an interview, or just want a **Node.js blockchain example** you can
read end-to-end in one sitting. No cryptocurrency, no wallets, no blockchain network to
join — just the mechanics, laid bare, with a UI you can click through.

**In the app you can:**

- ✍️ **Add transactions** to a pending pool (`from`, `to`, `amount`)
- ⛏️ **Mine a block** and watch a real **SHA-256 proof-of-work** search run
- 🎚️ **Adjust mining difficulty** live and see how much longer mining takes per extra leading zero
- 🛠️ **Tamper with a mined block** and watch invalidity cascade to every block after it
- ✅ **Validate the chain** on demand and see exactly which blocks broke

<div align="center">
<img src="assets/chain-diagram.svg" alt="Diagram showing that tampering with one block in the chain invalidates every block that comes after it" width="85%" />
</div>

---

## Table of Contents

- [Why ChainDemo?](#why-chaindemo)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Using the GUI](#using-the-gui)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why ChainDemo?

Most "learn blockchain" resources are either a wall of theory or a 10,000-line
cryptocurrency client. ChainDemo sits in between:

| | ChainDemo | Whitepapers & theory | Full crypto clients |
|---|---|---|---|
| Runs in your browser | ✅ | ❌ | Sometimes |
| Readable in one sitting | ✅ | Depends | ❌ |
| Real SHA-256 proof-of-work | ✅ | Described only | ✅ |
| Zero dependencies to learn | ✅ (just Express) | — | ❌ (wallets, P2P, consensus…) |
| Tamper-detection you can trigger yourself | ✅ | ❌ | Rarely exposed in the UI |

It's deliberately **not** a cryptocurrency: there are no wallets, private keys, signatures,
or peer-to-peer networking. That's on purpose — stripping those away is what makes the
core mechanism (hash → chain → proof-of-work → tamper-evidence) easy to see clearly.

## Quick Start

**Requirements:** [Node.js](https://nodejs.org) 18 or later.

```bash
git clone https://github.com/masghar/blockchain.git
cd blockchain
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

Want the concepts explained alongside the code first? Open
**[tutorial.html](tutorial.html)** (or click "Tutorial" in the app's header).

## How It Works

Every block is hashed with SHA-256 over its own contents plus the previous block's hash —
that's the "chain" in blockchain. Mining searches for a `nonce` that makes the hash start
with N leading zeros (the difficulty). Change any data in a mined block without re-mining
it, and its hash no longer matches its contents — and neither does the `previousHash` of
every block that follows, so the break cascades forward. That's tamper-evidence in action.

For the full walkthrough — with the actual `calculateHash()`, `mine()`, and
`isChainValid()` code from this repo — see **[tutorial.html](tutorial.html)**.

## Using the GUI

| Control | What it does |
|---|---|
| **Add Transaction** | Queues a `{ from, to, amount }` entry into the pending pool |
| **⛏ Mine Block** | Bundles pending transactions into a new block and runs proof-of-work at the current difficulty |
| **Difficulty slider (1–5)** | Sets how many leading zeros the next mined block's hash must have — each extra zero roughly multiplies the search space by 16 |
| **Inline amount edit** | Tampers with a mined transaction directly, without re-mining — the fastest way to see detection in action |
| **✓ Validate Chain** | Recomputes every block's hash and flags exactly which blocks are invalid |

## API Reference

ChainDemo exposes a small REST API (consumed by the bundled GUI, but usable from `curl`,
Postman, or your own frontend):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/chain` | Full chain |
| `GET` | `/api/pending` | Pending (unmined) transactions |
| `POST` | `/api/transactions` | Queue a transaction `{from, to, amount}` |
| `POST` | `/api/mine` | Mine pending transactions into a new block |
| `GET` | `/api/validate` | Check chain validity — returns `{ valid, invalidBlocks }` |
| `POST` | `/api/tamper` | Deliberately corrupt a block's transaction (demo only) |
| `GET` / `POST` | `/api/difficulty` | Read/set mining difficulty (clamped 1–5) |

<details>
<summary>Example: add a transaction and mine it (curl)</summary>

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"from":"alice","to":"bob","amount":10}'

curl -X POST http://localhost:3000/api/mine
```

</details>

## Project Structure

```
blockchain.js             Core Block/Blockchain classes (framework-free, unit-testable)
server.js                 Express app: REST API + chain.json persistence + static file serving
public/                   Browser GUI (index.html, styles.css, app.js) — no build step
tutorial.html             Standalone written walkthrough of the concepts and code
test/blockchain.test.js   Unit tests for the core module
chain.json                Generated at runtime; holds the persisted chain (git-ignored)
```

## Tech Stack

- **Backend:** [Node.js](https://nodejs.org) + [Express](https://expressjs.com)
- **Frontend:** Plain HTML, CSS, and JavaScript — no framework, no bundler, no build step
- **Hashing:** SHA-256 via Node's built-in [`crypto`](https://nodejs.org/api/crypto.html) module
- **Persistence:** A flat `chain.json` file (no database required)
- **Testing:** Node's built-in [`node:test`](https://nodejs.org/api/test.html) runner

## Testing

```bash
npm test
```

Runs the unit test suite in `test/blockchain.test.js`, covering hash chaining, mining
difficulty, cascading tamper detection, transaction validation, and JSON persistence
round-trips.

## FAQ

**Is this a real cryptocurrency or blockchain network?**
No. There are no wallets, private keys, digital signatures, or peer-to-peer networking.
ChainDemo runs as a single node and focuses purely on the data-structure and
hashing/mining mechanics that underpin real blockchains.

**What is proof-of-work, in one sentence?**
It's an artificial cost — search for a `nonce` value until a block's hash happens to start
with enough zeros — that makes creating a new block slow and rewriting old ones
prohibitively expensive.

**Why does tampering with one block break the blocks after it too?**
Because each block stores the previous block's hash. If you edit a block's data without
re-mining it, its own hash no longer matches its content, *and* every later block's
recorded `previousHash` no longer matches what that block truly hashes to now — so the
invalidity cascades forward through the whole chain.

**Can I increase the difficulty beyond 5?**
The API clamps difficulty to 1–5 so mining stays fast in a browser demo. You're welcome to
raise that limit locally in `blockchain.js` if you want to see mining take noticeably
longer.

**Does the chain survive a server restart?**
Yes — it's persisted to `chain.json` on disk after every mine/tamper/difficulty change, and
reloaded automatically on the next `npm start`.

## Roadmap

- [ ] Optional multi-node / peer-to-peer sync mode
- [ ] Wallet + digital signature layer (opt-in, keeping the current mode as default)
- [ ] Dockerfile for one-command deployment

Have an idea? Open an issue.

## Contributing

Contributions are welcome! To propose a change:

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Make your change and add/update tests in `test/`
3. Run `npm test` and make sure everything passes
4. Open a pull request describing what changed and why

## License

Released under the [MIT License](LICENSE) — free to use, modify, and learn from.

---

<div align="center">

If ChainDemo helped you understand blockchains a little better, consider ⭐ **starring the repo**.

</div>
