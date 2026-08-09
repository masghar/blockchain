const txForm = document.getElementById('tx-form');
const txError = document.getElementById('tx-error');
const pendingList = document.getElementById('pending-list');
const chainEl = document.getElementById('chain');

const mineBtn = document.getElementById('mine-btn');
const cancelBtn = document.getElementById('cancel-btn');
const validateBtn = document.getElementById('validate-btn');
const difficultyInput = document.getElementById('difficulty');
const difficultyValue = document.getElementById('difficulty-value');

const consoleIdle = document.getElementById('console-idle');
const consoleActive = document.getElementById('console-active');
const consoleResult = document.getElementById('console-result');
const consoleSolved = document.getElementById('console-solved');
const raceTargetText = document.getElementById('race-target-text');
const raceCurrent = document.getElementById('race-current');
const metricNonce = document.getElementById('metric-nonce');
const metricAttempts = document.getElementById('metric-attempts');
const metricElapsed = document.getElementById('metric-elapsed');
const metricRate = document.getElementById('metric-rate');
const consoleFeed = document.getElementById('console-feed');

const statLength = document.getElementById('stat-length');
const statTx = document.getElementById('stat-tx');
const statDifficulty = document.getElementById('stat-difficulty');
const validityBadge = document.getElementById('validity-badge');

let miningWorker = null;
let feedEntries = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setControlsDisabled(disabled) {
  txForm.querySelectorAll('input, button').forEach((el) => (el.disabled = disabled));
  difficultyInput.disabled = disabled;
  validateBtn.disabled = disabled;
  mineBtn.disabled = disabled;
  chainEl.querySelectorAll('[data-tamper-block]').forEach((el) => (el.disabled = disabled));
}

async function loadPending() {
  const res = await fetch('/api/pending');
  const pending = await res.json();
  pendingList.innerHTML =
    pending.map((tx) => `<li>${tx.from} → ${tx.to}: ${tx.amount}</li>`).join('') ||
    '<li>(none)</li>';
}

async function loadDifficulty() {
  const res = await fetch('/api/difficulty');
  const data = await res.json();
  difficultyInput.value = data.difficulty;
  difficultyValue.textContent = data.difficulty;
  statDifficulty.textContent = data.difficulty;
}

function updateStatsBar(chain, validityText, validityClass) {
  statLength.textContent = chain.length;
  statTx.textContent = chain.reduce((sum, b) => sum + b.transactions.length, 0);
  validityBadge.textContent = validityText;
  validityBadge.className = 'badge ' + validityClass;
}

function renderBlock(block, state) {
  const txRows =
    block.transactions
      .map(
        (tx, i) => `
    <div class="tx">
      <span>${tx.from} → ${tx.to}</span>
      <input type="number" value="${tx.amount}" data-tamper-block="${block.index}" data-tamper-tx="${i}" />
    </div>`
      )
      .join('') || '<div class="tx tx-empty">genesis — no transactions</div>';

  const stateLabel = { pending: '…', checking: 'checking…', valid: '✓ valid', invalid: '✕ invalid' }[state];

  return `
    <div class="block block--${state}">
      <div class="block-card">
        <div class="block-head">
          <h4>Block #${block.index}</h4>
          <span class="block-state">${stateLabel}</span>
        </div>
        <div class="block-meta">nonce ${block.nonce}</div>
        ${txRows}
        <div class="block-hash-row"><span class="hash-label">prev</span><code class="hash-full">${block.previousHash}</code></div>
        <div class="block-hash-row"><span class="hash-label">hash</span><code class="hash-full">${block.hash}</code></div>
      </div>
    </div>`;
}

function renderTimeline(chain, states, controlsDisabled) {
  chainEl.innerHTML = chain.map((block, i) => renderBlock(block, states[i])).join('');
  chainEl.querySelectorAll('[data-tamper-block]').forEach((input) => {
    input.addEventListener('change', onTamper);
    if (controlsDisabled) input.disabled = true;
  });
}

async function onTamper(e) {
  const blockIndex = Number(e.target.dataset.tamperBlock);
  const transactionIndex = Number(e.target.dataset.tamperTx);
  const amount = Number(e.target.value);
  await fetch('/api/tamper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockIndex, transactionIndex, amount }),
  });
  await onValidate();
}

txForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  txError.textContent = '';
  const from = document.getElementById('tx-from').value;
  const to = document.getElementById('tx-to').value;
  const amount = Number(document.getElementById('tx-amount').value);
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, amount }),
  });
  if (!res.ok) {
    const err = await res.json();
    txError.textContent = err.error;
    return;
  }
  txForm.reset();
  await loadPending();
});

// --- Step-by-step validation walkthrough ---

async function onValidate() {
  setControlsDisabled(true);
  const [validateRes, chainRes] = await Promise.all([fetch('/api/validate'), fetch('/api/chain')]);
  const result = await validateRes.json();
  const chain = await chainRes.json();

  const states = chain.map(() => 'pending');
  renderTimeline(chain, states, true);
  validityBadge.textContent = 'checking…';
  validityBadge.className = 'badge checking';

  const firstInvalid = result.invalidBlocks.length ? Math.min(...result.invalidBlocks) : null;

  for (let i = 0; i < chain.length; i++) {
    states[i] = 'checking';
    renderTimeline(chain, states, true);
    await sleep(180);

    if (firstInvalid !== null && i >= firstInvalid) {
      for (let j = i; j < chain.length; j++) states[j] = 'invalid';
      renderTimeline(chain, states, true);
      break;
    }
    states[i] = 'valid';
    renderTimeline(chain, states, true);
  }

  updateStatsBar(chain, result.valid ? 'valid' : `invalid: ${result.invalidBlocks.join(', ')}`, result.valid ? 'valid' : 'invalid');
  setControlsDisabled(false);
}

validateBtn.addEventListener('click', onValidate);

// --- Live mining ---

function renderAttemptRow(hash, difficulty) {
  raceCurrent.innerHTML = '';
  let mismatchFound = false;
  hash.split('').forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'race-char';
    span.textContent = ch;
    if (i < difficulty && !mismatchFound) {
      if (ch === '0') {
        span.classList.add('match');
      } else {
        span.classList.add('miss');
        mismatchFound = true;
      }
    } else {
      span.classList.add('rest');
    }
    raceCurrent.appendChild(span);
  });
}

function pushFeedEntry(nonce, hash) {
  feedEntries.unshift({ nonce, hash });
  feedEntries = feedEntries.slice(0, 30);
  consoleFeed.innerHTML = feedEntries
    .map((e, i) => `<div class="feed-line${i === 0 ? ' feed-new' : ''}">nonce ${e.nonce} → ${e.hash}</div>`)
    .join('');
}

function updateLiveMetrics(msg, difficulty) {
  metricNonce.textContent = msg.nonce;
  metricAttempts.textContent = msg.attempts;
  metricElapsed.textContent = (msg.elapsedMs / 1000).toFixed(1) + 's';
  metricRate.textContent = msg.elapsedMs > 0 ? Math.round((msg.attempts / msg.elapsedMs) * 1000) : 0;
  renderAttemptRow(msg.hash, difficulty);
  pushFeedEntry(msg.nonce, msg.hash);
}

function finishMining(message, isError) {
  consoleActive.hidden = true;
  consoleResult.hidden = false;
  consoleResult.textContent = message;
  consoleResult.classList.toggle('error', isError);
  mineBtn.textContent = '⛏ Start Mining';
  cancelBtn.hidden = true;
  setControlsDisabled(false);
  if (miningWorker) {
    miningWorker.terminate();
  }
  miningWorker = null;
}

function renderSolvedSummary(template, found, block) {
  const difficulty = template.difficulty;
  const target = '0'.repeat(difficulty);
  const matched = found.hash.slice(0, difficulty);
  const rest = found.hash.slice(difficulty);
  const secondsText = found.elapsedMs > 0 ? `${(found.elapsedMs / 1000).toFixed(2)}s` : 'under 0.01s';
  const rateText = found.elapsedMs > 0
    ? `≈${Math.round((found.attempts / found.elapsedMs) * 1000).toLocaleString()} hashes/sec`
    : 'too fast to measure precisely';
  const attemptsText = found.attempts === 1 ? '1 attempt' : `${found.attempts.toLocaleString()} attempts`;

  consoleSolved.innerHTML = `
    <h3>✓ Proof of work solved — block #${block.index}</h3>
    <p><strong>The problem:</strong> find a nonce so that SHA-256(this block's data + nonce) produces a hash starting with <code>${target}</code> — there's no shortcut, only trying nonces one by one.</p>
    <p><strong>The answer found:</strong> nonce <code>${found.nonce.toLocaleString()}</code></p>
    <div class="solved-hash"><span class="solved-match">${matched}</span>${rest}</div>
    <p>It took <strong>${attemptsText}</strong> over <strong>${secondsText}</strong> (${rateText}) to find a nonce that worked.</p>
    <p><strong>How it was validated:</strong> the server independently recomputed SHA-256 of block #${block.index}'s actual data with nonce <code>${found.nonce.toLocaleString()}</code>, confirmed the result starts with <code>${target}</code>, and only then accepted it onto the chain.</p>
  `;
  consoleSolved.hidden = false;
}

function finishMiningSuccess(template, found, block) {
  consoleActive.hidden = false;
  consoleResult.hidden = true;
  mineBtn.textContent = '⛏ Start Mining';
  cancelBtn.hidden = true;
  setControlsDisabled(false);
  if (miningWorker) {
    miningWorker.terminate();
  }
  miningWorker = null;
  renderSolvedSummary(template, found, block);
}

async function submitMinedBlock(template, found) {
  try {
    const res = await fetch('/api/mine/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: template.timestamp,
        nonce: found.nonce,
        previousHash: template.previousHash,
        transactions: template.transactions,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Mining submission was rejected');
    finishMiningSuccess(template, found, data);
    await loadPending();
    await onValidate();
  } catch (err) {
    finishMining(err.message, true);
  }
}

async function startMining() {
  consoleIdle.hidden = true;
  consoleResult.hidden = true;
  consoleSolved.hidden = true;
  consoleActive.hidden = false;
  feedEntries = [];
  consoleFeed.innerHTML = '';
  mineBtn.textContent = '⏳ Mining…';
  cancelBtn.hidden = false;
  setControlsDisabled(true);

  let template;
  try {
    const res = await fetch('/api/mine/start', { method: 'POST' });
    template = await res.json();
    if (!res.ok) throw new Error(template.error || 'Could not start mining');
  } catch (err) {
    finishMining(err.message, true);
    return;
  }

  raceTargetText.textContent = '0'.repeat(template.difficulty);

  miningWorker = new Worker('miner-worker.js');
  miningWorker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      updateLiveMetrics(msg, template.difficulty);
    } else if (msg.type === 'found') {
      updateLiveMetrics(msg, template.difficulty);
      cancelBtn.hidden = true;
      submitMinedBlock(template, msg);
    }
  };
  miningWorker.onerror = () => {
    finishMining('Mining worker failed to run in this browser.', true);
  };
  miningWorker.postMessage({ type: 'mine', template });
}

function cancelMining() {
  if (miningWorker) {
    miningWorker.terminate();
    miningWorker = null;
  }
  finishMining('Mining cancelled.', false);
}

mineBtn.addEventListener('click', startMining);
cancelBtn.addEventListener('click', cancelMining);

difficultyInput.addEventListener('input', () => {
  difficultyValue.textContent = difficultyInput.value;
});

difficultyInput.addEventListener('change', async () => {
  const difficulty = Number(difficultyInput.value);
  const res = await fetch('/api/difficulty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty }),
  });
  const data = await res.json();
  difficultyValue.textContent = data.difficulty;
  statDifficulty.textContent = data.difficulty;
});

(async function init() {
  await loadDifficulty();
  await loadPending();
  await onValidate();
})();
