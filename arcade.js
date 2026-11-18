/* MINI GAME – arcade selection and playable endless platform jumper.
   Include AFTER portfolio.js. Does not change navigation or 3D room state. */
(() => {
  'use strict';
  const host = document.getElementById('content');
  if (!host) return;
  let dispose = null;
  const arcadeMarkup = `
    <section class="arcade-root" aria-label="미니게임 오락실">
      <div class="arcade-shell">
        <div class="arcade-selectview">
          <header class="arcade-top"><div><div class="arcade-kicker">WELCOME TO THE ARCADE</div><h2 class="arcade-title">MINI ARCADE</h2></div><span class="arcade-coin">INSERT COIN · 01</span></header>
          <div class="arcade-monitor" role="group" aria-label="오락기 게임 선택 화면">
            <div class="arcade-monitor-head"><span>▣ ARCADE SYSTEM</span><span>1 CREDIT</span></div>
            <div class="arcade-monitor-title">SELECT GAME</div>
            <div class="arcade-game-options" role="group" aria-label="게임 목록">
              <button type="button" class="arcade-game-option is-selected" data-arcade-open="jump"><span class="arcade-game-index">01</span><span class="arcade-game-label">JUMP GAME<small>장애물을 뛰어넘고 최고 기록에 도전</small></span><span class="arcade-game-state">▶ PLAY</span></button>
              <button type="button" class="arcade-game-option is-selected" data-arcade-open="claw"><span class="arcade-game-index">02</span><span class="arcade-game-label">CLAW MACHINE<small>집게를 조작해 인형을 모으세요</small></span><span class="arcade-game-state">▶ PLAY</span></button>
              <button type="button" class="arcade-game-option is-selected" data-arcade-open="asmr"><span class="arcade-game-index">03</span><span class="arcade-game-label">ASMR ROOM<small>발판을 밟고 좋아하는 소리를 반복해 보세요</small></span><span class="arcade-game-state">▶ PLAY</span></button>
            </div>
            <div class="arcade-monitor-footer">↑ ↓ SELECT &nbsp; · &nbsp; ENTER START &nbsp; · &nbsp; CLICK TO PLAY</div>
          </div>
          <div class="arcade-control-deck" aria-hidden="true"><span class="arcade-joystick"><i></i></span><span class="arcade-deck-label">MINI ARCADE · ONE MACHINE / MANY GAMES</span><span class="arcade-deck-buttons"><i></i><i></i></span></div>
        </div>
        <div class="arcade-playview" hidden>
          <div class="arcade-gamebar"><button class="arcade-button" data-arcade-back>← 게임 선택</button><div class="arcade-stats"><span>SCORE <strong data-score>0</strong></span><span>BEST <strong data-best>0</strong></span></div><button class="arcade-button" data-arcade-pause>일시정지</button></div>
          <div class="arcade-canvas-wrap"><canvas class="arcade-canvas" width="800" height="450" aria-label="점프 게임 화면"></canvas><div class="arcade-center" data-arcade-message><h3 data-message-title>JUMP GAME</h3><p data-message-text>장애물을 뛰어넘고 오래 살아남으세요.</p><button class="arcade-button" data-arcade-start>START GAME</button></div></div>
          <p class="arcade-hint">SPACE / ↑ / W 또는 화면 터치로 점프 · 공중에서 한 번 더 점프 가능</p>
          <div class="arcade-touch"><button class="arcade-button arcade-jump" data-arcade-jump>▲ JUMP</button></div>
        </div>
        <div class="claw-playview" hidden>
          <div class="arcade-gamebar"><button class="arcade-button" data-claw-back>← 게임 선택</button><div class="arcade-stats"><span>COINS <strong data-claw-coins>5</strong></span><span>PRIZES <strong data-claw-wins>0</strong></span></div><button class="arcade-button" data-claw-reset>코인 충전</button></div>
          <div class="claw-machine-wrap"><canvas class="claw-canvas" width="800" height="500" aria-label="정면 2D 인형 뽑기 게임"></canvas><div class="claw-notice" data-claw-notice>← → 집게 이동 · SPACE 뽑기</div></div>
          <div class="claw-controls"><button class="arcade-button" data-claw-left>◀ LEFT</button><button class="arcade-button" data-claw-drop>▼ GRAB</button><button class="arcade-button" data-claw-right>RIGHT ▶</button></div>
          <div class="claw-collection"><div class="claw-collection-head"><span>MY COLLECTION <strong data-claw-unique>0 / 5</strong></span><button class="arcade-button" data-claw-gallery>컬렉션 크게 보기</button></div><div data-claw-collection class="claw-collection-items"></div></div><div class="claw-reward" data-claw-reward hidden><div class="claw-reward-card"><div class="claw-reward-kicker">PRIZE GET!</div><div class="claw-reward-art" data-claw-reward-art></div><h3 data-claw-reward-name></h3><p data-claw-reward-desc></p><button class="arcade-button" data-claw-reward-close>계속 뽑기</button></div></div><div class="claw-gallery" data-claw-gallery-view hidden><div class="claw-gallery-card"><div class="claw-gallery-head"><h3>MY COLLECTION</h3><button class="arcade-button" data-claw-gallery-close>닫기 ✕</button></div><div data-claw-gallery-items class="claw-gallery-items"></div></div></div>
        </div>
        <div class="asmr-playview" hidden>
          <div class="arcade-gamebar"><button class="arcade-button" data-asmr-back>← 게임 선택</button><span class="asmr-status" data-asmr-status>방을 선택해 주세요 ♡</span><button class="arcade-button" data-asmr-mute>🔊 소리 켜짐</button></div>
          <div class="asmr-room-select" data-asmr-select>
            <h3>ASMR ROOMS ♡</h3><p>원하는 소리의 방을 선택해 주세요</p>
            <div class="asmr-room-grid">
              <button data-asmr-room="0">⌨️ <b>01 · 도각 키보드</b><small>도각 · 또각</small></button>
              <button data-asmr-room="1">◈ <b>02 · 클릭축</b><small>딸깍 · 찰칵</small></button>
              <button data-asmr-room="2">🍫 <b>03 · 왁뿌</b><small>오독 · 오도독</small></button>
              <button data-asmr-room="3">❄️ <b>04 · 서걱</b><small>서걱 · 사르륵</small></button>
              <button data-asmr-room="4">◉ <b>05 · 오도독 스위치</b><small>오독 · 또독</small></button>
            </div>
          </div>
          <div class="asmr-stage" data-asmr-stage hidden><button class="arcade-button asmr-room-back" data-asmr-room-back>← 다른 방</button><div class="asmr-three" data-asmr-three></div><div class="asmr-mobile-dpad" data-asmr-dpad aria-label="ASMR 이동 방향키"><button type="button" data-asmr-direction="arrowup" aria-label="위로 이동">▲</button><button type="button" data-asmr-direction="arrowleft" aria-label="왼쪽으로 이동">◀</button><button type="button" data-asmr-direction="arrowdown" aria-label="아래로 이동">▼</button><button type="button" data-asmr-direction="arrowright" aria-label="오른쪽으로 이동">▶</button></div><p class="arcade-hint">WASD / 방향키 이동 · 밟으면 1회 · 발을 떼고 다시 밟으면 재생</p></div>
        </div>
      </div>
    </section>`;
  function mount() {
    if (host.querySelector('.arcade-root')) return;
    if (dispose) { dispose(); dispose = null; }
    host.innerHTML = arcadeMarkup;
    const root = host.querySelector('.arcade-root');
    const select = root.querySelector('.arcade-selectview');
    const play = root.querySelector('.arcade-playview');
    const canvas = root.querySelector('.arcade-canvas');
    const clawView = root.querySelector('.claw-playview');
    const asmrView = root.querySelector('.asmr-playview');
    const asmrGame = window.createMiniAsmrRoom(root, asmrView);
    const ctx = canvas.getContext('2d');
    const scoreNode = root.querySelector('[data-score]');
    const bestNode = root.querySelector('[data-best]');
    const message = root.querySelector('[data-arcade-message]');
    const title = root.querySelector('[data-message-title]');
    const description = root.querySelector('[data-message-text]');
    const startButton = root.querySelector('[data-arcade-start]');
    const pauseButton = root.querySelector('[data-arcade-pause]');
    let raf = 0, last = 0, state = 'ready', score = 0, best = 0, speed = 275, spawn = 0;
    const floor = 352;
    const player = { x: 115, y: floor - 48, w: 36, h: 48, vy: 0, jumps: 0 };
    let obstacles = [], clouds = [];
    try { best = Number(localStorage.getItem('minihome_jump_best')) || 0; } catch (_) {}
    bestNode.textContent = best;
    function showMessage(heading, sub, button) { title.textContent = heading; description.textContent = sub; startButton.textContent = button; message.hidden = false; }
    function reset() { score = 0; speed = 275; spawn = 0.9; obstacles = []; clouds = [{x:70,y:80},{x:350,y:110},{x:650,y:65}]; player.y = floor-player.h; player.vy=0;player.jumps=0;scoreNode.textContent='0'; }
    function start() { reset(); state='playing'; message.hidden=true; pauseButton.textContent='일시정지'; last=0; if(!raf)raf=requestAnimationFrame(loop); }
    function jump() { if(state==='ready'||state==='over'){start();return;} if(state!=='playing'||player.jumps>=2)return; player.vy=player.jumps===0?-650:-570; player.jumps++; }
    function end() { state='over'; const final=Math.floor(score); if(final>best){best=final;try{localStorage.setItem('minihome_jump_best',String(best))}catch(_){}}bestNode.textContent=best;showMessage('GAME OVER',`SCORE ${final} · BEST ${best}`,'RETRY'); }
    function pause() { if(state==='playing'){state='paused';pauseButton.textContent='계속하기';showMessage('PAUSED','잠시 쉬어가세요.','RESUME');}else if(state==='paused'){state='playing';pauseButton.textContent='일시정지';message.hidden=true;last=0;} }
    function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    function draw() {
      const sky=ctx.createLinearGradient(0,0,0,450);sky.addColorStop(0,'#1c2d43');sky.addColorStop(1,'#516a73');ctx.fillStyle=sky;ctx.fillRect(0,0,800,450);
      ctx.fillStyle='#b5c8c9';clouds.forEach(c=>{ctx.globalAlpha=.35;ctx.beginPath();ctx.ellipse(c.x,c.y,43,12,0,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
      rect(0,floor,800,98,'#333e47');rect(0,floor,800,7,'#c2b28e');
      for(let x=-(score*8%55);x<800;x+=55)rect(x,floor+35,28,3,'#65727b');
      const px=Math.round(player.x),py=Math.round(player.y);
      rect(px+7,py,22,13,'#dfc7a2');rect(px+2,py+13,32,25,'#d2a878');rect(px+7,py+38,9,10,'#e8d3b4');rect(px+22,py+38,9,10,'#e8d3b4');rect(px+9,py+20,4,4,'#293747');rect(px+24,py+20,4,4,'#293747');
      obstacles.forEach(o=>{rect(o.x,o.y,o.w,o.h,'#c6a77e');rect(o.x+5,o.y+5,o.w-10,o.h-10,'#856d65');rect(o.x+8,o.y+8,5,5,'#e5d3a7')});
      ctx.fillStyle='#e3e5e7';ctx.font='15px monospace';ctx.fillText('JUMP GAME  /  ARCADE 01',20,28);
    }
    function loop(ts){raf=0;if(!root.isConnected)return;const dt=Math.min((ts-(last||ts))/1000,.035);last=ts;
      if(state==='playing'){
        speed=Math.min(590,speed+dt*7);score+=dt*12;scoreNode.textContent=Math.floor(score);
        player.vy+=1700*dt;player.y+=player.vy*dt;if(player.y>=floor-player.h){player.y=floor-player.h;player.vy=0;player.jumps=0;}
        spawn-=dt;if(spawn<=0){const h=35+Math.random()*30;obstacles.push({x:810,y:floor-h,w:26+Math.random()*15,h});spawn=Math.max(.68,1.15-speed/950)+Math.random()*.5;}
        obstacles.forEach(o=>o.x-=speed*dt);obstacles=obstacles.filter(o=>o.x+o.w>0);clouds.forEach(c=>{c.x-=dt*13;if(c.x< -50)c.x=850});
        if(obstacles.some(o=>player.x+player.w-7>o.x&&player.x+7<o.x+o.w&&player.y+player.h-5>o.y&&player.y+7<o.y+o.h))end();
      }
      draw();if(state==='playing')raf=requestAnimationFrame(loop);
    }
    function open(){asmrGame.stop();asmrView.hidden=true;clawView.hidden=true;select.hidden=true;play.hidden=false;reset();state='ready';showMessage('JUMP GAME','장애물을 뛰어넘고 오래 살아남으세요.','START GAME');draw();}
    function back(){state='ready';cancelAnimationFrame(raf);raf=0;select.hidden=false;play.hidden=true;}
    function key(e){if(play.hidden)return;if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();jump();}else if(e.code==='Escape'){e.preventDefault();back();}else if(e.code==='KeyP'){pause();}}
    // CLAW MACHINE: 2D crane game with varying sizes, grip strength and prize gallery.
    const clawCanvas=root.querySelector('.claw-canvas'), cx=clawCanvas.getContext('2d');
    const coinLabel=root.querySelector('[data-claw-coins]'), winLabel=root.querySelector('[data-claw-wins]');
    const collectionNode=root.querySelector('[data-claw-collection]'), notice=root.querySelector('[data-claw-notice]');
    const reward=root.querySelector('[data-claw-reward]'), gallery=root.querySelector('[data-claw-gallery-view]');
    const plushTypes=[
      {name:'BEAR',color:'#c69a70',size:25,weight:.13},
      {name:'BUNNY',color:'#d6c2d8',size:31,weight:.25},
      {name:'CAT',color:'#a7b7c6',size:37,weight:.43},
      {name:'DUCK',color:'#e5d38c',size:43,weight:.61},
      {name:'STAR',color:'#c2b9e2',size:49,weight:.80}
    ];
    // 난이도 조절: 숫자를 높일수록 더 쉽게 뽑힙니다.
    const CLAW_BALANCE = {
      grabBonus: 0.10,       // 처음 잡는 확률 보너스
      slipMultiplier: 0.55,  // 이동 중 미끄러짐 (작을수록 덜 미끄러짐)
      starGripBonus: 0.12,   // STAR만 추가로 잘 잡히게
      starSlipMultiplier: 0.65 // STAR 추가 미끄러짐 감소
    };
    let clawRaf=0,clawLast=0,clawX=430,clawY=105,clawState='ready',clawCoins=5,clawWins=0,clawHold=null,clawTime=0,clawMove=0,dropToy=null,dropY=0,dropV=0,grabQuality=0;
    let toys=[],collected={};
    try{collected=JSON.parse(localStorage.getItem('minihome_claw_collection')||'{}')||{}}catch(_){collected={}}
    function seedToys(){
      // Prize chute is x=62..178. Never place toys on or beside the chute.
      const positions=[[265,418],[350,415],[445,414],[548,416],[665,418],[305,355],[415,354],[520,352],[625,355],[385,292],[560,289]];
      toys=positions.map(([x,y],i)=>({x,y,kind:[0,1,2,3,4,1,0,3,2,4,0][i],won:false}));
    }
    function toyMarkup(kind){const t=plushTypes[kind];const ears=kind===1?'<ellipse cx="34" cy="19" rx="9" ry="23"/><ellipse cx="66" cy="19" rx="9" ry="23"/>':kind===0?'<circle cx="29" cy="34" r="13"/><circle cx="71" cy="34" r="13"/>':kind===2?'<path d="M23 44 L25 17 L43 34 L57 34 L75 17 L77 44Z"/>':'';return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${t.color}">${ears}<circle cx="50" cy="55" r="36"/></g><circle cx="39" cy="52" r="3.7" fill="#29323a"/><circle cx="61" cy="52" r="3.7" fill="#29323a"/><path d="M45 65 Q50 71 55 65" fill="none" stroke="#29323a" stroke-width="2.5" stroke-linecap="round"/>${kind===4?'<text x="50" y="83" font-size="20" text-anchor="middle" fill="#fff4cc">★</text>':''}</svg>`;}
    function updateCollection(){
      collectionNode.replaceChildren();
      plushTypes.forEach((t,i)=>{
        const count=collected[t.name]||0;
        const chip=document.createElement('div');chip.className='claw-collect-chip'+(count?'':' is-empty');
        chip.innerHTML=`<div class="claw-chip-art">${toyMarkup(i)}</div><span>${t.name}</span><b>×${count}</b>`;
        collectionNode.appendChild(chip);
      });
      root.querySelector('[data-claw-unique]').textContent=`${plushTypes.filter(t=>collected[t.name]).length} / 5`;
      coinLabel.textContent=clawCoins;winLabel.textContent=clawWins;
    }
    function showGallery(){const target=root.querySelector('[data-claw-gallery-items]');target.replaceChildren();plushTypes.forEach((t,i)=>{const n=collected[t.name]||0;const item=document.createElement('div');item.className='claw-gallery-item'+(n?'':' is-locked');item.innerHTML=`<div>${toyMarkup(i)}</div><strong>${n?t.name:'???'}</strong><span>${n?'OWNED ×'+n:'NOT FOUND'}</span>`;target.appendChild(item)});gallery.hidden=false;}
    function clawText(txt){notice.textContent=txt;}
    function openClaw(){asmrGame.stop();asmrView.hidden=true;back();select.hidden=true;clawView.hidden=false;reward.hidden=true;gallery.hidden=true;clawState='ready';clawX=430;clawY=105;clawHold=null;dropToy=null;clawTime=0;clawMove=0;clawCoins=5;clawWins=0;seedToys();updateCollection();clawText('← → 집게 이동 · SPACE 뽑기 · 코인 5개');clawLast=0;cancelAnimationFrame(clawRaf);clawRaf=requestAnimationFrame(clawLoop);}
    function backClaw(){clawView.hidden=true;reward.hidden=true;gallery.hidden=true;clawState='ready';clawMove=0;cancelAnimationFrame(clawRaf);clawRaf=0;select.hidden=false;}
    function clawDrop(){if(clawView.hidden||clawState!=='ready'||!reward.hidden||!gallery.hidden)return;if(clawCoins<=0){clawText('코인이 없습니다. 코인 충전을 눌러주세요.');return;}clawCoins--;updateCollection();clawState='down';clawHold=null;clawText('집게가 내려갑니다...');}
    function clawDrawToy(t,x,y,scale=1){
      const kind=t.kind, r=plushTypes[kind].size*scale;
      cx.save();cx.translate(x,y);cx.fillStyle=plushTypes[kind].color;
      if(kind===1){cx.beginPath();cx.ellipse(-r*.45,-r*1.15,r*.22,r*.66,-.12,0,Math.PI*2);cx.ellipse(r*.45,-r*1.15,r*.22,r*.66,.12,0,Math.PI*2);cx.fill();}
      if(kind===0){cx.beginPath();cx.arc(-r*.67,-r*.67,r*.36,0,Math.PI*2);cx.arc(r*.67,-r*.67,r*.36,0,Math.PI*2);cx.fill();}
      if(kind===2){cx.beginPath();cx.moveTo(-r*.8,-r*.2);cx.lineTo(-r*.8,-r*1.3);cx.lineTo(-r*.12,-r*.65);cx.lineTo(r*.12,-r*.65);cx.lineTo(r*.8,-r*1.3);cx.lineTo(r*.8,-r*.2);cx.fill();}
      cx.beginPath();cx.arc(0,-r*.18,r,0,Math.PI*2);cx.fill();
      if(kind===4){cx.fillStyle='#f3e8bc';cx.font=`${r*.95}px sans-serif`;cx.textAlign='center';cx.fillText('★',0,r*.55);}
      cx.fillStyle='#26303b';cx.beginPath();cx.arc(-r*.34,-r*.31,Math.max(2,r*.10),0,Math.PI*2);cx.arc(r*.34,-r*.31,Math.max(2,r*.10),0,Math.PI*2);cx.fill();cx.strokeStyle='#26303b';cx.lineWidth=2;cx.beginPath();cx.arc(0,r*.05,r*.18,0,Math.PI);cx.stroke();cx.restore();
    }
    function clawDraw(){const g=cx.createLinearGradient(0,0,0,500);g.addColorStop(0,'#243a4a');g.addColorStop(1,'#718c94');cx.fillStyle=g;cx.fillRect(0,0,800,500);
      cx.fillStyle='#182733';cx.fillRect(24,24,752,450);cx.fillStyle='#8eb0ba';cx.fillRect(48,48,704,380);cx.fillStyle='#a5c5c966';cx.fillRect(57,58,686,362);
      cx.fillStyle='#415d68';cx.fillRect(60,395,680,52);cx.fillStyle='#2c3c49';cx.fillRect(65,449,670,25);
      // Empty prize chute on the left; toys only appear to the right of x=235.
      cx.fillStyle='#121e28';cx.fillRect(62,355,128,92);cx.strokeStyle='#d8e2dc';cx.lineWidth=4;cx.strokeRect(62,355,128,92);cx.fillStyle='#e9eee9';cx.font='15px monospace';cx.fillText('PRIZE',97,383);
      toys.filter(t=>!t.won).forEach(t=>clawDrawToy(t,t.x,t.y));
      if(dropToy)clawDrawToy(dropToy,clawX,dropY,.85);
      cx.fillStyle='#d2dadd';cx.fillRect(85,65,630,10);cx.fillStyle='#e2ebeb';cx.fillRect(clawX-7,68,14,Math.max(0,clawY-68));cx.fillStyle='#e4e7e4';cx.fillRect(clawX-25,clawY-7,50,18);
      cx.strokeStyle='#e5e8e3';cx.lineWidth=7;cx.lineCap='round';cx.beginPath();cx.moveTo(clawX-18,clawY+8);cx.lineTo(clawX-31,clawY+35);cx.lineTo(clawX-16,clawY+47);cx.moveTo(clawX+18,clawY+8);cx.lineTo(clawX+31,clawY+35);cx.lineTo(clawX+16,clawY+47);cx.stroke();
      if(clawHold)clawDrawToy(clawHold,clawX,clawY+76,.85);
      cx.fillStyle='#eff4ef';cx.font='16px monospace';cx.fillText('CLAW MACHINE · 02',42,22);
    }
    function releaseGrip(){if(!clawHold)return;const t=clawHold;clawHold=null;t.won=false;t.x=Math.max(250,Math.min(690,clawX+(Math.random()-.5)*35));t.y=405;clawText('앗, 인형이 집게에서 미끄러졌어요!');}
    function showReward(kind){
      const t=plushTypes[kind];
      root.querySelector('[data-claw-reward-name]').textContent=t.name;
      root.querySelector('[data-claw-reward-desc]').textContent=`COLLECTION +1 · TOTAL ${collected[t.name]}`;
      // Render the same inline SVG used by the collection; no asynchronous image loading.
      const art=root.querySelector('[data-claw-reward-art]');
      art.innerHTML=toyMarkup(kind);
      reward.hidden=false;
    }
    // Stop at the first toy touched by the descending claw, not the nearest toy on the floor.
    function firstClawContact(previousTip, currentTip){
      const contacts=[];
      for(const toy of toys){
        if(toy.won)continue;
        const radius=plushTypes[toy.kind].size;
        const left=toy.x-radius*.88, right=toy.x+radius*.88;
        // The claw fingers have width, so off-center contact still blocks descent.
        if(clawX+18<left || clawX-18>right)continue;
        const top=toy.y-radius*(toy.kind===1?1.78:toy.kind===2?1.45:toy.kind===0?1.1:1.18);
        const bottom=toy.y+radius*.8;
        if(currentTip>=top && previousTip<=bottom)contacts.push({toy,top});
      }
      // Highest visible toy wins when multiple toys overlap the claw's path.
      contacts.sort((a,b)=>a.top-b.top);
      return contacts[0]?.toy||null;
    }
    function finishClawDescent(contact){
      clawState='up';
      if(!contact){clawText('집게가 인형에 닿지 않았어요.');return;}
      const radius=plushTypes[contact.kind].size;
      const offset=Math.abs(clawX-contact.x);
      // Touching an edge blocks the claw, but cannot pick up the toy beneath it.
      const centerTolerance=Math.min(18,radius*.38);
      if(offset>centerTolerance){clawText('중심을 놓쳤어요! 위쪽 인형에 걸렸습니다.');return;}
      grabQuality=1-offset/centerTolerance;
      const grabChance=Math.min(.95,Math.max(.12,(.84-plushTypes[contact.kind].weight*.62)*(.65+.35*grabQuality)+CLAW_BALANCE.grabBonus+(contact.kind===4?CLAW_BALANCE.starGripBonus:0)));
      if(Math.random()<grabChance){clawHold=contact;contact.won=true;clawText('인형을 잡았습니다!');}
      else clawText('인형에 닿았지만 집게가 미끄러졌어요.');
    }
    function clawLoop(ts){clawRaf=0;if(!root.isConnected||clawView.hidden)return;const dt=Math.min((ts-(clawLast||ts))/1000,.04);clawLast=ts;
      if(clawState==='ready')clawX=Math.max(250,Math.min(695,clawX+clawMove*dt*260));
      else if(clawState==='down'){
        const previousTip=clawY+47;
        clawY=Math.min(350,clawY+dt*240);
        const contact=firstClawContact(previousTip,clawY+47);
        if(contact){
          // Stop immediately when the claw reaches the top of the first toy.
          const radius=plushTypes[contact.kind].size;
          const top=contact.y-radius*(contact.kind===1?1.78:contact.kind===2?1.45:contact.kind===0?1.1:1.18);
          clawY=Math.min(clawY,Math.max(105,top-47));
          finishClawDescent(contact);
        }else if(clawY>=350){finishClawDescent(null);}
      }
      else if(clawState==='up'){clawY=Math.max(105,clawY-dt*240);if(clawHold&&Math.random()<dt*(.10+plushTypes[clawHold.kind].weight*.65+(1-grabQuality)*.5)*CLAW_BALANCE.slipMultiplier*(clawHold.kind===4?CLAW_BALANCE.starSlipMultiplier:1))releaseGrip();if(clawY<=105){clawState='carry';clawText(clawHold?'인형을 출구로 옮기는 중...':'아쉽게 놓쳤어요! 다시 도전하세요.')}}
      else if(clawState==='carry'){clawX=Math.max(126,clawX-dt*280);if(clawHold&&Math.random()<dt*(.12+plushTypes[clawHold.kind].weight*1.05+(1-grabQuality)*.7)*CLAW_BALANCE.slipMultiplier*(clawHold.kind===4?CLAW_BALANCE.starSlipMultiplier:1))releaseGrip();if(clawX<=126){clawState=clawHold?'fall':'release';clawTime=0;if(clawHold){dropToy=clawHold;clawHold=null;dropY=clawY+76;dropV=0;clawText('인형이 출구로 떨어집니다!')}}}
      else if(clawState==='fall'){dropV+=dt*950;dropY+=dropV*dt;if(dropY>=410){dropToy.won=true;const kind=dropToy.kind,t=plushTypes[kind];collected[t.name]=(collected[t.name]||0)+1;clawWins++;try{localStorage.setItem('minihome_claw_collection',JSON.stringify(collected))}catch(_){}window.dispatchEvent(new Event('minihome:claw-collection-changed'));updateCollection();clawText(`${t.name} 획득!`);showReward(kind);dropToy=null;clawState='ready';clawX=430;clawY=105;}}
      else if(clawState==='release'){clawTime+=dt;if(clawTime>.5){clawState='ready';clawX=430;clawY=105;}}
      clawDraw();clawRaf=requestAnimationFrame(clawLoop);
    }
    function clawKey(e){if(clawView.hidden)return;if(['ArrowLeft','ArrowRight','Space','Escape'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(!reward.hidden)reward.hidden=true;else if(!gallery.hidden)gallery.hidden=true;else backClaw();}else if(e.code==='Space'&&!e.repeat)clawDrop();else if(e.code==='ArrowLeft')clawMove=-1;else if(e.code==='ArrowRight')clawMove=1;}
    function clawKeyUp(e){if(clawView.hidden)return;if(['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();clawMove=0;}}
    function clawBind(selector,event,fn){const el=root.querySelector(selector);el.addEventListener(event,fn);return()=>el.removeEventListener(event,fn)}
    const clawUnbind=[clawBind('[data-claw-back]','click',backClaw),clawBind('[data-claw-drop]','click',clawDrop),clawBind('[data-claw-reset]','click',()=>{clawCoins=5;updateCollection();clawText('코인 5개를 충전했습니다.')}),clawBind('[data-claw-left]','pointerdown',e=>{e.preventDefault();clawMove=-1}),clawBind('[data-claw-right]','pointerdown',e=>{e.preventDefault();clawMove=1}),clawBind('[data-claw-gallery]','click',showGallery),clawBind('[data-claw-gallery-close]','click',()=>gallery.hidden=true),clawBind('[data-claw-reward-close]','click',()=>reward.hidden=true)];
    const stopMove=()=>{clawMove=0};window.addEventListener('pointerup',stopMove);window.addEventListener('pointercancel',stopMove);window.addEventListener('keydown',clawKey);window.addEventListener('keyup',clawKeyUp);

    const handlers=[];
    function bind(selector,event,fn){const el=root.querySelector(selector);el.addEventListener(event,fn);handlers.push(()=>el.removeEventListener(event,fn));}
    bind('[data-arcade-open="jump"]','click',open);
    bind('[data-arcade-open="asmr"]','click',()=>{back();backClaw();select.hidden=true;asmrView.hidden=false;asmrGame.start();});
    bind('[data-asmr-back]','click',()=>{asmrGame.stop();asmrView.hidden=true;select.hidden=false;});
    bind('[data-arcade-open="claw"]','click',openClaw);bind('[data-arcade-back]','click',back);bind('[data-arcade-start]','click',()=>state==='paused'?pause():start());bind('[data-arcade-pause]','click',pause);bind('[data-arcade-jump]','pointerdown',e=>{e.preventDefault();jump()});bind('canvas','pointerdown',e=>{e.preventDefault();jump()});
    function selectionKey(e){
      if (!play.hidden || !clawView.hidden || !asmrView.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
      if (['ArrowUp','ArrowDown'].includes(e.code)) {e.preventDefault();root.querySelector('[data-arcade-open]')?.focus();}
      if (e.code === 'Enter' && !['BUTTON','A'].includes(document.activeElement?.tagName)) {e.preventDefault();open();}
    }
    window.addEventListener('keydown',key);
    window.addEventListener('keydown',selectionKey);
    dispose=()=>{asmrGame.destroy();cancelAnimationFrame(clawRaf);cancelAnimationFrame(raf);clawUnbind.forEach(fn=>fn());window.removeEventListener('pointerup',stopMove);window.removeEventListener('pointercancel',stopMove);window.removeEventListener('keydown',clawKey);window.removeEventListener('keyup',clawKeyUp);window.removeEventListener('keydown',key);window.removeEventListener('keydown',selectionKey);handlers.forEach(fn=>fn());};
  }
  const observer = new MutationObserver(() => {
    if (host.querySelector('.arcade-root')) return;
    if (new URLSearchParams(location.hash.slice(1)).get('page') === 'game') mount();
    else if(dispose){dispose();dispose=null;}
  });
  observer.observe(host,{childList:true});
  if(new URLSearchParams(location.hash.slice(1)).get('page')==='game')mount();
})();
