/* Guestbook — local-only adapter; replace storage adapter when backend is ready. */
(() => {
  "use strict";
  const STORAGE_KEY = "minihome_guestbook_v1";
  const LIMIT = 200;
  const MAX_ENTRIES = 100;
  const storage = {
    read() {
      try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(value) ? value.filter(x => x && typeof x.message === "string" && typeof x.createdAt === "string").slice(0, MAX_ENTRIES) : [];
      } catch { return []; }
    },
    write(entries) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); return true; }
      catch { return false; }
    }
  };
  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
  }
  function render() {
    const list = document.getElementById("guestbook-list");
    if (!list) return;
    const entries = storage.read().sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    list.replaceChildren();
    const total = document.getElementById("guestbook-total");
    if (total) total.textContent = `${entries.length} notes`;
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "guestbook-empty";
      empty.textContent = "아직 남겨진 메시지가 없어요. 첫 번째 방명록을 남겨주세요 ♡";
      list.append(empty);
      return;
    }
    for (const item of entries) {
      const card = document.createElement("article");
      card.className = "guestbook-card";
      const head = document.createElement("div");
      head.className = "guestbook-card-head";
      const name = document.createElement("strong");
      name.textContent = "♡ 익명의 방문자";
      const time = document.createElement("time");
      time.dateTime = item.createdAt;
      time.textContent = formatDate(item.createdAt);
      const body = document.createElement("p");
      body.textContent = item.message;
      head.append(name,time);
      card.append(head,body);
      list.append(card);
    }
  }
  function init() {
    const form = document.getElementById("guestbook-form");
    const textarea = document.getElementById("guestbook-message");
    if (!form || !textarea || form.dataset.initialized === "true") return;
    form.dataset.initialized = "true";
    const count = document.getElementById("guestbook-count");
    const updateCount = () => { if (count) count.textContent = `${textarea.value.length} / ${LIMIT}`; };
    textarea.addEventListener("input", updateCount);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const message = textarea.value.trim();
      if (!message) { alert("메시지를 입력해 주세요!"); textarea.focus(); return; }
      if (message.length > LIMIT) { alert("메시지는 200자까지 작성할 수 있어요."); return; }
      const entries = storage.read();
      entries.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, createdAt: new Date().toISOString() });
      if (!storage.write(entries.slice(0, MAX_ENTRIES))) {
        alert("브라우저 저장 공간을 사용할 수 없어요. 저장되지 않았습니다.");
        return;
      }
      textarea.value = "";
      updateCount();
      render();
    });
    updateCount();
    render();
  }
  // Pages are inserted dynamically by portfolio.js.
  const observer = new MutationObserver(() => {
    if (document.getElementById("guestbook-form")) init();
  });
  function boot() {
    observer.observe(document.body, {childList:true,subtree:true});
    init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
