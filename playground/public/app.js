const container = document.querySelector('#stages');
const copy = {
  en: {
    eyebrow: 'BHSS MVP · LOCAL STAGE CONTROL',
    title: 'Portfolio playgrounds',
    intro: 'Each playground owns its application and database. Moving to a new stage does not migrate or overwrite an earlier demonstration.',
    application: 'Application', api: 'API', open: 'Open', current: 'current', preserved: 'preserved',
    ruleTitle: 'Stage rule',
    ruleCopy: 'v1 stays available for comparison. v2 follows the current Core and CSV 3.0 role contracts. AI generation is intentionally not connected, while its dummy review interface remains visible.',
    error: 'The stage registry could not be loaded.',
  },
  'zh-HK': {
    eyebrow: 'BHSS MVP · 本機版本控制',
    title: 'Portfolio Playground',
    intro: '每個 Playground 都有自己的應用程式及資料庫。切換至新版本不會遷移或覆蓋較早的示範。',
    application: '應用程式', api: 'API', open: '開啟', current: '目前版本', preserved: '保留版本',
    ruleTitle: '版本原則',
    ruleCopy: 'v1 保留作比較；v2 按目前 Core 及 CSV 3.0 角色格式實作。系統刻意不接駁 AI 生成路由，但仍保留模擬草稿及覆核介面。',
    error: '未能載入 Playground 版本登記。',
  },
};
let stages = [];
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let language = requestedLanguage === 'zh-HK' ? 'zh-HK' : requestedLanguage === 'en' ? 'en' : localStorage.getItem('bhss-language') === 'zh-HK' ? 'zh-HK' : 'en';

function stageUrl(value) {
  const url = new URL(value);
  url.searchParams.set('lang', language);
  return url.toString();
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
