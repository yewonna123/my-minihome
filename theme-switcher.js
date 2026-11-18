(()=>{
  const KEY='my-minihome-site-theme-v1';
  const get=()=>{try{return localStorage.getItem(KEY)==='mint'?'mint':'strawberry'}catch{return 'strawberry'}};
  const earMap={'닫힌 이어폰 윗 이어폰.png':'mint-07.png','닫힌이어폰 밑 이어폰.png':'mint-08.png','열린mp3뒷 이어폰.png':'mint-12.png','이어폰1.png':'mint-15.png','이어폰2.png':'mint-16.png'};
  function syncEarphones(){
    const mint=document.documentElement.dataset.siteTheme==='mint';
    document.querySelectorAll('.mp3-earphones img').forEach(img=>{
      if(!img.dataset.strawberrySrc)img.dataset.strawberrySrc=img.getAttribute('src')||'';
      let name;try{name=decodeURIComponent(img.dataset.strawberrySrc.split('/').pop())}catch{return}
      const asset=earMap[name];if(!asset)return;
      const target=mint?'theme-assets/mint/'+asset:img.dataset.strawberrySrc;
      if(img.getAttribute('src')!==target)img.setAttribute('src',target);
    });
  }

  function syncKeyring(){
    const mint=document.documentElement.dataset.siteTheme==='mint';
    document.querySelectorAll('.diary-keyring').forEach(charm=>{
      charm.style.removeProperty('background-image');
      charm.style.removeProperty('background-size');
      charm.style.removeProperty('background-position');
      charm.style.removeProperty('background-repeat');
      charm.setAttribute('aria-label',mint?'토끼 키링 흔들기':'곰돌이 키링 흔들기');
    });
  }
  function apply(theme){document.documentElement.dataset.siteTheme=theme;syncEarphones();syncKeyring();window.dispatchEvent(new Event('minihome:site-theme-changed'))}
  function init(){
    const bar=document.createElement('div');bar.className='site-theme-picker';
    bar.innerHTML='<label for="site-theme-choice">♡ 홈페이지 테마</label><select id="site-theme-choice"><option value="strawberry">🍓 딸기초코</option><option value="mint">🌿 민트초코</option></select>';
    document.body.appendChild(bar);
    const select=bar.querySelector('select');select.value=get();
    select.addEventListener('change',()=>{try{localStorage.setItem(KEY,select.value)}catch{}apply(select.value)});
    apply(get());
    new MutationObserver(()=>{syncEarphones();syncKeyring()}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
