importScripts('sha256.js', 'mining-input.js');

// Cancellation is handled by the main thread calling .terminate() on this
// worker (a hard stop) rather than an in-worker message protocol: this
// worker is single-threaded and runs a tight synchronous loop in mine(),
// so it can never process an incoming message mid-loop — onmessage only
// gets a chance to run again once mine() returns, which happens only when
// it finds a result.
self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'mine') {
    mine(msg.template);
  }
};

function mine(template) {
  const { index, timestamp, transactions, previousHash, difficulty } = template;
  const target = '0'.repeat(difficulty);
  let nonce = 0;
  let attempts = 0;
  const startTime = Date.now();
  let lastPost = startTime;

  while (true) {
    const hash = sha256Hex(buildMiningInput(index, timestamp, transactions, previousHash, nonce));
    attempts++;

    if (hash.startsWith(target)) {
      self.postMessage({ type: 'found', nonce, hash, attempts, elapsedMs: Date.now() - startTime });
      return;
    }

    const now = Date.now();
    if (now - lastPost >= 100) {
      self.postMessage({ type: 'progress', nonce, hash, attempts, elapsedMs: now - startTime });
      lastPost = now;
    }

    nonce++;
  }
}
