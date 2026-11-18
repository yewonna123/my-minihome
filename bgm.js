(() => {
  'use strict';
  // YouTube: id = watch URL's v= value or youtu.be/ following part
  // MP3 example: {type:'mp3', title:'My Song', src:'music/my-song.mp3'}
  const BGM_TRACKS = [
    {type:'youtube',title:'OVERDRIVE - TWS',id:'TzbGBkEh9ms'},
    {type:'youtube',title:'마음따라 뛰는 건 멋지지 않아? - TWS',id:'Csaj3X6PKxY'},
    {type:'youtube',title:'Nice Guy - BOYNEXTDOOR',id:'HJlc_tFkB3M'},
    {type:'youtube',title:'WAVE - ATEEZ',id:'FIInyEWWW-s'}
  ];
  const root=document.createElement('aside');
  root.className='bgm-panel';
  root.setAttribute('aria-label','미니홈피 BGM 플레이어');
  root.innerHTML=`<div class="bgm-top"><strong>♪ MY BGM LIST ♡</strong><button class="bgm-btn" type="button" data-fold aria-label="접기">−</button></div>
  <div class="bgm-pocket" aria-label="접힌 MP3 플레이어">
    <div class="bgm-pocket-brand">MINI ♡ MP3</div>
    <div class="bgm-pocket-lcd"><span class="bgm-pocket-status" data-pocket-status>Ⅱ PAUSE</span><span class="bgm-pocket-title" data-pocket-title><span class="bgm-scroll-text">OVERDRIVE</span></span><span class="bgm-pocket-sub">♫  MP3 PLAYER  ♫</span></div>
    <div class="bgm-pocket-controls">
      <button type="button" data-pocket-prev aria-label="이전 곡">◀◀</button>
      <button type="button" data-pocket-play aria-label="재생">▶</button>
      <button type="button" data-pocket-next aria-label="다음 곡">▶▶</button>
    </div>
  </div>
  <div class="bgm-body">
    <div class="bgm-screen" aria-label="MP3 통합 디스플레이">
      <div class="bgm-video" data-video></div>
      <div class="bgm-pink-screen">
        <div class="bgm-nowplaying"><span class="bgm-mini-label">NOW PLAYING ♫</span><div class="bgm-title" data-title><span class="bgm-scroll-text"></span></div><span class="bgm-source" data-source></span></div>
        <div class="bgm-playlist" data-list aria-label="노래 목록"></div>
      </div>
    </div>
    <div class="bgm-wheel" aria-label="MP3 조작부">
      <div class="bgm-wheel-volume" role="group" aria-label="음량 조절">
        <button class="bgm-volume-step bgm-volume-up" type="button" data-volume-up aria-label="볼륨 높이기">▲<span>VOL</span></button>
        <input data-volume type="range" min="0" max="100" value="65" aria-label="음량" tabindex="-1">
        <button class="bgm-volume-step bgm-volume-down" type="button" data-volume-down aria-label="볼륨 낮추기"><span>VOL</span>▼</button>
      </div>
      <div class="bgm-controls">
        <button class="bgm-btn" type="button" data-prev aria-label="이전 곡">◀◀</button>
        <button class="bgm-btn bgm-play" type="button" data-play aria-label="재생 또는 일시정지">▶</button>
        <button class="bgm-btn" type="button" data-next aria-label="다음 곡">▶▶</button>
      </div>
    </div>
    <p class="bgm-note" data-note>음악은 PLAY를 눌러 시작해요 ♡</p>
  </div>`;
  document.body.appendChild(root);
  // Figma earphone PNGs: independent pieces, positioned relative to a 240px MP3.
  const earAssets={
    top:'닫힌 이어폰 윗 이어폰.png',
    bottom:'닫힌이어폰 밑 이어폰.png',
    back:'열린mp3뒷 이어폰.png',
    one:'이어폰1.png',
    two:'이어폰2.png'
  };
  const earLayers=['back','front'].map(name=>{
    const layer=document.createElement('div');layer.className='mp3-earphones '+name;
    document.body.appendChild(layer);return layer;
  });
  function earPart(layer,mode,asset,x,y,w,h,interactive){
    const part=document.createElement(interactive?'button':'span');
    part.className='part';part.dataset.mode=mode;
    Object.assign(part.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    const img=document.createElement('img');img.src='assets/images/1x/'+encodeURIComponent(earAssets[asset]);img.alt='';img.draggable=false;
    part.appendChild(img);
    if(interactive){
      part.type='button';part.setAttribute('aria-label','이어폰 '+(asset==='one'?'1':'2')+' 흔들기');
      part.addEventListener('click',e=>{
        e.stopPropagation();part.classList.remove('swing','fold-sway');part.style.animationDelay='0ms';void part.offsetWidth;part.classList.add('swing');
      });
      part.addEventListener('animationend',()=>{part.classList.remove('swing','fold-sway');part.style.animationDelay='0ms';});
    }
    earLayers[layer].appendChild(part);
  }
  // Closed: loop across the top, curved cord beneath, two separate dangling buds.
  earPart(1,'closed','top',133,-10,43,119,false);
  earPart(0,'closed','bottom',-52,52,188,61,false);
  earPart(0,'closed','two',194,93,44,259,true);
  earPart(0,'closed','one',157,92,52,156,true);
  // Open: back cable disappears behind the MP3 casing.
  earPart(0,'open','back',-18,407,190,162,false);
  earPart(0,'open','two',197,443,48,280,true);
  earPart(0,'open','one',165,438,56,169,true);
  const compactMP3=window.matchMedia('(max-width:760px)');
  function positionEarphones(){
    const r=root.getBoundingClientRect(),scale=r.width/240;
    const mode=root.classList.contains('is-collapsed')?'closed':'open';
    earLayers.forEach(layer=>{
      layer.style.left=r.left+'px';layer.style.top=r.top+'px';
      layer.style.transform='scale('+scale+')';
      layer.querySelectorAll('[data-mode]').forEach(part=>{part.style.display=part.dataset.mode===mode?'block':'none';});
    });
  }
  window.addEventListener('resize',positionEarphones,{passive:true});
  window.addEventListener('scroll',positionEarphones,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(positionEarphones).observe(root);
  const $=sel=>root.querySelector(sel);
  const audio=new Audio();audio.preload='none';audio.volume=.65;
  let index=0,player=null,ready=false,apiReady=false,playing=false,pendingPlay=false;
  const current=()=>BGM_TRACKS[index];
  const note=message=>{ $('[data-note]').textContent=message; };
  const ytErrorText={
    2:'잘못된 영상 ID 또는 플레이어 요청입니다.',
    5:'브라우저의 HTML5 플레이어에서 재생할 수 없습니다.',
    100:'영상이 삭제되었거나 비공개 상태일 수 있습니다.',
    101:'영상 소유자가 외부 사이트 재생을 제한했습니다.',
    150:'영상 소유자가 외부 사이트 재생을 제한했습니다.',
    153:'유튜브에 출처 정보(Referer)가 전달되지 않았습니다.'
  };
  let youtubeError=null;
  function reportYoutubeError(code){
    youtubeError=code;
    playing=false;pendingPlay=false;update();
    note('YouTube 오류 '+code+' · '+(ytErrorText[code]||'알 수 없는 플레이어 오류')+' (F12 콘솔에도 기록됨)');
    console.error('[Minihome BGM] YouTube onError:',code,ytErrorText[code]||'unknown',{videoId:current().id,origin:location.origin});
  }
  const headerBgm=document.querySelector('.top .small');
  function updateHeader(){
    if(!headerBgm)return;
    headerBgm.textContent=playing?'♪ BGM : '+current().title+' ♫':'♪ BGM : '+current().title+' (PAUSED) ♫';
  }
  // 긴 제목만 왼쪽으로 끊김 없이 순환: 동일한 문구 두 개를 이어 배치한다.
  function refreshTitleScroll(){
    ['[data-title]','[data-pocket-title]'].forEach(selector=>{
      const viewport=$(selector), label=viewport.querySelector('.bgm-scroll-text');
      if(!label)return;
      const title=label.dataset.originalTitle ?? label.textContent;
      label.dataset.originalTitle=title;
      // 제목과 표시 폭이 그대로라면 DOM/애니메이션을 다시 만들지 않는다.
      // 재생/일시정지에 따른 update() 호출에서도 스크롤 위치가 유지된다.
      if(label.dataset.renderedTitle===title && label.dataset.renderedWidth===String(viewport.clientWidth))return;
      label.dataset.renderedTitle=title;
      label.dataset.renderedWidth=String(viewport.clientWidth);
      viewport.classList.remove('is-scrolling');
      label.replaceChildren();
      label.style.removeProperty('--bgm-loop-width');
      label.style.removeProperty('--bgm-scroll-duration');
      const first=document.createElement('span');
      first.className='bgm-loop-copy';first.textContent=title;
      label.appendChild(first);
      // 접힌 상태에서는 펼친 영역의 폭이 0이므로, 펼칠 때 다시 측정한다.
      if(viewport.clientWidth<2)return;
      const titleWidth=first.getBoundingClientRect().width;
      if(titleWidth<=viewport.clientWidth+1)return;
      const second=document.createElement('span');
      second.className='bgm-loop-copy';second.textContent=title;
      second.setAttribute('aria-hidden','true');
      label.appendChild(second);
      const step=titleWidth+28;
      label.style.setProperty('--bgm-loop-width',`${step}px`);
      label.style.setProperty('--bgm-scroll-duration',`${Math.max(7,step/24)}s`);
      viewport.classList.add('is-scrolling');
    });
  }
  window.addEventListener('resize',refreshTitleScroll);
  function update(){
    $('[data-title] .bgm-scroll-text').dataset.originalTitle=current().title;
    $('[data-source]').textContent=current().type==='youtube'?'YouTube ♫':'MP3 ♫';
    $('[data-play]').textContent=playing?'Ⅱ':'▶';
    $('[data-play]').setAttribute('aria-label',playing?'일시정지':'재생');
    $('[data-pocket-title] .bgm-scroll-text').dataset.originalTitle=current().title;
    $('[data-pocket-status]').textContent=playing?'▶ PLAYING':'Ⅱ PAUSED';
    $('[data-pocket-play]').textContent=playing?'Ⅱ':'▶';
    $('[data-pocket-play]').setAttribute('aria-label',playing?'일시정지':'재생');
    updateHeader();
    requestAnimationFrame(refreshTitleScroll);
    $('[data-list]').replaceChildren();
    BGM_TRACKS.forEach((t,i)=>{
      const b=document.createElement('button');b.type='button';b.className='bgm-track'+(i===index?' is-current':'');
      b.innerHTML='<span>♫</span><span></span>';b.lastChild.textContent=String(i+1).padStart(2,'0')+' · '+t.title;
      b.addEventListener('click',()=>select(i,true));$('[data-list]').appendChild(b);
    });
  }
  function stop(){
    audio.pause();
    if(player&&typeof player.stopVideo==='function')try{player.stopVideo()}catch(e){}
    playing=false;pendingPlay=false;
  }
  function createYoutube(){
    if(!apiReady||current().type!=='youtube')return;
    const slot=$('[data-video]');slot.replaceChildren();
    const el=document.createElement('div');el.id='minihome-yt-player';slot.appendChild(el);
    ready=false;youtubeError=null;
    player=new YT.Player(el,{
      width:'100%',height:'100%',videoId:current().id,
      host:'https://www.youtube-nocookie.com',
      playerVars:{playsinline:1,origin:location.origin,enablejsapi:1},
      events:{
        onReady(e){ready=true;note('준비 완료 · PLAY를 눌러 재생해 주세요 ♡');e.target.setVolume(Number($('[data-volume]').value));if(pendingPlay){pendingPlay=false;e.target.playVideo();}},
        onStateChange(e){
          if(e.data===YT.PlayerState.ENDED){select((index+1)%BGM_TRACKS.length,true);}
          else if(e.data===YT.PlayerState.PLAYING){playing=true;note('재생 중 ♫');update();}
          else if(e.data===YT.PlayerState.PAUSED){playing=false;update();}
        },
        onError(e){reportYoutubeError(e.data);}
      }
    });
  }
  function select(i,autoPlay=false){
    stop();index=i;player=null;ready=false;youtubeError=null;note('음악은 PLAY를 눌러 시작해요 ♡');
    const slot=$('[data-video]');
    if(current().type==='mp3'){
      slot.replaceChildren();slot.style.display='none';audio.src=current().src;
    }else{
      audio.removeAttribute('src');slot.style.display='block';
      slot.textContent='플레이어를 불러오는 중...';
      if(apiReady)createYoutube();
    }
    update();
    if(autoPlay)play();
  }
  function play(){
    if(current().type==='mp3'){
      audio.play().then(()=>{playing=true;update();}).catch(()=>{$('[data-note]').textContent='MP3 파일 경로를 확인해 주세요.';});
    }else if(ready&&player&&typeof player.playVideo==='function'){
      note('재생 요청 중...');player.playVideo();
    }else{pendingPlay=true;$('[data-note]').textContent='YouTube 플레이어를 준비하는 중이에요.';}
  }
  function togglePlayback(){
    if(playing){
      if(current().type==='mp3')audio.pause();
      else if(player&&typeof player.pauseVideo==='function')player.pauseVideo();
      playing=false;update();
    }else play();
  }
  $('[data-play]').addEventListener('click',togglePlayback);
  $('[data-pocket-play]').addEventListener('click',togglePlayback);
  $('[data-pocket-prev]').addEventListener('click',()=>select((index+BGM_TRACKS.length-1)%BGM_TRACKS.length,true));
  $('[data-pocket-next]').addEventListener('click',()=>select((index+1)%BGM_TRACKS.length,true));
  $('[data-prev]').addEventListener('click',()=>select((index+BGM_TRACKS.length-1)%BGM_TRACKS.length,true));
  $('[data-next]').addEventListener('click',()=>select((index+1)%BGM_TRACKS.length,true));
  function setFolded(folded){
    if(compactMP3.matches)folded=true;
    const stateChanged=root.classList.contains('is-collapsed')!==folded;
    root.classList.toggle('is-collapsed',folded);
    positionEarphones();
    if(stateChanged){
      // A small inertial sway after opening/closing; individual click sway stays intact.
      earLayers.forEach(layer=>layer.querySelectorAll('button.part[data-mode="'+(folded?'closed':'open')+'"]').forEach((part,i)=>{
        part.classList.remove('swing','fold-sway');
        part.style.animationDelay=(i===0?'0ms':'110ms');
        void part.offsetWidth;
        part.classList.add('fold-sway');
      }));
    }
    requestAnimationFrame(refreshTitleScroll);
    $('[data-fold]').hidden=compactMP3.matches;
    $('[data-fold]').textContent=folded?'+':'−';
    $('[data-fold]').setAttribute('aria-label',folded?'펼치기':'접기');
  }
  $('[data-fold]').addEventListener('click',()=>setFolded(!root.classList.contains('is-collapsed')));
  setFolded(true);
  compactMP3.addEventListener('change',()=>{if(compactMP3.matches)setFolded(true);else $('[data-fold]').hidden=false;positionEarphones();});
  const volumeInput=$('[data-volume]');
  function applyVolume(value){
    const next=Math.max(0,Math.min(100,Math.round(value)));
    volumeInput.value=String(next);
    audio.volume=next/100;
    if(ready&&player&&typeof player.setVolume==='function')player.setVolume(next);
  }
  volumeInput.addEventListener('input',e=>applyVolume(Number(e.target.value)));
  $('[data-volume-up]').addEventListener('click',()=>applyVolume(Number(volumeInput.value)+10));
  $('[data-volume-down]').addEventListener('click',()=>applyVolume(Number(volumeInput.value)-10));
  audio.addEventListener('ended',()=>select((index+1)%BGM_TRACKS.length,true));
  audio.addEventListener('pause',()=>{if(current().type==='mp3'){playing=false;update();}});
  const oldCallback=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{
    if(typeof oldCallback==='function')oldCallback();
    apiReady=true;createYoutube();
  };
  if(window.YT&&typeof window.YT.Player==='function'){apiReady=true;}
  else{const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);}
  select(0);
})();
