const crypto = require('crypto');

class Block {
  constructor(index, timestamp, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.previousHash +
          this.nonce
      )
      .digest('hex');
  }

  mine(difficulty) {
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

class Blockchain {
  constructor() {
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    const { from, to, amount } = transaction || {};
    if (!from || !to) {
      throw new Error('Transaction must include a non-empty from and to');
    }
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Transaction amount must be a positive number');
    }
    const tx = { from, to, amount };
    this.pendingTransactions.push(tx);
    return tx;
  }

  minePendingTransactions() {
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to mine');
    }
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mine(this.difficulty);
    this.chain.push(block);
    this.pendingTransactions = [];
    return block;
  }

  setDifficulty(level) {
    this.difficulty = Math.min(5, Math.max(1, Math.floor(Number(level))));
    return this.difficulty;
  }

  isChainValid() {
    const invalidBlocks = [];
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      const currentRecalculated = current.calculateHash();
      const previousRecalculated = previous.calculateHash();
      if (
        current.hash !== currentRecalculated ||
        current.previousHash !== previousRecalculated
      ) {
        invalidBlocks.push(i);
      }
    }
    return { valid: invalidBlocks.length === 0, invalidBlocks };
  }

  tamperBlock(blockIndex, transactionIndex, newAmount) {
    const block = this.chain[blockIndex];
    if (!block) {
      throw new Error(`Block ${blockIndex} not found`);
    }
    const tx = block.transactions[transactionIndex];
    if (!tx) {
      throw new Error(`Transaction ${transactionIndex} not found in block ${blockIndex}`);
    }
    // Deliberately mutate the data WITHOUT recalculating the hash,
    // so isChainValid() can demonstrate that the tamper is detected.
    tx.amount = newAmount;
    return block;
  }

  toJSON() {
    return {
      chain: this.chain,
      pendingTransactions: this.pendingTransactions,
      difficulty: this.difficulty,
    };
  }

  static fromJSON(data) {
    const bc = new Blockchain();
    bc.chain = data.chain.map((b) =>
      Object.assign(new Block(b.index, b.timestamp, b.transactions, b.previousHash), {
        nonce: b.nonce,
        hash: b.hash,
      })
    );
    bc.pendingTransactions = data.pendingTransactions || [];
    bc.difficulty = data.difficulty || 2;
    return bc;
  }
}

module.exports = { Block, Blockchain };
