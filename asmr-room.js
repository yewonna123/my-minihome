/* Third mini-game: 2D room selector and 3D stepping ASMR rooms. */
window.createMiniAsmrRoom = function(root, view) {
  const status=view.querySelector('[data-asmr-status]');
  const select=view.querySelector('[data-asmr-select]');
  const stage=view.querySelector('[data-asmr-stage]');
  const holder=view.querySelector('[data-asmr-three]');
  const muteBtn=view.querySelector('[data-asmr-mute]');
  const names=['도각 키보드','클릭축','왁뿌','서걱 눈길','오도독 스위치'];
  const colors=[0xb9e5d9,0xe0cff0,0xa8d2b7,0xe0eaf3,0xd8c6a6];
  let muted=false, active=false, room=-1, three=null, scene, camera, renderer, avatar, tiles=[], raf=0, last=0, audio=null;
  const keys=new Set(), pos={x:0,z:0};
  const keyboardFiles = Array.from({length:7}, (_,i)=>new URL(`assets/audio/asmr/asmr-keyboard-${i+1}.wav`, document.baseURI).href);
  let keyboardBuffers = [];
  const odokFiles = [2,3,4,5,6,7].map(i=>new URL(`assets/audio/asmr/asmr-odok-${i}.mp3`, document.baseURI).href);
  const clickFiles = [1,2,3,4,5].map(i=>new URL(`assets/audio/asmr/asmr-click-${i}.mp3`, document.baseURI).href);
  let clickBuffers = [];
  let loadingClick = null;
  function loadClickSounds(){
    if(loadingClick)return loadingClick;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    loadingClick=Promise.all(clickFiles.map(async url=>{
      try {const res=await fetch(url);if(!res.ok)throw Error('audio missing');return await audio.decodeAudioData(await res.arrayBuffer());}
      catch(e){console.warn('ASMR click load failed:',url,e);return null;}
    })).then(buffers=>(clickBuffers=buffers));
    return loadingClick;
  }
  // Temporary wax-room samples; keep original MP3 audio unchanged.
  const waxFiles = [1,2,3,4,5].map(i=>new URL(`assets/audio/asmr/asmr-wax-${i}.mp3`, document.baseURI).href);
  let waxBuffers = [], loadingWax = null;
  function loadWaxSounds(){
    if(loadingWax)return loadingWax;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    loadingWax=Promise.all(waxFiles.map(async url=>{
      try {const res=await fetch(url);if(!res.ok)throw Error('audio missing');return await audio.decodeAudioData(await res.arrayBuffer());}
      catch(e){console.warn('ASMR wax load failed:',url,e);return null;}
    })).then(buffers=>(waxBuffers=buffers));
    return loadingWax;
  }
  let odokBuffers = [];
  let loadingOdok = null;
  function loadOdokSounds(){
    if(loadingOdok)return loadingOdok;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    loadingOdok = Promise.all(odokFiles.map(async url=>{
      try {const res=await fetch(url);if(!res.ok)throw Error('audio missing');return await audio.decodeAudioData(await res.arrayBuffer());}
      catch(e){console.warn('ASMR odok load failed:',url,e);return null;}
    })).then(buffers=>(odokBuffers=buffers));
    return loadingOdok;
  }
  let loadingSounds = null;
  function loadKeyboardSounds(){
    if(loadingSounds)return loadingSounds;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    loadingSounds = Promise.all(keyboardFiles.map(async url=>{
      try { const res=await fetch(url);if(!res.ok)throw Error('audio missing');return await audio.decodeAudioData(await res.arrayBuffer()); }
      catch(e){console.warn('ASMR audio load failed:',url,e);return null;}
    })).then(buffers=>(keyboardBuffers=buffers));
    return loadingSounds;
  }
  function sound(tileIndex=0){
    if(muted)return;
    if(room===0||room===1||room===2||room===4){
      const isOdok=room===4;
      const buffers=isOdok?odokBuffers:(room===2?waxBuffers:(room===1?clickBuffers:keyboardBuffers));
      if(!buffers.length){(isOdok?loadOdokSounds:(room===2?loadWaxSounds:(room===1?loadClickSounds:loadKeyboardSounds)))();return;}
      const buffer=buffers[tileIndex%buffers.length];
      if(!buffer)return;
      if(audio.state==='suspended')audio.resume();
      const src=audio.createBufferSource(),gain=audio.createGain();
      src.buffer=buffer;
      gain.gain.value=(isOdok||room===1||room===2)?1:.46;
      src.connect(gain).connect(audio.destination);
      src.start();src.onended=()=>{src.disconnect();gain.disconnect()};
      return;
    }
    try{
      audio??=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume();
      const t=audio.currentTime, osc=audio.createOscillator(), gain=audio.createGain();
      const hz=[320,720,175,420][room];
      osc.type=room===1?'square':room===2?'triangle':'sine';
      osc.frequency.setValueAtTime(hz*(.95+Math.random()*.1),t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(65,hz*.5),t+.085);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.09,t+.005);
      gain.gain.exponentialRampToValueAtTime(.0001,t+.12);
      osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.13);
    }catch(e){}
  }
  function cleanScene(){cancelAnimationFrame(raf);raf=0;tiles=[];if(scene){scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}})}renderer?.dispose();renderer?.domElement.remove();renderer=null;scene=null;avatar=null;}
  async function enter(index){
    room=index;select.hidden=true;stage.hidden=false;status.textContent=names[room]+' · WASD로 이동';
    if(!three){try{three=await import('three')}catch(e){status.textContent='3D 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.';return}}
    if(!active||room!==index)return;
    if(room===0)loadKeyboardSounds();
    if(room===1)loadClickSounds();
    if(room===2)loadWaxSounds();
    if(room===4)loadOdokSounds();
    cleanScene();const T=three;
    scene=new T.Scene();scene.background=new T.Color(0xf8eef1);
    camera=new T.PerspectiveCamera(48,1,.1,100);camera.position.set(0,8,11);camera.lookAt(0,0,0);
    renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    holder.appendChild(renderer.domElement);
    scene.add(new T.HemisphereLight(0xffffff,0x9c8990,2.3));
    const light=new T.DirectionalLight(0xffffff,2);light.position.set(-4,9,6);scene.add(light);
    const base=new T.Mesh(new T.BoxGeometry(11,.3,11),new T.MeshStandardMaterial({color:0xf5e9e2}));base.position.y=-.25;scene.add(base);
    const wallMat=new T.MeshStandardMaterial({color:0xf5dce7,side:T.DoubleSide});
    for(const [x,z,w,d] of [[-5.5,0,.18,11],[5.5,0,.18,11],[0,-5.5,11,.18]]){
      const wall=new T.Mesh(new T.BoxGeometry(w,2.2,d),wallMat);wall.position.set(x,1,z);scene.add(wall);
    }
    const geometry=new T.BoxGeometry(.88,.32,.88);
    const mat=new T.MeshStandardMaterial({color:colors[room],roughness:room===4?.43:.66});
    const side=new T.MeshStandardMaterial({color:0xb8a7b1});
    for(let row=0;row<10;row++)for(let col=0;col<10;col++){
      const x=(col-4.5)*1.02,z=(row-4.5)*1.02;
      const pedestal=new T.Mesh(geometry,side);pedestal.position.set(x,.02,z);scene.add(pedestal);
      const cap=new T.Mesh(geometry,mat);cap.position.set(x,.19,z);scene.add(cap);
      tiles.push({x,z,cap,down:false,soundIndex:room===2?(row*2+col*3)%waxFiles.length:(row*10+col)%(room===4?odokFiles.length:(room===1?clickFiles.length:7))});
    }
    avatar=new T.Group();const body=new T.Mesh(new T.SphereGeometry(.31,16,12),new T.MeshStandardMaterial({color:0xffa9bf}));body.position.y=.72;avatar.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.23,16,12),new T.MeshStandardMaterial({color:0xffd3b9}));head.position.y=1.12;avatar.add(head);scene.add(avatar);
    pos.x=0;pos.z=0;last=0;
    function frame(now){if(!active||room!==index||!renderer)return;const dt=Math.min((now-(last||now))/1000,.04);last=now;
      let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
      let dz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
      const len=Math.hypot(dx,dz)||1;pos.x=Math.max(-4.9,Math.min(4.9,pos.x+dx/len*5.2*dt));pos.z=Math.max(-4.9,Math.min(4.9,pos.z+dz/len*5.2*dt));
      avatar.position.set(pos.x,0,pos.z);
      for(const tile of tiles){
        // Circle (avatar's foot area) against each square keycap independently.
        // Allows two adjacent keys to be pressed at the same time when straddled.
        const footRadius=.36, halfKey=.44;
        const nearestX=Math.max(tile.x-halfKey,Math.min(pos.x,tile.x+halfKey));
        const nearestZ=Math.max(tile.z-halfKey,Math.min(pos.z,tile.z+halfKey));
        const hit=(pos.x-nearestX)**2+(pos.z-nearestZ)**2<footRadius**2;
        if(hit&&!tile.down){sound(tile.soundIndex);status.textContent=names[room]+' · 눌림!'}
        tile.down=hit;const target=hit?.065:.19;tile.cap.position.y+=(target-tile.cap.position.y)*Math.min(1,dt*18);
      }
      const w=holder.clientWidth||720,h=holder.clientHeight||420;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(pos.x,8,pos.z+11);camera.lookAt(pos.x,0,pos.z);camera.updateProjectionMatrix();renderer.render(scene,camera);raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);
  }
  function start(){active=true;room=-1;select.hidden=false;stage.hidden=true;status.textContent='방을 선택해 주세요 ♡'}
  function backRoom(){resetTouch();room=-1;cleanScene();stage.hidden=true;select.hidden=false;status.textContent='방을 선택해 주세요 ♡';keys.clear()}
  function stop(){resetTouch();active=false;room=-1;keys.clear();cleanScene()}
  function down(e){if(!active||room<0||e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}else if(k==='escape'){e.preventDefault();backRoom()}}
  function up(e){keys.delete(e.key.toLowerCase())}
  const touchButtons=[...view.querySelectorAll('[data-asmr-direction]')];
  const touchCleanup=[];
  touchButtons.forEach(button=>{
    const key=button.dataset.asmrDirection;
    const pointers=new Set();
    const release=()=>{pointers.clear();keys.delete(key);button.classList.remove('is-pressed')};
    const onDown=e=>{
      if(!active||room<0)return;
      e.preventDefault();
      pointers.add(e.pointerId);
      button.setPointerCapture?.(e.pointerId);
      keys.add(key);
      button.classList.add('is-pressed');
    };
    const onUp=e=>{pointers.delete(e.pointerId);if(!pointers.size){keys.delete(key);button.classList.remove('is-pressed')}};
    button.addEventListener('pointerdown',onDown);
    button.addEventListener('pointerup',onUp);
    button.addEventListener('pointercancel',onUp);
    button.addEventListener('lostpointercapture',onUp);
    touchCleanup.push(()=>{release();button.removeEventListener('pointerdown',onDown);button.removeEventListener('pointerup',onUp);button.removeEventListener('pointercancel',onUp);button.removeEventListener('lostpointercapture',onUp)});
  });
  const resetTouch=()=>touchButtons.forEach(button=>{keys.delete(button.dataset.asmrDirection);button.classList.remove('is-pressed')});
  const blur=()=>keys.clear();const mute=()=>{muted=!muted;muteBtn.textContent=muted?'🔇 소리 꺼짐':'🔊 소리 켜짐'};
  const buttons=[...view.querySelectorAll('[data-asmr-room]')];buttons.forEach(b=>b.addEventListener('click',()=>enter(Number(b.dataset.asmrRoom))));
  const back=view.querySelector('[data-asmr-room-back]');back.addEventListener('click',backRoom);muteBtn.addEventListener('click',mute);
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  return {start,stop,destroy(){stop();touchCleanup.forEach(fn=>fn());buttons.forEach(b=>b.replaceWith(b.cloneNode(true)));back.removeEventListener('click',backRoom);muteBtn.removeEventListener('click',mute);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);audio?.close()}};
};
