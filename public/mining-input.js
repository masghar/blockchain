function buildMiningInput(index, timestamp, transactions, previousHash, nonce) {
  return index + timestamp + JSON.stringify(transactions) + previousHash + nonce;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildMiningInput };
}
