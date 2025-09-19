// ==UserScript==
// @name         E-Hentai 实用增强：回顶/到底 + [ ] 翻页 + 自动主题切换
// @name:en      E-Hentai Tweaks: Scroll Buttons + [ ] Paging + Auto Theme Switching
// @namespace    https://greasyfork.org/users/1508871-vesper233
// @version      4.3
// @description  悬浮回顶/到底；全站 [ 与 ] 快捷翻页；自动主题切换
// @description:en   Scroll to Top/Bottom buttons; [ and ] for Prev/Next page; Auto Theme Switching
// @author       Vesper233
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @match        *://*.e-hentai.org/*
// @match        *://upld.e-hentai.org/*
// @match        *://upload.e-hentai.org/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* =========================
   *    偏好：跨子域同步
   * ========================= */
  const EH_DOMAIN =
    location.hostname.endsWith('.e-hentai.org') ? '.e-hentai.org' :
    location.hostname === 'e-hentai.org'         ? '.e-hentai.org' :
    location.hostname === 'exhentai.org'         ? 'exhentai.org'  :
    null;

  const LS_KEY = 'eh-dark-mode-enabled';
  const CK_KEY = 'eh_dark';
  const MODE_KEY = 'eh-dark-mode-pref';
  const MODE_AUTO = 'auto';
  const MODE_DARK = 'dark';
  const MODE_LIGHT = 'light';
  const MODE_SEQUENCE = [MODE_AUTO, MODE_DARK, MODE_LIGHT];
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const LIGHT_BG = '#E2E0D2';
  const LIGHT_TEXT = '#1f1f1f';
  const DARK_BG = '#34353A';
  const DARK_TEXT = '#f1f1f1';
  let currentMode;
  let systemListenerAttached = false;
  let darkToggleBtn;

  const readCookie = (k) =>
    document.cookie.split('; ').find(s => s.startsWith(k + '='))?.split('=')[1];

  const writeCookie = (k, v, days = 365, domain = EH_DOMAIN) => {
    const d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = `${k}=${v}; expires=${d.toUTCString()}; path=/` + (domain ? `; domain=${domain}` : '');
  };

  const applyDark = (on) => document.documentElement.classList.toggle('eh-dark', !!on);

  const setPref = (on) => {
    localStorage.setItem(LS_KEY, on ? '1' : '0');
    // 只能在 *.e-hentai.org 同步 cookie；exhentai 独立域名用本地存储
    if (EH_DOMAIN && EH_DOMAIN.includes('e-hentai.org')) writeCookie(CK_KEY, on ? '1' : '0');
  };

  const getPref = () => {
    const ls = localStorage.getItem(LS_KEY);
    if (ls !== null) return ls === '1';
    const ck = (EH_DOMAIN && EH_DOMAIN.includes('e-hentai.org')) ? readCookie(CK_KEY) : null;
    if (ck !== undefined && ck !== null) return ck === '1';
    return null;
  };

  const resolveSystemDark = () => mediaQuery ? mediaQuery.matches : true;

  const resolveEffectiveMode = (mode) => {
    if (mode === MODE_AUTO) return resolveSystemDark() ? MODE_DARK : MODE_LIGHT;
    return mode === MODE_LIGHT ? MODE_LIGHT : MODE_DARK;
  };

  const updateSystemListener = () => {
    if (!mediaQuery) return;
    const handler = (event) => {
      if (currentMode === MODE_AUTO) applyMode(MODE_AUTO, { persist: false });
    };
    if (currentMode === MODE_AUTO && !systemListenerAttached) {
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handler);
      else mediaQuery.addListener(handler);
      systemListenerAttached = handler;
    }
    if (currentMode !== MODE_AUTO && systemListenerAttached) {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', systemListenerAttached);
      else mediaQuery.removeListener(systemListenerAttached);
      systemListenerAttached = false;
    }
  };

  const updateToggleVisual = (mode, effective) => {
    if (!darkToggleBtn) return;
    darkToggleBtn.style.border = 'none';
    let shadow = '0 0 0 1px rgba(0,0,0,0.45)';
    if (mode === MODE_AUTO) {
      darkToggleBtn.style.background = `linear-gradient(90deg, ${LIGHT_BG} 0 50%, ${DARK_BG} 50% 100%)`;
      darkToggleBtn.style.color = DARK_TEXT;
      shadow = '0 0 0 1px rgba(0,0,0,0.35)';
      darkToggleBtn.style.textShadow = '0 0 4px rgba(0,0,0,0.35)';
    } else if (mode === MODE_LIGHT) {
      darkToggleBtn.style.background = LIGHT_BG;
      darkToggleBtn.style.color = LIGHT_TEXT;
      darkToggleBtn.style.textShadow = 'none';
      shadow = '0 0 0 1px rgba(0,0,0,0.25)';
    } else {
      darkToggleBtn.style.background = DARK_BG;
      darkToggleBtn.style.color = DARK_TEXT;
      darkToggleBtn.style.textShadow = 'none';
      shadow = '0 0 0 1px rgba(255,255,255,0.25)';
    }
    darkToggleBtn.style.boxShadow = shadow;
  };

  const updateToggleTooltip = (mode, effective) => {
    if (!darkToggleBtn) return;
    const labels = {
      [MODE_AUTO]: '系统偏好',
      [MODE_DARK]: '固定暗色',
      [MODE_LIGHT]: '固定亮色'
    };
    const effectiveLabel = effective === MODE_DARK ? '暗色' : '亮色';
    darkToggleBtn.title = `当前：${labels[mode]} (实际：${effectiveLabel})\n点击切换模式`;
  };

  const applyMode = (mode, { persist = true } = {}) => {
    currentMode = mode;
    const effective = resolveEffectiveMode(mode);
    const isDark = effective === MODE_DARK;
    applyDark(isDark);
    setPref(isDark);
    if (persist) localStorage.setItem(MODE_KEY, mode);
    updateSystemListener();
    updateToggleTooltip(mode, effective);
    updateToggleVisual(mode, effective);
    fixMonsterBox();
    fixFavoritesUI();
  };

  const readInitialMode = () => {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === MODE_AUTO || stored === MODE_DARK || stored === MODE_LIGHT) return stored;
    return MODE_AUTO;
  };

  const initDarkPref = () => {
    const initialMode = readInitialMode();
    applyMode(initialMode, { persist: true });
  };

  /* =========================
   *         样式
   * ========================= */
  const styles = `
    /* —— 悬浮按钮 —— */
    .eh-scroll-btn{
      position:fixed; width:45px; height:45px;
      background-color:#3e3e3e; color:#dcdcdc;
      border:none; border-radius:50%;
      cursor:pointer; display:none; justify-content:center; align-items:center;
      font-size:20px; font-weight:bold; z-index:9999; opacity:.85;
      transition:opacity .2s ease, background-color .2s ease, transform .1s ease;
      user-select:none; backdrop-filter:saturate(120%) blur(2px);
      box-shadow:0 0 0 1px rgba(255,255,255,0.08);
    }
    .eh-scroll-btn:hover{ opacity:1; background-color:#575757; transform:translateY(-1px); }
    #eh-to-top-btn{ right:25px; bottom:130px; }
    #eh-to-bottom-btn{ right:25px; bottom:75px; }
    #eh-dark-toggle-btn{ right:25px; top:20px; display:flex !important; font-size:18px; background-color:#2f2f2f; }

    /* —— 暗色主题变量 —— */
    html.eh-dark{
      --eh-fg:#f1f1f1; --eh-bg:#34353b; --eh-panel:#4f535b;
      --eh-panel-2:#3c414b; --eh-panel-3:#43464e;
      --eh-border:#000000; --eh-link:#dddddd; --eh-link-hover:#eeeeee; --eh-muted:#8a8a8a;
    }
    html.eh-dark body{ color:var(--eh-fg) !important; background:var(--eh-bg) !important; }
    html.eh-dark a{ color:var(--eh-link) !important; } html.eh-dark a:hover{ color:var(--eh-link-hover) !important; }
    html.eh-dark input, html.eh-dark select, html.eh-dark option, html.eh-dark optgroup, html.eh-dark textarea{
      color:var(--eh-fg) !important; background-color:var(--eh-bg) !important; border:2px solid #8d8d8d !important;
    }
    html.eh-dark ::placeholder{ color:var(--eh-muted) !important; -webkit-text-fill-color:var(--eh-muted) !important; }

    /* ===== 通用容器 / 表格 / 列表 ===== */
    html.eh-dark .stuffbox, html.eh-dark .ido, html.eh-dark .gm, html.eh-dark #gdt,
    html.eh-dark .gt, html.eh-dark .gtl, html.eh-dark .gtw{
      background:var(--eh-panel) !important; border:1px solid var(--eh-border) !important;
    }
    html.eh-dark table.itg{ border:2px ridge #3c3c3c !important; }
    html.eh-dark table.itg > tbody > tr:nth-child(2n+1){ background:#363940 !important; }
    html.eh-dark table.itg > tbody > tr:nth-child(2n+2){ background:#3c414b !important; }
    html.eh-dark div.itg.gld,
    html.eh-dark .itg.gld{
      border-left:none !important;
      background:var(--eh-panel) !important;
    }
    html.eh-dark table.mt{ border:1px solid var(--eh-border) !important; background:#40454b !important; }
    html.eh-dark table.mt > tbody > tr:nth-child(2n+1){ background:#363940 !important; }
    html.eh-dark table.mt > tbody > tr:nth-child(2n+2){ background:#3c414b !important; }
    html.eh-dark td.itd{ border-right:1px solid #6f6f6f4d !important; }
    html.eh-dark img.th, html.eh-dark .glthumb{ border:1px solid var(--eh-border) !important; }

    /* ===== 分页条 ===== */
    html.eh-dark table.ptt td, html.eh-dark table.ptb td{
      background:var(--eh-bg) !important; border:1px solid var(--eh-border) !important; color:var(--eh-fg) !important;
    }
    html.eh-dark td.ptds{ background:var(--eh-panel-3) !important; color:#000 !important; }

    /* ===== 首页/搜索区 ===== */
    html.eh-dark #searchbox, html.eh-dark .searchnav, html.eh-dark .searchstuff, html.eh-dark .searchform, html.eh-dark .searchpane{
      background:var(--eh-panel) !important; border:1px solid var(--eh-border) !important; color:var(--eh-fg) !important;
    }
    html.eh-dark hr{ border-color:var(--eh-border) !important; background:var(--eh-border) !important; }
    html.eh-dark .glname, html.eh-dark .glname a{ color:var(--eh-fg) !important; }
    html.eh-dark .gl1t{ border:none !important; }
    html.eh-dark .gl1t:nth-child(2n+1){ background:#363940 !important; }
    html.eh-dark .gl1t:nth-child(2n+2){ background:#3c414b !important; }
    html.eh-dark .gl3t,
    html.eh-dark .gl4t,
    html.eh-dark .gl5t,
    html.eh-dark .gl6t,
    html.eh-dark .gl7t,
    html.eh-dark .glthumb > div[style*="position:absolute"],
    html.eh-dark .glthumb > div.gl3t{
      background:var(--eh-bg) !important;
      color:var(--eh-fg) !important;
      border:1px solid var(--eh-border) !important;
      box-shadow:none !important;
    }
    html.eh-dark .lc > span,
    html.eh-dark .lr > span{
      background-color:var(--eh-bg) !important;
      border:2px solid #8d8d8d !important;
    }
    html.eh-dark .lc > span:after{
      border:solid var(--eh-fg) !important;
    }
    html.eh-dark .lr > span:after{
      background:var(--eh-fg) !important;
    }
    html.eh-dark .lc:hover input:enabled ~ span,
    html.eh-dark .lr:hover input:enabled ~ span,
    html.eh-dark .lc input:enabled:focus ~ span,
    html.eh-dark .lr input:enabled:focus ~ span{
      background-color:var(--eh-panel-3) !important;
      border-color:#aeaeae !important;
    }
    html.eh-dark .lc input:disabled ~ span,
    html.eh-dark .lr input:disabled ~ span{
      border-color:#5c5c5c !important;
      background-color:#2c2d32 !important;
    }

    /* ===== 画廊详情/缩略图区/信息条 ===== */
    html.eh-dark #gmid, html.eh-dark #gd2, html.eh-dark #gdt, html.eh-dark .sni{ background:var(--eh-panel) !important; }
    html.eh-dark #gd1 div, html.eh-dark #gdt img{ border:1px solid var(--eh-border) !important; }
    html.eh-dark h1#gj{ color:#b8b8b8 !important; border-bottom:1px solid var(--eh-border) !important; }

    /* ===== 评论区 ===== */
    html.eh-dark #cdiv{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
    }
    html.eh-dark #cdiv .c1{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
      border:none !important;
    }
    html.eh-dark #cdiv .c2{
      background:var(--eh-bg) !important;
      color:var(--eh-fg) !important;
      border:none !important;
      padding:6px 14px !important;
      border-radius:4px !important;
    }
    html.eh-dark #cdiv .c3,
    html.eh-dark #cdiv .c4,
    html.eh-dark #cdiv .c5{
      background:transparent !important;
      color:var(--eh-fg) !important;
    }
    html.eh-dark #cdiv .c5 span{ color:var(--eh-fg) !important; }
    html.eh-dark #cdiv .c6,
    html.eh-dark #cdiv .c7{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
    }
    html.eh-dark #postnewcomment,
    html.eh-dark #formdiv,
    html.eh-dark #formdiv textarea,
    html.eh-dark #formdiv input[type="submit"]{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
    }
    /* ===== torrents（gallerytorrents.php & torrents.php）===== */
    html.eh-dark table#ett, html.eh-dark div#etd{ background:#43464e !important; border:1px solid #34353b !important; }
    html.eh-dark #torrentinfo > div + div{ border-top-color:var(--eh-border) !important; }
    html.eh-dark .torrent, html.eh-dark .tl, html.eh-dark .tr{ background:var(--eh-panel) !important; }

    /* ===== 统计 stats.php（含 gid 子页）===== */
    html.eh-dark .stuffbox table{ background:var(--eh-panel) !important; border-color:var(--eh-border) !important; }
    html.eh-dark tr > td.stdk, html.eh-dark tr > td.stdv{ border-color:var(--eh-border) !important; }
    html.eh-dark body.stats table th{ border-bottom-color:var(--eh-border) !important; }

    /* ===== 上传管理（manage / managefolders / managegallery / act=new）===== */
    html.eh-dark td.l{ border-bottom:1px solid #f1f1f1 !important; border-right:1px dashed #f1f1f1 !important; }
    html.eh-dark td.r{ border-bottom:1px solid #f1f1f1 !important; }
    html.eh-dark td#d{ border-right:1px dashed #f1f1f1 !important; }
    html.eh-dark [id^="cell_"]{ background:#5f636b !important; border:1px solid #34353b !important; }
    html.eh-dark .gb, html.eh-dark .gl, html.eh-dark .gf{ background:var(--eh-panel) !important; }
    html.eh-dark .m_btn, html.eh-dark .uf_btn{ background:var(--eh-bg) !important; color:var(--eh-fg) !important; border:1px solid #8d8d8d !important; }
    html.eh-dark tr.gtr td.l,
    html.eh-dark tr.gtr td.r{ border-right:none !important; }

    /* ===== 归档/下载（archiver.php）===== */
    html.eh-dark #hathdl_form + table td{ border-color:var(--eh-fg) !important; }
    html.eh-dark div#db{ border:1px solid var(--eh-border) !important; background:var(--eh-panel) !important; }

    /* ===== 日常事件 / 遭遇提示面板 ===== */
    html.eh-dark #eventpane{
      background:var(--eh-panel) !important;
      border:1px solid var(--eh-border) !important;
      color:var(--eh-fg) !important;
    }
    html.eh-dark #eventpane p,
    html.eh-dark #eventpane strong{
      color:var(--eh-fg) !important;
    }

    /* ====== 遭遇怪物（Monster Encounter）===== */
    html.eh-dark .eh-dark-monbox,
    html.eh-dark .eh-dark-moonbox{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
      border:none !important;
      box-shadow:none !important;
    }
    html.eh-dark .eh-dark-monbox a{ color:var(--eh-link) !important; text-decoration:underline; }
    html.eh-dark #monsterpane,
    html.eh-dark .monster,
    html.eh-dark .monsterbox { background:var(--eh-panel) !important; color:var(--eh-fg) !important; border:1px solid var(--eh-border) !important; }

    /* ====== 收藏页 favorites.php：分类 pill / Show All ====== */
    /* 直接适配原生结构：div.fp / div.fp.fps */
    html.eh-dark .fp{
      background:transparent !important;
      color:var(--eh-fg) !important;
      border:none !important;
      border-radius:16px !important;
    }
    html.eh-dark .fp:hover{
      background:var(--eh-panel-3) !important;
    }
    html.eh-dark .fps{
      background:transparent !important;
      border:none !important;
      font-weight:600 !important;
    }
    /* 兼容你此前的自定义类（两套选择器都可用） */
    html.eh-dark .eh-dark-favpill{
      background:transparent !important;
      color:var(--eh-fg) !important;
      border:none !important;
      box-shadow:none !important;
      border-radius:16px !important;
    }
    html.eh-dark .eh-dark-favpill a{ color:var(--eh-fg) !important; }
    html.eh-dark .eh-dark-favpill[disabled],
    html.eh-dark .eh-dark-favpill.disabled{
      color:var(--eh-muted) !important; opacity:.65 !important;
    }
  `;

  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  /* =========================
   *   悬浮：顶 / 底 / 暗色开关
   * ========================= */
  const makeBtn = (id, text, title, pos) => {
    const el = document.createElement('div');
    el.id = id; el.className = 'eh-scroll-btn';
    el.textContent = text; el.title = title;
    Object.assign(el.style, pos || {});
    document.body.appendChild(el);
    return el;
  };
  const toTopBtn = makeBtn('eh-to-top-btn', '▲', '回到顶部');
  const toBottomBtn = makeBtn('eh-to-bottom-btn', '▼', '直达底部');
  darkToggleBtn = makeBtn('eh-dark-toggle-btn', '🌓', '主题模式：系统/暗色/亮色（快捷键：d）', {display:'flex'});

  toTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));

  const onScroll = () => {
    const h = document.documentElement.scrollHeight;
    const ch = document.documentElement.clientHeight;
    const t = window.scrollY || document.documentElement.scrollTop;
    toTopBtn.style.display = t > 200 ? 'flex' : 'none';
    toBottomBtn.style.display = (t + ch >= h - 5) ? 'none' : 'flex';
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* =========================
   *     暗色开关（仅小写 d）
   * ========================= */
  const cycleMode = () => {
    const idx = MODE_SEQUENCE.indexOf(currentMode);
    const nextMode = MODE_SEQUENCE[(idx + 1) % MODE_SEQUENCE.length];
    applyMode(nextMode);
    fixMonsterBox();
    fixFavoritesUI();
  };
  darkToggleBtn.addEventListener('click', cycleMode);
  initDarkPref();
  onScroll();

  /* =========================
   *   Monster Encounter 适配
   * ========================= */
  const MONSTER_RE = /You have encountered a monster!/i;

  function markAsMonsterBox(el){
    el.classList.add('eh-dark-monbox');
    const parentBox = el.closest('div, table, td, center, p');
    if (parentBox) parentBox.classList.add('eh-dark-monbox');
  }

  function scanMonsterBox(root=document){
    if (!document.documentElement.classList.contains('eh-dark')) return;
    const nodes = root.querySelectorAll('div, td, p, center');
    for (const n of nodes){
      const t = (n.textContent || '').trim();
      if (!t) continue;
      if (MONSTER_RE.test(t)){
        markAsMonsterBox(n);
        const link = n.querySelector('a[href*="hentaiverse"]') || n.nextElementSibling?.querySelector?.('a[href*="hentaiverse"]');
        if (link) markAsMonsterBox(link.closest('div, td, p, center') || n);
        break;
      }
    }
  }

  function fixMonsterBox(){ scanMonsterBox(); }

  document.addEventListener('DOMContentLoaded', fixMonsterBox);
  window.addEventListener('load', fixMonsterBox);
  const moMonster = new MutationObserver((muts)=>{
    for (const m of muts){ if (m.addedNodes?.length) fixMonsterBox(); }
  });
  moMonster.observe(document.documentElement, { childList:true, subtree:true });

  /* =========================
   *   Favorites 页面适配：分类 pill / Show All
   * ========================= */
  function fixFavoritesUI(root = document){
    // 未开启暗色或不在收藏页，直接返回
    if (!document.documentElement.classList.contains('eh-dark')) return;
    if (!/\/favorites\.php(?:\?|$)/.test(location.pathname + location.search)) return;

    // 1) 直接命中原生分类 pill：<div class="fp"> 和 <div class="fp fps">
    const pills = root.querySelectorAll('div.fp');
    pills.forEach(el => el.classList.add('eh-dark-favpill')); // 兼容自定义样式选择器

    // 2) 兼容极少数旧布局里 “Show All Favorites” 是单独 <a> 的情况
    const showAllCandidates = root.querySelectorAll('a[href$="favorites.php"]:not([href*="favcat="])');
    showAllCandidates.forEach(a => {
      const box = a.closest('div, span, td, button, a') || a;
      box.classList.add('eh-dark-favpill');
    });
  }

  document.addEventListener('DOMContentLoaded', fixFavoritesUI);
  window.addEventListener('load', fixFavoritesUI);
  const moFav = new MutationObserver((muts)=>{
    for (const m of muts){ if (m.addedNodes?.length) fixFavoritesUI(m.target instanceof Document ? m.target : document); }
  });
  moFav.observe(document.documentElement, { childList:true, subtree:true });

  /* =========================
   *     [ / ] 快捷键翻页
   * ========================= */
  const isTyping = (el) =>
    !!el && (['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.isContentEditable);

  const triggerArrow = (key) => {
    const keyCode = key === 'ArrowLeft' ? 37 : 39;
    const init = {
      key,
      code: key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    };
    const down = new KeyboardEvent('keydown', init);
    document.dispatchEvent(down);
    window.dispatchEvent(down);
    const up = new KeyboardEvent('keyup', init);
    document.dispatchEvent(up);
    window.dispatchEvent(up);
  };

  const KEY_HANDLER_FLAG = '__ehDarkHandled';

  const NEXT_STRICT_TEXT = /(下一页|下一頁|下一|下页|下頁|后页|後頁|\bnext\b|\bnext\s+page\b|\bforward\b)/i;
  const PREV_STRICT_TEXT = /(上一页|上一頁|上一|上页|上頁|前页|前頁|\bprev\b|\bprevious\b|\bprev\s+page\b|\bback\b)/i;
  const NEXT_LOOSE_TEXT = /(下一|下页|下頁|后页|後頁|next|forward|之后|往后|往右|下一个|下一部|下一章|右|下)/i;
  const PREV_LOOSE_TEXT = /(上一|上页|上頁|前页|前頁|prev|previous|back|返回|往前|往左|上一个|上一部|上一章|左|上)/i;
  const NEXT_EDGE_REGEX = /(>\s*$|^\s*>|＞\s*$|^\s*＞)/;
  const PREV_EDGE_REGEX = /(<\s*$|^\s*<|＜\s*$|^\s*＜)/;
  const NEXT_SYMBOL_REGEX = /^(?:[>»›≫→▶⯈⯊➔➜➤➡⮕⮞⮡⮥⯈»]+)$/;
  const PREV_SYMBOL_REGEX = /^(?:[<«‹≪←◀⯇⯉⬅⮜⮝⮠⮡⯇«]+)$/;

  const NEXT_ATTR_STRICT_HINTS = ['next'];
  const PREV_ATTR_STRICT_HINTS = ['prev'];
  const NEXT_ATTR_LOOSE_HINTS = ['next', 'forward', 'right', 'after', '下一', '下页', '下頁', '后页', '後頁', '下一个', '下一個'];
  const PREV_ATTR_LOOSE_HINTS = ['prev', 'previous', 'back', 'left', '上一', '上页', '上頁', '前页', '前頁', '上一個', '上一部'];

  const collectNavTokens = (el) => {
    const tokens = new Set();
    const add = (val) => {
      if (!val || typeof val !== 'string') return;
      const lower = val.toLowerCase();
      if (!lower) return;
      tokens.add(lower);
      lower.split(/[\s>/<_-]+/).forEach((part) => {
        if (part && part !== lower) tokens.add(part);
      });
    };
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 3) {
      add(node.id);
      const className = node.className;
      if (typeof className === 'string') add(className);
      else if (className && typeof className.baseVal === 'string') add(className.baseVal);
      add(node.getAttribute?.('rel'));
      add(node.getAttribute?.('aria-label'));
      add(node.getAttribute?.('title'));
      add(node.getAttribute?.('name'));
      add(node.getAttribute?.('role'));
      add(node.getAttribute?.('data-action'));
      add(node.getAttribute?.('data-nav'));
      add(node.getAttribute?.('data-eh-nav'));
      add(node.getAttribute?.('data-direction'));
      add(node.getAttribute?.('data-key'));
      add(node.getAttribute?.('accesskey'));
      if (node.tagName === 'A' || node.tagName === 'AREA') add(node.getAttribute?.('href'));
      if (node.tagName === 'BUTTON' || node.tagName === 'INPUT') add(node.getAttribute?.('value'));
      depth += 1;
      node = node.parentElement;
    }
    return Array.from(tokens);
  };

  const hasAttrHint = (el, wantNext, strict) => {
    const tokens = collectNavTokens(el);
    if (!tokens.length) return false;
    const hints = wantNext
      ? (strict ? NEXT_ATTR_STRICT_HINTS : NEXT_ATTR_LOOSE_HINTS)
      : (strict ? PREV_ATTR_STRICT_HINTS : PREV_ATTR_LOOSE_HINTS);
    return tokens.some((token) => {
      if (!wantNext && (token.startsWith('previe') || token.startsWith('prevent'))) return false;
      return hints.some((hint) => token.includes(hint));
    });
  };

  const matchesNavText = (text, wantNext, strict) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (strict) return (wantNext ? NEXT_STRICT_TEXT : PREV_STRICT_TEXT).test(trimmed);
    if ((wantNext ? NEXT_STRICT_TEXT : PREV_STRICT_TEXT).test(trimmed)) return true;
    if ((wantNext ? NEXT_LOOSE_TEXT : PREV_LOOSE_TEXT).test(trimmed)) return true;
    if ((wantNext ? NEXT_EDGE_REGEX : PREV_EDGE_REGEX).test(trimmed)) return true;
    const condensed = trimmed.replace(/\s+/g, '');
    if ((wantNext ? NEXT_SYMBOL_REGEX : PREV_SYMBOL_REGEX).test(condensed)) return true;
    return false;
  };

  const elementMatchesDirection = (el, wantNext, strict) => {
    if (!el) return false;
    if (matchesNavText(el.textContent || '', wantNext, strict)) return true;
    const aria = el.getAttribute?.('aria-label');
    if (matchesNavText(aria || '', wantNext, strict)) return true;
    const title = el.getAttribute?.('title');
    if (matchesNavText(title || '', wantNext, strict)) return true;
    if (hasAttrHint(el, wantNext, strict)) return true;
    return false;
  };

  const uniqueElements = (elements) => {
    const seen = new Set();
    const result = [];
    for (const el of elements) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      result.push(el);
    }
    return result;
  };

  const gatherClickableDescendants = (root) =>
    Array.from(
      root.querySelectorAll?.(
        'a[href], area[href], button, input[type="button"], input[type="submit"], [onclick], [role="button"]'
      ) || []
    );

  const elementIsClickable = (el) =>
    !!el &&
    (el.matches?.('a[href], area[href], button, input[type="button"], input[type="submit"]') ||
      !!el.getAttribute?.('onclick') ||
      el.getAttribute?.('role') === 'button');

  const followNavElement = (el) => {
    if (!el) return false;

    // If the element itself is a link-like node, try to act on it directly.
    if (el.matches?.('td[onclick*="document.location"]')) {
      el.click();
      return true;
    }

    if (el.matches?.('a[href]')) {
      const href = el.getAttribute('href');
      if (!href) return false;
      const onclickAttr = el.getAttribute('onclick');
      if (onclickAttr && /return\s+false/i.test(onclickAttr)) {
        location.href = href;
        return true;
      }
      el.click();
      return true;
    }

    // Some wrappers (like #dprev/#dnext TD/Div) contain an anchor child.
    const anchorChild = el.querySelector?.('a[href]');
    if (anchorChild) return followNavElement(anchorChild);

    const href = el.getAttribute?.('href');
    if (href) {
      location.href = href;
      return true;
    }

    return false;
  };

  const gotoPrevNextPage = (isNext, { imageMode = false } = {}) => {
    const wantNext = isNext;
    const baseSelectors = [
      'table.ptt',
      'table.ptb',
      '.searchnav',
      '#dprev',
      '#dnext',
      '.dprev',
      '.dnext',
      '#prev',
      '#next',
      '#aprev',
      '#anext',
      'a[accesskey="a"]',
      'a[accesskey="d"]',
      '[class~="prev"]',
      '[class~="next"]'
    ];
    if (imageMode) baseSelectors.push('#i3 > a[href]');
    const pagers = uniqueElements(
      baseSelectors.flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    );

    const tried = new Set();
    const tryFollow = (candidates) => {
      for (const el of candidates) {
        if (!el || tried.has(el)) continue;
        tried.add(el);
        if (followNavElement(el)) return true;
      }
      return false;
    };

    for (const pager of pagers) {
      const links = [];
      if (elementIsClickable(pager)) links.push(pager);
      links.push(...gatherClickableDescendants(pager));
      if (!links.length) continue;

      const strongMatches = links.filter((el) => elementMatchesDirection(el, wantNext, true));
      if (strongMatches.length && tryFollow(strongMatches)) return true;

      const alt = pager.querySelector?.(wantNext ? '#unext' : '#uprev');
      if (alt && tryFollow([alt])) return true;

      const looseMatches = links.filter((el) => elementMatchesDirection(el, wantNext, false));
      if (looseMatches.length && tryFollow(looseMatches)) return true;
    }

    const candidateSet = new Set();
    const candidateSelectors = [
      'a[href]',
      'area[href]',
      '[onclick]',
      '[data-action]',
      '[data-nav]',
      '[data-eh-nav]',
      '[aria-label]',
      '[title]',
      '[role="button"]',
      '[id*="prev" i]',
      '[id*="next" i]',
      '[class*="prev" i]',
      '[class*="next" i]'
    ];
    candidateSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => candidateSet.add(el));
    });

    const allCandidates = uniqueElements(Array.from(candidateSet));

    const attrMatches = allCandidates.filter((el) => elementMatchesDirection(el, wantNext, true));
    if (attrMatches.length && tryFollow(attrMatches)) return true;

    const textMatches = allCandidates.filter((el) => elementMatchesDirection(el, wantNext, false));
    if (textMatches.length && tryFollow(textMatches)) return true;

    if (imageMode && wantNext) {
      const imageLink = document.querySelector('#i3 > a[href]');
      if (imageLink && tryFollow([imageLink])) return true;
    }

    return false;
  };

  const handleKeydown = (e) => {
    if (e[KEY_HANDLER_FLAG]) return;
    e[KEY_HANDLER_FLAG] = true;

    if (isTyping(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const keyLower = (e.key || '').toLowerCase();

    if (!e.shiftKey && keyLower === 'd') {
      e.preventDefault();
      cycleMode();
      return;
    }

    const isBracketLeft = e.key === '[' || e.code === 'BracketLeft';
    const isBracketRight = e.key === ']' || e.code === 'BracketRight';

    if ((isBracketLeft || isBracketRight) && !e.shiftKey) {
      e.preventDefault();
      const isNext = isBracketRight;
      const imageMode = /\/s\//.test(location.pathname) || /\/mpv\//.test(location.pathname);
      const ok = gotoPrevNextPage(isNext, { imageMode });
      if (!ok) triggerArrow(isNext ? 'ArrowRight' : 'ArrowLeft');
    }
  };

  const addKeyListener = (target, options) => {
    try {
      target.addEventListener('keydown', handleKeydown, options);
    } catch (err) {
      const useCapture = !!(options && typeof options === 'object' && options.capture);
      target.addEventListener('keydown', handleKeydown, useCapture);
    }
  };

  addKeyListener(window, { capture: true, passive: false });
  addKeyListener(window, { passive: false });
  addKeyListener(document, { capture: true, passive: false });

})();

