
(function () {
    const projects = window.PORTFOLIO_PROJECTS || [];
    const content = document.getElementById('content');
  
    /* ========================================
       COMMON UTILITIES
    ======================================== */
  
    const esc = (s) =>
      String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c]));
  
    const image = (src, alt) => `
      <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">
    `;
  
    // 현재 페이지와 선택한 작품 확인
    function route() {
      const q = new URLSearchParams(location.hash.slice(1));
  
      return {
        page: q.get('page') || 'home',
        project: q.get('project')
      };
    }
  
    // 스크롤 영역 찾기
    function getScrollArea() {
      let element = content;
  
      while (element && element !== document.body) {
        const style = getComputedStyle(element);
  
        if (
          ['auto', 'scroll'].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight
        ) {
          return element;
        }
  
        element = element.parentElement;
      }
  
      return document.scrollingElement || document.documentElement;
    }
  
    function scrollToTop() {
      getScrollArea().scrollTo({
        top: 0,
        behavior: 'instant'
      });
    }
  
    /* ========================================
       PAGE NAVIGATION
    ======================================== */
  
    // 페이지 이동
    function go(page, project) {
      const q = new URLSearchParams({ page });
  
      if (project) {
        q.set('project', project);
      }
  
      const nextHash = q.toString();
  
      if (location.hash.slice(1) === nextHash) {
        render();
      } else {
        location.hash = nextHash;
      }
    }
  
    // 팝업을 닫으면 현재 페이지 유지
    let roomModalMode = false;
    function returnToCurrentPage() {
      if (roomModalMode) {
        roomModalMode = false;
        closeProject();
        return;
      }
      const { page } = route();
      go(page);
    }
  
    /* ========================================
       PORTFOLIO LIST
    ======================================== */
  
    function list() {
      return `
        <div class="page-title">PORTFOLIO ♡</div>
  
        <p class="small">
          MY CREATIVE WORKS · ALL PROJECTS (${projects.length})
        </p>
  
        <div class="portfolio-grid">
          ${projects.map((p) => `
            <button
              class="project-card"
              data-project="${esc(p.id)}"
            >
              ${image(p.thumbnail, p.title)}
  
              <span class="project-info">
                <strong>${esc(p.title)}</strong>
  
                <small>
                  ${esc(p.category)} · ${esc(p.year)}
                </small>
              </span>
            </button>
          `).join('')}
        </div>
      `;
    }
  
    /* ========================================
       PROJECT DETAIL
    ======================================== */
  
    function detail(id) {
      const i = projects.findIndex((p) => p.id === id);
  
      if (i < 0) {
        return '<p>작품을 찾을 수 없습니다.</p>';
      }
  
      const p = projects[i];
  
      const prev = projects[
        (i - 1 + projects.length) % projects.length
      ];
  
      const next = projects[
        (i + 1) % projects.length
      ];
  
      return `
        <div class="page-title">${esc(p.title)} ♡</div>
  
        <p class="small">
          ${esc(p.category)} · ${esc(p.year)}
        </p>
  
        <div class="project-hero">
          ${image(p.thumbnail, p.title)}
        </div>
  
        <h2 class="project-heading">PROJECT OVERVIEW</h2>
  
        <p class="project-copy">
          ${esc(p.description)}
        </p>
  
        ${p.video ? `
          <h2 class="project-heading">MOTION FILM</h2>
  
          <div class="video-frame">
            <iframe
              src="${esc(p.video)}"
              title="${esc(p.title)} 영상"
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              allowfullscreen
            ></iframe>
          </div>
        ` : ''}
  
        ${p.sections.map((s, j) => `
          <section class="work-section">
  
            <h2 class="project-heading">
              <span class="section-num">
                ${String(j + 1).padStart(2, '0')}.
              </span>
              ${esc(s.title)}
            </h2>
  
            <p class="project-copy">
              ${esc(s.description)}
            </p>
  
            <div class="work-images">
              ${s.images.map((src) =>
                image(src, s.title + ' 작품 이미지')
              ).join('')}
            </div>
  
          </section>
        `).join('')}
  
        <div class="project-facts">
          <h2 class="project-heading">PROJECT INFO</h2>
  
          <dl>
            <dt>YEAR</dt>
            <dd>${esc(p.year)}</dd>
  
            <dt>DURATION</dt>
            <dd>${esc(p.duration)}</dd>
  
            <dt>ROLE</dt>
            <dd>${esc(p.role)}</dd>
  
            <dt>TOOLS</dt>
            <dd>${(p.tools || []).map(esc).join(' · ')}</dd>
          </dl>
        </div>
  
        <a
          class="mini-action external-action"
          href="${esc(p.external)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Behance에서 보기 ↗
        </a>
  
        <div class="portfolio-bottom-actions">
          <button class="mini-action" data-top>
            ↑ 맨 위로
          </button>
  
          <button class="mini-action" data-close-project>
            × 상세 창 닫기
          </button>
        </div>
  
        <div class="project-nav">
          <button
            class="mini-action"
            data-project="${esc(prev.id)}"
          >
            ← 이전 작품
          </button>
  
          <button
            class="mini-action"
            data-project="${esc(next.id)}"
          >
            다음 작품 →
          </button>
        </div>
      `;
    }
  
    /* ========================================
       PROJECT POPUP
    ======================================== */
  
    // 팝업 창 생성
    const overlay = document.createElement('div');
  
    overlay.id = 'project-overlay';
    overlay.className = 'project-overlay';
    overlay.hidden = true;
  
    overlay.innerHTML = `
      <div
        class="project-window"
        role="dialog"
        aria-modal="true"
        aria-label="포트폴리오 작품 상세"
      >
        <div class="project-window-bar">
          <span class="window-title">
            <span class="window-dot"></span>
            YEWON'S PROJECT VIEWER
          </span>
  
          <button
            class="project-close"
            data-close-project
            aria-label="작품 창 닫기"
          >
            ×
          </button>
        </div>
  
        <div class="project-window-content"></div>
      </div>
    `;
  
    document.body.appendChild(overlay);
  
    const modalContent = overlay.querySelector(
      '.project-window-content'
    );
  
    const closeButton = overlay.querySelector(
      '.project-close'
    );
  
    let previousFocus = null;
    let lastProjectId = null;
  
    // 상세 창 열기
    function openProject(id) {
      if (!projects.some((p) => p.id === id)) {
        closeProject();
        return;
      }
  
      const wasClosed = overlay.hidden;
  
      if (wasClosed) {
        previousFocus = document.activeElement;
      }
  
      overlay.hidden = false;
  
      // 다른 작품으로 이동했을 때만 내용 교체
      if (lastProjectId !== id) {
        modalContent.innerHTML = detail(id);
        modalContent.scrollTop = 0;
        lastProjectId = id;
      }
  
      document.body.classList.add('project-modal-open');
  
      if (wasClosed) {
        closeButton.focus();
      }
    }
  
    // 상세 창 닫기
    function closeProject() {
      const wasOpen = !overlay.hidden;
  
      overlay.hidden = true;
      modalContent.innerHTML = '';
      lastProjectId = null;
  
      document.body.classList.remove('project-modal-open');
  
      if (
        wasOpen &&
        previousFocus &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
  
      previousFocus = null;
    }
  
    /* ========================================
       PAGE RENDERING
    ======================================== */
  
    let renderedPage = null;
    function render() {
      const { page, project } = route();
  
      // 현재 페이지를 팝업 뒤에 표시
      if (renderedPage !== page) {
        content.innerHTML =
          page === 'portfolio'
            ? list()
            : (
                window.MINIHOME_PAGES?.[page] ||
                window.MINIHOME_PAGES?.home ||
                ''
              );
        renderedPage = page;
      }
  
      // 현재 페이지의 인덱스 활성화
      document.querySelectorAll('.menu button').forEach((b) => {
        b.classList.toggle(
          'active',
          b.dataset.page === page
        );
      });
  
      // HOME과 PORTFOLIO 모두 팝업 열기 가능
      if (project) {
        openProject(project);
      } else {
        closeProject();
      }
    }
  
    /* ========================================
       CLICK EVENTS
    ======================================== */
  
    document.addEventListener('click', (e) => {
  
      // 상세 창 맨 위로
      if (e.target.closest('[data-top]')) {
        modalContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }
  
      // X 버튼, 하단 닫기 버튼, 팝업 바깥 클릭
      if (
        e.target.closest('[data-close-project]') ||
        e.target === overlay
      ) {
        returnToCurrentPage();
        return;
      }
  
      // 작품 선택 / 이전 작품 / 다음 작품
      const projectButton = e.target.closest('[data-project]');
  
      if (projectButton) {
        if (roomModalMode) {
          openProject(projectButton.dataset.project);
          return;
        }
        const { page } = route();
  
        go(page, projectButton.dataset.project);
        return;
      }
  
      // 기존 목록 버튼 호환
      if (e.target.closest('[data-back]')) {
        go('portfolio');
        return;
      }
  
      // 미니홈피 인덱스 메뉴
      const menuButton = e.target.closest(
        '.menu button[data-page]'
      );
  
      if (menuButton) {
        go(menuButton.dataset.page);
      }
    });
  
    /* ========================================
       KEYBOARD EVENTS
    ======================================== */
  
    document.addEventListener('keydown', (e) => {
      if (overlay.hidden) return;
  
      // ESC 키로 팝업 닫기
      if (e.key === 'Escape') {
        e.preventDefault();
        returnToCurrentPage();
        return;
      }
  
      // 팝업 내부 포커스 유지
      if (e.key === 'Tab') {
        const focusable = Array.from(
          overlay.querySelectorAll(
            'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.getClientRects().length > 0);
  
        if (!focusable.length) return;
  
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
  
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === last
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  
    /* ========================================
       BROWSER NAVIGATION
    ======================================== */
  
    window.addEventListener('hashchange', () => {
      render();
  
      if (overlay.hidden) {
        scrollToTop();
      }
    });
  
    // 다른 스크립트에서 페이지 이동 가능
    window.goMinihome = go;
    // 액자에서 작품을 열 때 페이지 해시나 3D 미니룸 DOM을 변경하지 않습니다.
    window.openMinihomeProjectModal = (id) => {
      if (!projects.some((p) => p.id === id)) return;
      roomModalMode = true;
      openProject(id);
    };
  
    // 최초 화면 표시
    render();
  
  })();
  