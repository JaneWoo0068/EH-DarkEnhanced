// ==UserScript==
// @name         E-Hentai 实用增强：回顶/到底 + [ ] 翻页 + 全站手动暗色（含Monster/上传/种子/统计/收藏页）
// @name:en      E-Hentai Tweaks: Scroll Buttons + [ ] Paging + Full Manual Dark (Monster/Upload/Torrents/Stats/Favorites)
// @namespace    https://greasyfork.org/users/your-name
// @version      2.6
// @description  悬浮回顶/到底；全站 [ 与 ] 快捷翻页；手动暗色（持久化 & 跨 *.e-hentai.org 同步）。覆盖首页/列表/详情/图片/评论/torrents/stats/上传管理/收藏页，并修复“遭遇怪物”提示在暗色下不可读的问题。仅小写 d 切换暗色。
// @author       Vesper
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

  const initDarkPref = () => {
    let pref = getPref();
    if (pref === null) { // 默认开启暗色
      pref = true;
      setPref(pref);
    }
    applyDark(pref);
  };

  /* =========================
   *         样式
   * ========================= */
  const styles = `
    /* —— 悬浮按钮 —— */
    .eh-scroll-btn{
      position:fixed; width:45px; height:45px;
      background-color:#3e3e3e; color:#dcdcdc;
      border:1px solid #5a5a5a; border-radius:50%;
      cursor:pointer; display:none; justify-content:center; align-items:center;
      font-size:20px; font-weight:bold; z-index:9999; opacity:.85;
      transition:opacity .2s ease, background-color .2s ease, transform .1s ease;
      user-select:none; backdrop-filter:saturate(120%) blur(2px);
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
    html.eh-dark .gl1t{ border-right:1px solid #6f6f6f4d !important; border-bottom:1px solid #6f6f6f4d !important; }
    html.eh-dark .gl1t:nth-child(2n+1){ background:#363940 !important; }
    html.eh-dark .gl1t:nth-child(2n+2){ background:#3c414b !important; }

    /* ===== 画廊详情/缩略图区/信息条 ===== */
    html.eh-dark #gmid, html.eh-dark #gd2, html.eh-dark #gdt, html.eh-dark .sni{ background:var(--eh-panel) !important; }
    html.eh-dark #gd1 div, html.eh-dark #gdt img{ border:1px solid var(--eh-border) !important; }
    html.eh-dark h1#gj{ color:#b8b8b8 !important; border-bottom:1px solid var(--eh-border) !important; }

    /* ===== 评论区 ===== */
    html.eh-dark #cdiv{ background:var(--eh-panel) !important; border:1px solid var(--eh-border) !important; color:var(--eh-fg) !important; }
    html.eh-dark #cdiv .c1{ background:var(--eh-panel-2) !important; border:1px solid var(--eh-border) !important; }
    html.eh-dark #cdiv .c3, html.eh-dark #cdiv .c3 a{ background:var(--eh-panel-3) !important; color:var(--eh-fg) !important; }
    html.eh-dark #cdiv .c6{ color:var(--eh-fg) !important; background:transparent !important; }
    html.eh-dark #cdiv .c7, html.eh-dark #cdiv .c7 a{ background:var(--eh-bg) !important; color:var(--eh-fg) !important; }
    html.eh-dark #newpost, html.eh-dark #newcomment, html.eh-dark #cdiv textarea{
      background:var(--eh-bg) !important; color:var(--eh-fg) !important; border-color:#8d8d8d !important;
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

    /* ===== 归档/下载（archiver.php）===== */
    html.eh-dark #hathdl_form + table td{ border-color:var(--eh-fg) !important; }
    html.eh-dark div#db{ border:1px solid var(--eh-border) !important; background:var(--eh-panel) !important; }

    /* ====== 遭遇怪物（Monster Encounter）===== */
    html.eh-dark .eh-dark-monbox{
      background:var(--eh-panel) !important;
      color:var(--eh-fg) !important;
      border:1px solid var(--eh-border) !important;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.25);
    }
    html.eh-dark .eh-dark-monbox a{ color:var(--eh-link) !important; text-decoration:underline; }
    html.eh-dark #monsterpane,
    html.eh-dark .monster,
    html.eh-dark .monsterbox { background:var(--eh-panel) !important; color:var(--eh-fg) !important; border:1px solid var(--eh-border) !important; }

    /* ====== 收藏页 favorites.php：分类 pill / Show All ====== */
    /* 直接适配原生结构：div.fp / div.fp.fps */
    html.eh-dark .fp{
      background:var(--eh-panel-2) !important;
      color:var(--eh-fg) !important;
      border:1px solid var(--eh-border) !important;
      border-radius:16px !important;
    }
    html.eh-dark .fp:hover{
      background:var(--eh-panel-3) !important;
      border-color:var(--eh-border) !important;
    }
    html.eh-dark .fps{
      background:var(--eh-panel-3) !important;
      border:1px solid var(--eh-border) !important;
      font-weight:600 !important;
    }
    /* 兼容你此前的自定义类（两套选择器都可用） */
    html.eh-dark .eh-dark-favpill{
      background:var(--eh-panel-2) !important;
      color:var(--eh-fg) !important;
      border:1px solid var(--eh-border) !important;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.18);
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
  const darkToggleBtn = makeBtn('eh-dark-toggle-btn', '🌓', '切换暗色（快捷键：d，小写）', {display:'flex'});

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
  const toggleDark = () => {
    const next = !(localStorage.getItem(LS_KEY) === '1' || readCookie(CK_KEY) === '1');
    setPref(next); applyDark(next);
    fixMonsterBox();
    fixFavoritesUI();
  };
  darkToggleBtn.addEventListener('click', toggleDark);
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
    const ev = new KeyboardEvent('keydown', {
      key,
      code: key,
      keyCode: key === 'ArrowLeft' ? 37 : 39,
      which:   key === 'ArrowLeft' ? 37 : 39,
      bubbles:true, cancelable:true
    });
    document.dispatchEvent(ev); window.dispatchEvent(ev);
  };

  const gotoPrevNextPage = (isNext) => {
    const pagers = Array.from(document.querySelectorAll('table.ptt, table.ptb, .searchnav'));
    if (!pagers.length) return false;

    const wantNext = isNext;
    const nextRegex = /(next|>>|»|>)/i;
    const prevRegex = /(prev|<<|«|<)/i;

    for (const pager of pagers) {
      const links = Array.from(pager.querySelectorAll('a[href], span[id^="u"]')); // 兼容 favorites 的导航
      if (!links.length) continue;

      const primary = links.find(a => (wantNext ? /next/i.test(a.textContent) : /prev/i.test(a.textContent)));
      if (primary && primary.tagName === 'A') { primary.click(); return true; }

      // 兼容 favorites 上方的 span#uprev/#unext（需要触发它的 href）
      if (!primary) {
        const alt = pager.querySelector(wantNext ? '#unext' : '#uprev');
        if (alt && alt.getAttribute('href')) { location.href = alt.getAttribute('href'); return true; }
      }

      const fallback = links.find(a => (wantNext ? nextRegex.test(a.textContent) : prevRegex.test(a.textContent)));
      if (fallback && fallback.tagName === 'A') { fallback.click(); return true; }
    }
    return false;
  };

  window.addEventListener('keydown', (e) => {
    if (isTyping(document.activeElement) || e.defaultPrevented) return;

    // 仅小写 d，且不带修饰键
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      toggleDark();
      return;
    }

    // [ 与 ]：兼容 e.code
    const isBracketLeft  = (e.key === '[') || (e.code === 'BracketLeft');
    const isBracketRight = (e.key === ']') || (e.code === 'BracketRight');

    if ((isBracketLeft || isBracketRight) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      const isImageView = /\/s\//.test(location.pathname) || /\/mpv\//.test(location.pathname);
      if (isImageView) {
        if (isBracketLeft) triggerArrow('ArrowLeft'); else triggerArrow('ArrowRight');
      } else {
        const ok = gotoPrevNextPage(isBracketRight);
        if (!ok) triggerArrow(isBracketRight ? 'ArrowRight' : 'ArrowLeft');
      }
    }
  }, { passive:false });

})();
