import { createFolio } from './folio.js';

const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};

const PROGRESS_KEY = 'aries-iceland-reading';

export function createReader(onChange = () => {}) {
  const dialog = document.querySelector('#reader');
  const content = document.querySelector('#reader-content');
  const back = document.querySelector('#back');
  const trigger = document.querySelector('#folio-open');
  let posts = null;
  let postsRequest = null;
  let mode = 'closed';
  let viewVersion = 0;
  let currentPost = null;
  let saveTimer = 0;
  let lastSaved = readProgress();
  let userScrolled = false;

  content.tabIndex = 0;
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', '文章内容');

  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
      if (!value || typeof value.postId !== 'string') return null;
      return { postId: value.postId, scrollTop: Math.max(0, Number(value.scrollTop) || 0) };
    } catch {
      return null;
    }
  }

  function persistProgress(scrollTop = content.scrollTop) {
    if (!currentPost) return;
    lastSaved = { postId: currentPost.id, scrollTop: Math.max(0, Number(scrollTop) || 0) };
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(lastSaved)); } catch {}
  }

  function clearSaveTimer() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
  }

  function flushPostProgress() {
    clearSaveTimer();
    if (mode === 'post') persistProgress();
  }

  function savePositionSoon() {
    if (mode !== 'post' || !currentPost) return;
    clearSaveTimer();
    const post = currentPost;
    const version = viewVersion;
    saveTimer = setTimeout(() => {
      saveTimer = 0;
      if (mode === 'post' && currentPost === post && viewVersion === version) persistProgress();
    }, 180);
  }

  function showListShell() {
    const title = el('h1', "Aries's Blog");
    title.id = 'reader-title';
    title.tabIndex = -1;
    const status = el('p', '正在取回手记…', 'folio-loading');
    status.setAttribute('role', 'status');
    content.replaceChildren(el('p', '', 'folio-kicker'), title, status);
  }

  function isCurrentList(version) {
    return mode === 'list' && dialog.open && viewVersion === version;
  }

  function getPosts() {
    if (posts) return Promise.resolve(posts);
    if (!postsRequest) {
      postsRequest = fetch(new URL('../data/articles.json', import.meta.url))
        .then(response => {
          if (!response.ok) throw new Error('文章暂时没有载入。');
          return response.json();
        })
        .then(value => {
          if (!Array.isArray(value)) throw new Error('文章暂时没有载入。');
          posts = value;
          return posts;
        })
        .catch(error => {
          postsRequest = null;
          throw error;
        });
    }
    return postsRequest;
  }

  function postMeta(post) {
    const fields = [post.category, post.date === '未标注日期' ? '' : post.date, post.minutes ? `${post.minutes} 分钟` : '']
      .filter(Boolean);
    return fields.join(' / ');
  }

  function makePostEntry(post, index) {
    const button = el('button', undefined, 'post');
    button.type = 'button';
    button.setAttribute('aria-label', `${post.title}，${postMeta(post)}，打开文章`);
    button.append(el('span', String(index + 1).padStart(2, '0'), 'post-number'));
    const text = el('span', undefined, 'post-copy');
    text.append(el('span', post.title, 'post-title'), el('small', postMeta(post), 'post-meta'));
    button.append(text, el('span', '↗', 'post-mark'));
    button.addEventListener('click', () => openPost(post));
    return button;
  }

  function renderList(version) {
    if (!isCurrentList(version)) return;
    const title = el('h1', "Aries's Blog");
    title.id = 'reader-title';
    title.tabIndex = -1;
    const header = el('header', undefined, 'folio-index-head');
    header.append(el('p', '', 'folio-kicker'), title);
    const list = el('div', undefined, 'folio-index');

    const lastPost = lastSaved && posts.find(post => post.id === lastSaved.postId);
    if (lastPost) {
      const resume = el('button', undefined, 'folio-resume');
      resume.type = 'button';
      resume.setAttribute('aria-label', `续读《${lastPost.title}》，从上次阅读位置继续`);
      resume.append(el('span', '续读', 'resume-label'));
      const copy = el('span', undefined, 'resume-copy');
      copy.append(el('span', lastPost.title, 'resume-title'), el('small', postMeta(lastPost), 'resume-meta'));
      resume.append(copy, el('span', '', 'resume-fold'));
      resume.addEventListener('click', () => openPost(lastPost, true));
      list.append(resume);
    }

    posts.forEach((post, index) => list.append(makePostEntry(post, index)));
    content.replaceChildren(header, list);
    content.scrollTop = 0;
    title.focus({ preventScroll: true });
  }

  function renderListError(version) {
    if (!isCurrentList(version)) return;
    const title = el('h1', '文章暂时未能载入');
    title.id = 'reader-title';
    title.tabIndex = -1;
    const message = el('p', '连接恢复后可以再试一次。', 'reader-error-note');
    const retry = el('button', '重试', 'folio-retry');
    retry.type = 'button';
    retry.addEventListener('click', () => {
      postsRequest = null;
      loadList(viewVersion);
    });
    content.replaceChildren(el('p', '', 'folio-kicker'), title, message, retry);
  }

  async function loadList(version) {
    try {
      await getPosts();
      renderList(version);
    } catch {
      renderListError(version);
    }
  }

  function prepareList() {
    if (mode === 'list' && dialog.open) return;
    flushPostProgress();
    if (mode === 'post') currentPost = null;
    mode = 'list';
    back.hidden = true;
    const version = ++viewVersion;
    showListShell();
    void loadList(version);
  }

  const folio = createFolio({
    dialog,
    trigger,
    onChange: open => {
      if (!open) {
        flushPostProgress();
        if (mode === 'post') currentPost = null;
        mode = 'closed';
        viewVersion++;
      }
      onChange(open);
    },
    onPullStart: prepareList,
  });

  function list(options={}) {
    const entry=options.entry||'index';dialog.dataset.entry=entry;
    prepareList();
    folio.open({instant:entry==='sand'||entry==='city'});
    if((entry==='sand'||entry==='city')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      dialog.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.23,1,.32,1)'});
    }
  }

  function openPost(post, resume = false) {
    flushPostProgress();
    const version = ++viewVersion;
    mode = 'post';
    currentPost = post;
    back.hidden = false;

    const title = el('h1', post.title);
    title.id = 'reader-title';
    title.tabIndex = -1;
    const article = el('article', undefined, 'body');
    article.innerHTML = post.body;
    if (article.firstElementChild?.tagName === 'H1' && article.firstElementChild.textContent.trim() === post.title) {
      article.firstElementChild.remove();
    }
    article.querySelectorAll('a').forEach(link => {
      if (!link.getAttribute('href')?.startsWith('#')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });

    const original=el('a',undefined,'original-post');original.href=`https://aries727.site/post/${encodeURIComponent(post.id)}/`;original.target='_blank';original.rel='noopener';original.setAttribute('aria-label','在原博客打开这篇文章');original.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v14h14v-4M13 5h6v6M19 5 9 15"/></svg>';
    content.replaceChildren(title, el('p', postMeta(post), 'meta'), original, article);
    const scrollTop = resume && lastSaved?.postId === post.id ? lastSaved.scrollTop : 0;
    lastSaved = { postId: post.id, scrollTop };
    userScrolled = false;
    content.scrollTop = 0;
    persistProgress(0);
    title.focus({ preventScroll: true });
    if (scrollTop > 0) {
      const canRestore = () => dialog.open && mode === 'post' && viewVersion === version && currentPost === post && !userScrolled;
      requestAnimationFrame(() => {
        if (canRestore()) content.scrollTop = scrollTop;
      });
      article.querySelectorAll('img').forEach(image => image.addEventListener('load', () => {
        if (canRestore()) content.scrollTop = scrollTop;
      }, { once: true }));
    }
  }

  function about() {
    flushPostProgress();
    if (mode === 'post') currentPost = null;
    mode = 'about';
    viewVersion++;
    back.hidden = true;
    const title = el('h1', '远方来信');
    title.id = 'reader-title';
    title.tabIndex = -1;
    const body = el('div', undefined, 'credits');
    body.innerHTML = '<p>一张地图，二十五处地点，和 Aries 的文字。滚动让地图从顶部卷下，在地图上选择地点，再卷起地图看风景。地图始终展示全岛；窄屏点选地点后，再轻触预览图进入。拖动卷边也可以控制展开程度；M 展开地图，Esc 收起，P 暂停环境动态。</p><p>海岸线来自 Natural Earth 的公共领域数据，地点按真实经纬度标注。地图中的冰川为年代较早的概略范围，不代表当前精确边界。二十七张像素风景由 AI 生成，以这些地区的景观为灵感，是艺术化构图；建筑位置、瀑布形态和具体机位并非实景复原。天气是场景选择，不是实时气象。</p><p>纸面与墨色借鉴冰岛手稿、旧地图和书写传统。浅色纸面与卷轴动作是现代设计选择，不代表历史文物复原。</p><p>Hornbjarg（霍恩比亚格）场景中，直接划动鼠标可以改变局部来风，云、草坡与海鸟分层联动；点击近海崖会惊起海鸟。水面保留原画配色，以连续的轻缓运动呈现海浪；这不是逐帧流体或破浪模拟。浪花、瀑布、喷泉、蒸汽、云和冰也保留原画中的静态细节。声音未启用。</p><p><a href="docs/geography-sources.md" target="_blank" rel="noopener">原有地图数据与地点来源</a><br><a href="docs/place-sources.md" target="_blank" rel="noopener">新增十五处地点与地貌依据</a><br><a href="assets/landscapes/" target="_blank" rel="noopener">全部风景与生成提示词</a><br><a href="https://sagamap.hi.is/en/" target="_blank" rel="noopener">Icelandic Saga Map</a> · <a href="https://www.arnastofnun.is/is/flateyjarbok-gks-1005-fol" target="_blank" rel="noopener">冰岛手稿参考</a></p>';
    content.replaceChildren(title, body);
    folio.open();
  }

  content.addEventListener('scroll', savePositionSoon, { passive: true });
  content.addEventListener('wheel', () => { userScrolled = true; }, { passive: true });
  content.addEventListener('touchmove', () => { userScrolled = true; }, { passive: true });
  content.addEventListener('pointerdown', () => { userScrolled = true; });
  content.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab'].includes(event.key)) userScrolled = true;
  });
  document.querySelector('#archive')?.addEventListener('click', list);
  trigger?.addEventListener('click', list);
  document.querySelector('#map-archive')?.addEventListener('click', list);
  document.querySelector('#about')?.addEventListener('click', about);
  back?.addEventListener('click', list);
  document.querySelector('#close')?.addEventListener('click', () => folio.close());

  return { dialog, list, about, close: folio.close, measure: folio.measure };
}
