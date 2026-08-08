const express = require('express');
const fs = require('fs');
const path = require('path');
const { Blockchain } = require('./blockchain');

const PORT = process.env.PORT || 3000;
const CHAIN_FILE = path.join(__dirname, 'chain.json');

function loadChain() {
  if (fs.existsSync(CHAIN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHAIN_FILE, 'utf8'));
      return Blockchain.fromJSON(data);
    } catch (err) {
      console.error('Failed to parse chain.json, starting a fresh chain:', err.message);
    }
  }
  return new Blockchain();
}

function saveChain(blockchain) {
  fs.writeFileSync(CHAIN_FILE, JSON.stringify(blockchain.toJSON(), null, 2));
}

const blockchain = loadChain();
saveChain(blockchain);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/tutorial.html', (req, res) => {
  res.sendFile('tutorial.html', { root: __dirname });
});

app.get('/api/chain', (req, res) => {
  res.json(blockchain.chain);
});

app.get('/api/pending', (req, res) => {
  res.json(blockchain.pendingTransactions);
});

app.post('/api/transactions', (req, res) => {
  try {
    const tx = blockchain.addTransaction(req.body);
    saveChain(blockchain);
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/mine/start', (req, res) => {
  try {
    const template = blockchain.getMiningTemplate();
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/mine/submit', (req, res) => {
  try {
    const block = blockchain.submitMinedBlock(req.body);
    saveChain(blockchain);
    res.json(block);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/validate', (req, res) => {
  res.json(blockchain.isChainValid());
});

app.post('/api/tamper', (req, res) => {
  try {
    const { blockIndex, transactionIndex, amount } = req.body;
    const block = blockchain.tamperBlock(blockIndex, transactionIndex, amount);
    saveChain(blockchain);
    res.json(block);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/difficulty', (req, res) => {
  res.json({ difficulty: blockchain.difficulty });
});

app.post('/api/difficulty', (req, res) => {
  const difficulty = blockchain.setDifficulty(req.body.difficulty);
  saveChain(blockchain);
  res.json({ difficulty });
});

app.listen(PORT, () => {
  console.log(`ChainDemo server running at http://localhost:${PORT}`);
});
