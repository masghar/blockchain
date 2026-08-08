importScripts('sha256.js', 'mining-input.js');

let cancelled = false;

self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (msg.type === 'mine') {
    cancelled = false;
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

  while (!cancelled) {
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
