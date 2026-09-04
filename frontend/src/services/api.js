const BASE_URL = '/api/v1';

export async function fetchMerchants() {
  const res = await fetch(`${BASE_URL}/merchants`);
  if (!res.ok) throw new Error('Failed to fetch merchants');
  return res.json();
}

export async function fetchMerchantSummary(merchantId) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchCashflow(merchantId) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/cashflow`);
  if (!res.ok) throw new Error('Failed to fetch cashflow ledger');
  return res.json();
}

export async function fetchForecast(merchantId, horizonDays = 30) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/forecast?horizon_days=${horizonDays}`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

export async function fetchAnomalies(merchantId) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/anomalies`);
  if (!res.ok) throw new Error('Failed to fetch anomalies');
  return res.json();
}

export async function fetchObligations(merchantId) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/obligations`);
  if (!res.ok) throw new Error('Failed to fetch obligations');
  return res.json();
}

export async function fetchRecentTransactions(merchantId, limit = 20) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/transactions?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function simulateScenario(merchantId, params) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to run scenario');
  return res.json();
}

export async function evaluateDecision(merchantId, params) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to evaluate decision');
  return res.json();
}

export async function queryCopilot(merchantId, question) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/copilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Failed to query copilot');
  return res.json();
}

export async function fetchDataQuality(merchantId) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/data-quality`);
  if (!res.ok) throw new Error('Failed to fetch data quality');
  return res.json();
}

export async function fetchModelEvaluation() {
  const res = await fetch(`${BASE_URL}/models/evaluation`);
  if (!res.ok) throw new Error('Failed to fetch evaluations');
  return res.json();
}

export async function fetchStatementHistory(merchantId, limit = 250) {
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/statement-history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch statement history');
  return res.json();
}

export async function uploadStatement(merchantId, file, closingBalance = null, replaceMode = false) {
  const formData = new FormData();
  formData.append('file', file);
  if (closingBalance !== null && closingBalance !== undefined && closingBalance !== '') {
    formData.append('closing_balance', String(closingBalance));
  }
  if (replaceMode) {
    formData.append('replace_mode', 'true');
  }
  const res = await fetch(`${BASE_URL}/merchants/${merchantId}/upload-statement`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload statement');
  }
  return res.json();
}
