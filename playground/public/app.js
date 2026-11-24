const container = document.querySelector('#stages');
const copy = {
  en: {
    eyebrow: 'BHSS MVP · LOCAL STAGE CONTROL',
    title: 'Portfolio playgrounds',
    intro: 'Each playground owns its application and database. Moving to a new stage does not migrate or overwrite an earlier demonstration.',
    application: 'Application', api: 'API', open: 'Open', current: 'current', preserved: 'preserved',
    ruleTitle: 'Stage rule',
    ruleCopy: 'v1 and v3 stay available for comparison. v2 follows the current Core and CSV 3.0 role contracts. v4 is the React + Vite staged activity and access-control implementation with JWT sessions. AI generation is intentionally not connected, while its dummy review interface remains visible.',
    error: 'The stage registry could not be loaded.', healthTitle: 'Live endpoint status', checking: 'Checking…', updated: 'Updated', failed: 'Failed', reachable: 'reachable',
  },
  'zh-HK': {
    eyebrow: 'BHSS MVP · 本機版本控制',
    title: 'Portfolio Playground',
    intro: '每個 Playground 都有自己的應用程式及資料庫。切換至新版本不會遷移或覆蓋較早的示範。',
    application: '應用程式', api: 'API', open: '開啟', current: '目前版本', preserved: '保留版本',
    ruleTitle: '版本原則',
    ruleCopy: 'v1 及 v3 保留作比較；v2 按目前 Core 及 CSV 3.0 角色格式實作；v4 是採用 React + Vite 的活動及存取控制分階段實作，並使用 JWT 工作階段。系統刻意不接駁 AI 生成路由，但仍保留模擬草稿及覆核介面。',
    error: '未能載入 Playground 版本登記。', healthTitle: '端點即時狀態', checking: '檢查中…', updated: '更新於', failed: 'Failed', reachable: '可連線',
  },
};
let stages = [];
const healthMatrix = document.querySelector('#status-matrix tbody');
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let language = requestedLanguage === 'zh-HK' ? 'zh-HK' : requestedLanguage === 'en' ? 'en' : localStorage.getItem('bhss-language') === 'zh-HK' ? 'zh-HK' : 'en';

function stageUrl(value) {
  const url = new URL(value);
  url.searchParams.set('lang', language);
  return url.toString();
}

function endpointCell(endpoint, words) {
  const label = endpoint.ok ? endpoint.value : words.failed;
  return `<span class="health-dot ${endpoint.ok ? 'ok' : 'failed'}"></span><span>${label}</span>`;
}
function renderHealth(payload) {
  const words = copy[language];
  healthMatrix.innerHTML = payload.stages.map(stage => {
    const label = stages.find(item => item.id === stage.id)?.label || stage.id;
    return `<tr><th scope="row">${label}</th><td class="${stage.api.ok ? 'is-ok' : 'is-failed'}" title="${stage.api.code ?? ''}">${endpointCell(stage.api, words)}</td><td class="${stage.frontend.ok ? 'is-ok' : 'is-failed'}" title="${stage.frontend.code ?? ''}">${endpointCell(stage.frontend, words)}</td></tr>`;
  }).join('');
  document.querySelector('#health-title').textContent = words.healthTitle;
  document.querySelector('#health-updated').textContent = `${words.updated} ${new Date(payload.checkedAt).toLocaleTimeString()}`;
}
async function refreshHealth() {
  try { renderHealth(await (await fetch('/api/health', { cache: 'no-store' })).json()); }
  catch { document.querySelector('#health-updated').textContent = copy[language].failed; }
}
function render() {
  const words = copy[language];
  document.documentElement.lang = language === 'zh-HK' ? 'zh-Hant-HK' : 'en';
  document.title = language === 'zh-HK' ? 'BHSS Portfolio Playground' : 'BHSS portfolio playgrounds';
  document.querySelector('#eyebrow').textContent = words.eyebrow;
  document.querySelector('#title').textContent = words.title;
  document.querySelector('#intro').textContent = words.intro;
  document.querySelector('#rule-title').textContent = words.ruleTitle;
  document.querySelector('#rule-copy').textContent = words.ruleCopy;
  document.querySelector('#health-title').textContent = words.healthTitle;
  document.querySelector('#health-updated').textContent = words.checking;
  document.querySelectorAll('[data-language]').forEach(button => { button.classList.toggle('active', button.dataset.language === language); button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
  container.innerHTML = stages.map(stage => `
    <article>
      <div class="stage-top"><span>${stage.label}</span><small class="${stage.status}">${words[stage.status] || stage.status}</small></div>
      <p>${language === 'zh-HK' ? stage.summaryZh || stage.summary : stage.summary}</p>
      <dl><div><dt>${words.application}</dt><dd>${stage.url}</dd></div><div><dt>${words.api}</dt><dd>${stage.apiUrl}</dd></div></dl>
      <a href="${stageUrl(stage.url)}">${words.open} ${stage.label}</a>
    </article>
  `).join('');
}

async function load() {
  const response = await fetch('/api/stages');
  stages = await response.json();
  render();
  await refreshHealth();
}

document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
  language = button.dataset.language;
  localStorage.setItem('bhss-language', language);
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(null, '', url);
  render();
}));

render();
load().catch(() => { container.textContent = copy[language].error; });

setInterval(refreshHealth, 5000);
