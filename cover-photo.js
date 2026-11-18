/* Cover photo is stored only in the visitor's browser. */
(() => {
  const STORAGE_KEY = 'minihome-cover-photo-v1';
  const ready = () => {
    const screen = document.getElementById('diary-cover-screen');
    if (!screen) { setTimeout(ready, 80); return; }
    const photo = screen.querySelector('.diary-cover-photo');
    const edit = screen.querySelector('.diary-cover-photo-edit');
    const label = screen.querySelector('.diary-cover-label');
    if (!photo || !edit) return;
    const setPhoto = (data) => {
      // Avoid inserting an untrusted string into a CSS declaration.
      const hasPhoto = !!(data && /^data:image\/(?:png|jpeg|webp);base64,/.test(data));
      photo.style.backgroundImage = hasPhoto ? `url("${data}")` : 'none';
      if (label) label.hidden = hasPhoto;
    };
    try { setPhoto(localStorage.getItem(STORAGE_KEY)); } catch (_) { setPhoto(null); }
    const dialog = document.createElement('div');
    dialog.className = 'cover-photo-dialog';
    dialog.hidden = true;
    dialog.innerHTML = `<div class="cover-photo-dialog-panel" role="dialog" aria-modal="true" aria-label="표지 사진 변경">
      <h2>나만의 표지 꾸미기 ♡</h2>
      <p>타원형 창에 넣을 사진을 골라줘! 이 브라우저에서만 저장돼.</p>
      <div class="cover-photo-dialog-actions">
        <label>사진 선택<input type="file" accept="image/*" data-cover-file></label>
        <button type="button" data-cover-reset>기본 타이틀로</button>
        <button type="button" data-cover-close>닫기</button>
      </div><div class="cover-photo-dialog-error" role="status"></div>
    </div>`;
    document.body.appendChild(dialog);
    const error = dialog.querySelector('.cover-photo-dialog-error');
    const close = () => { dialog.hidden = true; edit.focus(); };
    edit.addEventListener('click', (e) => { e.stopPropagation(); error.textContent=''; dialog.hidden=false; dialog.querySelector('[data-cover-close]').focus(); });
    dialog.querySelector('[data-cover-close]').addEventListener('click', close);
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    dialog.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    dialog.querySelector('[data-cover-reset]').addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      setPhoto(null); close();
    });
    dialog.querySelector('[data-cover-file]').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { error.textContent='이미지 파일을 선택해 줘.'; return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          // Fit the oval window without stretching the uploaded picture.
          canvas.width = 880; canvas.height = 362;
          const ctx = canvas.getContext('2d');
          const ratio = Math.max(canvas.width/img.width,canvas.height/img.height);
          const w=img.width*ratio,h=img.height*ratio;
          ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
          const data = canvas.toDataURL('image/jpeg',0.78);
          localStorage.setItem(STORAGE_KEY,data);
          setPhoto(data); close();
        } catch (_) { error.textContent='저장 공간이 부족하거나 이미지를 처리할 수 없어. 다른 사진으로 시도해 줘.'; }
      };
      img.onerror = () => { URL.revokeObjectURL(url); error.textContent='사진을 불러오지 못했어.'; };
      img.src=url;
      e.target.value='';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready);
  else ready();
})();
