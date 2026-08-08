const test = require('node:test');
const assert = require('node:assert/strict');
const { Block, Blockchain } = require('../blockchain');

test('chain links blocks via previousHash', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  const mined = bc.minePendingTransactions();
  assert.equal(mined.previousHash, bc.chain[0].hash);
  assert.equal(bc.chain.length, 2);
});

test('mining respects difficulty', () => {
  const bc = new Blockchain();
  bc.setDifficulty(2);
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 5 });
  const mined = bc.minePendingTransactions();
  assert.equal(mined.hash.substring(0, 2), '00');
});

test('chain is valid after normal mining', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  bc.minePendingTransactions();
  bc.addTransaction({ from: 'bob', to: 'carol', amount: 3 });
  bc.minePendingTransactions();

  const result = bc.isChainValid();
  assert.equal(result.valid, true);
  assert.deepEqual(result.invalidBlocks, []);
});

test('tampering with a block is detected and cascades to later blocks', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  bc.minePendingTransactions(); // block 1
  bc.addTransaction({ from: 'bob', to: 'carol', amount: 3 });
  bc.minePendingTransactions(); // block 2

  bc.tamperBlock(1, 0, 9999);
  const result = bc.isChainValid();

  assert.equal(result.valid, false);
  assert.deepEqual(result.invalidBlocks, [1, 2]);
});

test('tampering invalidates every block after it, not just the next one', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  bc.minePendingTransactions(); // block 1
  bc.addTransaction({ from: 'bob', to: 'carol', amount: 3 });
  bc.minePendingTransactions(); // block 2
  bc.addTransaction({ from: 'carol', to: 'dave', amount: 7 });
  bc.minePendingTransactions(); // block 3

  bc.tamperBlock(1, 0, 99999);
  const result = bc.isChainValid();

  assert.equal(result.valid, false);
  assert.deepEqual(result.invalidBlocks, [1, 2, 3]);
});

test('addTransaction rejects invalid input', () => {
  const bc = new Blockchain();
  assert.throws(() => bc.addTransaction({ from: '', to: 'bob', amount: 10 }));
  assert.throws(() => bc.addTransaction({ from: 'alice', to: 'bob', amount: -5 }));
  assert.throws(() => bc.addTransaction({ from: 'alice', to: 'bob', amount: 'ten' }));
});

test('minePendingTransactions rejects an empty pool', () => {
  const bc = new Blockchain();
  assert.throws(() => bc.minePendingTransactions());
});

test('setDifficulty clamps to the 1-5 range', () => {
  const bc = new Blockchain();
  assert.equal(bc.setDifficulty(0), 1);
  assert.equal(bc.setDifficulty(9), 5);
  assert.equal(bc.setDifficulty(3), 3);
});

test('toJSON/fromJSON round-trips a mined chain', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  bc.minePendingTransactions();

  const restored = Blockchain.fromJSON(JSON.parse(JSON.stringify(bc.toJSON())));
  assert.equal(restored.chain.length, bc.chain.length);
  assert.equal(restored.chain[1].hash, bc.chain[1].hash);
  assert.equal(restored.isChainValid().valid, true);
});

function mineNonceForTemplate(template) {
  const target = '0'.repeat(template.difficulty);
  let nonce = 0;
  while (true) {
    const probe = new Block(template.index, template.timestamp, template.transactions, template.previousHash);
    probe.nonce = nonce;
    probe.hash = probe.calculateHash();
    if (probe.hash.startsWith(target)) return nonce;
    nonce++;
  }
}

function findNonceBelowDifficulty(template) {
  const target = '0'.repeat(template.difficulty);
  let nonce = 0;
  while (true) {
    const probe = new Block(template.index, template.timestamp, template.transactions, template.previousHash);
    probe.nonce = nonce;
    probe.hash = probe.calculateHash();
    if (!probe.hash.startsWith(target)) return nonce;
    nonce++;
  }
}

test('getMiningTemplate returns a snapshot of what to mine against', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  const template = bc.getMiningTemplate();
  assert.equal(template.index, 1);
  assert.equal(template.previousHash, bc.chain[0].hash);
  assert.deepEqual(template.transactions, [{ from: 'alice', to: 'bob', amount: 10 }]);
  assert.equal(template.difficulty, bc.difficulty);
  assert.equal(typeof template.timestamp, 'number');
});

test('getMiningTemplate throws with no pending transactions', () => {
  const bc = new Blockchain();
  assert.throws(() => bc.getMiningTemplate());
});

test('submitMinedBlock appends a correctly-mined block and clears pending transactions', () => {
  const bc = new Blockchain();
  bc.setDifficulty(1);
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  const template = bc.getMiningTemplate();
  const nonce = mineNonceForTemplate(template);

  const block = bc.submitMinedBlock({
    timestamp: template.timestamp,
    nonce,
    previousHash: template.previousHash,
    transactions: template.transactions,
  });

  assert.equal(block.index, 1);
  assert.equal(bc.chain.length, 2);
  assert.deepEqual(bc.pendingTransactions, []);
});

test('submitMinedBlock rejects a nonce that does not meet difficulty', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  const template = bc.getMiningTemplate();
  const badNonce = findNonceBelowDifficulty(template);

  assert.throws(() =>
    bc.submitMinedBlock({
      timestamp: template.timestamp,
      nonce: badNonce,
      previousHash: template.previousHash,
      transactions: template.transactions,
    })
  );
  assert.equal(bc.chain.length, 1);
});

test('submitMinedBlock rejects a submission against stale pending transactions', () => {
  const bc = new Blockchain();
  bc.addTransaction({ from: 'alice', to: 'bob', amount: 10 });
  const template = bc.getMiningTemplate();

  bc.addTransaction({ from: 'bob', to: 'carol', amount: 3 }); // pool changes after the template was read

  assert.throws(() =>
    bc.submitMinedBlock({
      timestamp: template.timestamp,
      nonce: 0,
      previousHash: template.previousHash,
      transactions: template.transactions, // stale — no longer matches bc.pendingTransactions
    })
  );
  assert.equal(bc.chain.length, 1);
});
