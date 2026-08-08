const txForm = document.getElementById('tx-form');
const txError = document.getElementById('tx-error');
const pendingList = document.getElementById('pending-list');
const chainEl = document.getElementById('chain');
const mineBtn = document.getElementById('mine-btn');
const validateBtn = document.getElementById('validate-btn');
const mineStatus = document.getElementById('mine-status');
const difficultyInput = document.getElementById('difficulty');
const difficultyValue = document.getElementById('difficulty-value');

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
}

function renderBlock(block, isInvalid) {
  const txRows =
    block.transactions
      .map(
        (tx, i) => `
    <div class="tx">
      ${tx.from} → ${tx.to}:
      <input type="number" value="${tx.amount}" data-tamper-block="${block.index}" data-tamper-tx="${i}" />
    </div>`
      )
      .join('') || '<div class="tx">(genesis — no transactions)</div>';

  return `
    <div class="block ${isInvalid ? 'invalid' : ''}">
      <h4>Block #${block.index}</h4>
      <div>Nonce: ${block.nonce}</div>
      ${txRows}
      <div class="prev">prev: ${block.previousHash.slice(0, 16)}…</div>
      <div class="hash">hash: ${block.hash.slice(0, 16)}…</div>
    </div>`;
}

async function loadChain(invalidBlocks = []) {
  const res = await fetch('/api/chain');
  const chain = await res.json();
  chainEl.innerHTML = chain
    .map((block) => renderBlock(block, invalidBlocks.includes(block.index)))
    .join('');
  chainEl.querySelectorAll('[data-tamper-block]').forEach((input) => {
    input.addEventListener('change', onTamper);
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

mineBtn.addEventListener('click', async () => {
  mineStatus.textContent = 'Mining…';
  mineBtn.disabled = true;
  try {
    const res = await fetch('/api/mine', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      mineStatus.textContent = data.error;
      return;
    }
    mineStatus.textContent = `Mined block #${data.index} (nonce ${data.nonce})`;
    await loadPending();
    await onValidate();
  } finally {
    mineBtn.disabled = false;
  }
});

validateBtn.addEventListener('click', onValidate);

async function onValidate() {
  const res = await fetch('/api/validate');
  const result = await res.json();
  mineStatus.textContent = result.valid
    ? 'Chain is valid ✓'
    : `Chain INVALID at block(s): ${result.invalidBlocks.join(', ')}`;
  await loadChain(result.invalidBlocks);
}

difficultyInput.addEventListener('change', async () => {
  const difficulty = Number(difficultyInput.value);
  const res = await fetch('/api/difficulty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty }),
  });
  const data = await res.json();
  difficultyValue.textContent = data.difficulty;
});

(async function init() {
  await loadDifficulty();
  await loadPending();
  await onValidate();
})();
