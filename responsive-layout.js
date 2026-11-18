/* No PC scene replacement. The original cover/open state/index/MP3 remain in place. */
(() => {
  'use strict';
  function initialize() {
  const userAgent = navigator.userAgent || '';
  const phone = navigator.userAgentData?.mobile === true ||
    /iPhone|iPod|Windows Phone/i.test(userAgent) ||
    (/Android/i.test(userAgent) && /Mobile/i.test(userAgent));
  const root = document.documentElement;
  const content = document.getElementById('content');
  const cover = document.getElementById('diary-cover-screen');
  if (!content || !cover) return;

  // Compact desktop is a CSS layout of existing nodes, NOT a second diary.
  function resize() {
    const width = window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;
    const compactScale=Math.max(.2,Math.min(1, (width - 8) / 767));
    root.style.setProperty('--r-compact-scale',String(compactScale));
    root.style.setProperty('--r-closed-scale',String(compactScale * .79));
    root.style.setProperty('--r-compact-mp3-zoom',String(compactScale * .78));
    if (phone) root.style.setProperty('--r-phone-cover-scale', Math.max(.3,Math.min(.57,(width - 22)/708, (height - 160)/972)).toString());
  }
  window.addEventListener('resize', resize, {passive:true});
  window.visualViewport?.addEventListener('resize', resize, {passive:true});
  resize();
  if (!phone) return;
  document.body.classList.add('r-phone');

  // The phone shares the SAME original cover. No extra close/open buttons.
  const oldPlace = document.createComment('original content position');
  content.parentNode.insertBefore(oldPlace, content);
  const app = document.createElement('section');
  app.id='r-phone-app';
  app.setAttribute('aria-label','모바일 미니홈피');
  app.innerHTML = `
    <header class="r-phone-top">
      <div class="r-phone-counter">TODAY 123&nbsp;&nbsp; TOTAL 12345</div>
      <div class="r-phone-memo">MY MINIHOME ♡<small>나의 작은 공간에 오신 것을 환영합니다.</small></div>
      <button class="r-phone-bgm-toggle" type="button" aria-label="BGM 플레이어 열기">bgm</button>
    </header>
    <div class="r-phone-scroll">
      <section class="r-phone-profile">
        <div class="r-phone-profile-inner">
          <div class="r-phone-photo" aria-label="프로필 사진 자리"></div>
          <div class="r-phone-profile-info">
            나예원<br>YEWON NA<br>2D &amp; 3D Motion Designer
            <p><a href="mailto:n020123511@gmail.com">n020123511@gmail.com</a><br>
            <a href="https://www.behance.net/141e2092" target="_blank" rel="noopener">Behance</a></p>
            <button type="button" class="r-phone-profile-more" aria-expanded="false">프로필 펼치기</button>
          </div>
        </div>
        <div class="r-phone-profile-expanded" hidden>2D와 3D를 넘나들며 다양한 비주얼을 만들어갑니다.
          <button type="button" data-r-page="profile">상세 프로필 보기 ♡</button>
        </div>
      </section>
      <div class="r-phone-contents"></div>
    </div>
    <nav class="r-phone-nav" aria-label="모바일 페이지 메뉴">
      <button type="button" data-r-page="home" aria-label="홈"><span>⌂</span><small>홈</small></button>
      <button type="button" data-r-page="portfolio" aria-label="포트폴리오"><span>★</span><small>작업</small></button>
      <button type="button" data-r-page="room" aria-label="미니룸"><span>▣</span><small>미니룸</small></button>
      <button type="button" data-r-page="game" aria-label="미니게임"><span>♧</span><small>게임</small></button>
      <button type="button" class="r-phone-more" aria-label="더보기"><span>✦</span><small>더보기</small></button>
    </nav>
    <div class="r-phone-more-menu" hidden>
      <button type="button" data-r-page="diary">✎ BEHIND</button>
      <button type="button" data-r-page="guestbook">✉ GUESTBOOK</button>
      <button type="button" data-r-page="profile">♡ PROFILE</button>
      <button type="button" class="r-phone-more-dismiss">닫기</button>
    </div>
  `;
  document.body.appendChild(app);
  const bgmDim = document.createElement('div');
  bgmDim.id='r-phone-bgm-dim';
  bgmDim.innerHTML='<button type="button" aria-label="MP3 팝업 닫기">×</button>';
  document.body.appendChild(bgmDim);
  app.querySelector('.r-phone-contents').appendChild(content);
  const phoneProfile = app.querySelector('.r-phone-profile');
  const currentPage = () => new URLSearchParams(location.hash.slice(1)).get('page') || 'home';
  const updateRoute=()=>{
    const route=currentPage();
    phoneProfile.hidden = route !== 'home';
    app.querySelectorAll('[data-r-page]').forEach(b=>b.setAttribute('aria-current',b.dataset.rPage===route?'page':'false'));
  };
  updateRoute();
  window.addEventListener('hashchange',()=>{
    updateRoute();app.querySelector('.r-phone-scroll').scrollTop=0;
  });

  const bgm=document.querySelector('.bgm-panel');
  const syncOpen=()=>{
    const opened=cover.classList.contains('is-open');
    document.body.classList.toggle('r-phone-open',opened);
    if (!opened) closeBgm();
  };
  new MutationObserver(syncOpen).observe(cover,{attributes:true,attributeFilter:['class']});
  syncOpen();

  function openBgm(){
    if (!bgm) return;
    document.body.classList.add('r-phone-bgm');
    // bgm.js intentionally keeps its fold button disabled under 760px;
    // opening as a modal does not make a second player or mutate music state.
    bgm.classList.remove('is-collapsed');
  }
  function closeBgm(){
    document.body.classList.remove('r-phone-bgm');
    bgm?.classList.add('is-collapsed');
  }
  bgmDim.addEventListener('click',closeBgm);
  app.addEventListener('click',e=>{
    const btn=e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('r-phone-bgm-toggle')){openBgm();return;}
    if (btn.classList.contains('r-phone-profile-more')){
      const extra=app.querySelector('.r-phone-profile-expanded');
      extra.hidden=!extra.hidden;
      btn.textContent=extra.hidden?'프로필 펼치기':'프로필 접기';
      btn.setAttribute('aria-expanded',String(!extra.hidden));return;
    }
    if (btn.classList.contains('r-phone-more')){
      const menu=app.querySelector('.r-phone-more-menu');menu.hidden=!menu.hidden;return;
    }
    if (btn.classList.contains('r-phone-more-dismiss')){app.querySelector('.r-phone-more-menu').hidden=true;return;}
    if (btn.dataset.rPage){
      app.querySelector('.r-phone-more-menu').hidden=true;
      if (typeof window.goMinihome==='function') window.goMinihome(btn.dataset.rPage);
      else location.hash='page='+btn.dataset.rPage;
      updateRoute();
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('r-phone-bgm'))closeBgm();});
  }
  if (document.readyState === 'loading' || !document.getElementById('diary-cover-screen')) {
    document.addEventListener('DOMContentLoaded', initialize, {once:true});
  } else {
    initialize();
  }
})();
