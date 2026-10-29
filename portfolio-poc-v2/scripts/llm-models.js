export function parseModelIds(body) {
  const records = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
  return [...new Set(records.map(item => typeof item === 'string' ? item : item?.id || item?.name).filter(Boolean))].sort();
}

export async function fetchAvailableModels({ baseUrl, apiKey }) {
  const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Model discovery failed with HTTP ${response.status}`);
  const ids = parseModelIds(await response.json());
  if (!ids.length) throw new Error('Model discovery returned no model IDs');
  return ids;
}

export function printAvailableModels(ids) {
  console.log(`Available models (${ids.length}):`);
  for (const id of ids) console.log(`- ${id}`);
}
