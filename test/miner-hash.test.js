const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { sha256Hex } = require('../public/sha256');
const { buildMiningInput } = require('../public/mining-input');
const { Block } = require('../blockchain');

function nodeSha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

test('sha256Hex matches Node crypto for a range of inputs', () => {
  const cases = [
    '',
    'abc',
    'hello world',
    '🚀 unicode test — 日本語',
    'y'.repeat(55),
    'y'.repeat(56),
    'y'.repeat(57),
    'y'.repeat(1000),
  ];
  for (const input of cases) {
    assert.equal(sha256Hex(input), nodeSha256(input), `mismatch for input length ${input.length}`);
  }
});

test('buildMiningInput + sha256Hex matches Block.calculateHash for the same fields', () => {
  const index = 3;
  const timestamp = 1786223187313;
  const transactions = [{ from: 'alice', to: 'bob', amount: 10 }];
  const previousHash = 'abc123';
  const nonce = 42;

  const block = new Block(index, timestamp, transactions, previousHash);
  block.nonce = nonce;
  block.hash = block.calculateHash();

  const clientHash = sha256Hex(buildMiningInput(index, timestamp, transactions, previousHash, nonce));

  assert.equal(clientHash, block.hash);
});
