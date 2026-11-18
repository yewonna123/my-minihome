import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const content = document.getElementById('content');
let cleanup = null;
function setup(stage){
  const status=document.getElementById('room3d-status');
  const statusPreviousStyle=status?.getAttribute('style');
  if(status){status.style.position='absolute';status.style.width='1px';status.style.height='1px';status.style.padding='0';status.style.margin='-1px';status.style.overflow='hidden';status.style.clipPath='inset(50%)';status.style.whiteSpace='nowrap';}
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xF6D4E7);
  // Theme selection is local to each visitor's browser.
  const THEME_KEY='my-minihome-room-theme-v1';
  const HOME_KEY='my-minihome-site-theme-v1';
  const readTheme=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
  let roomThemeChoice=readTheme(THEME_KEY,'auto');
  if(!['auto','strawberry','mint'].includes(roomThemeChoice))roomThemeChoice='auto';
  const effectiveTheme=()=>roomThemeChoice==='auto'?(readTheme(HOME_KEY,'strawberry')==='mint'?'mint':'strawberry'):roomThemeChoice;
  const themeMeshes=[];
  // Match the original exported C4D material RGB values. Leave neutral wood,
  // the rug, plants, character customization and lights untouched.
  const mintPalette={
    '0.770,0.277,0.433':'#43AFA1', // pink curtains and accents
    '0.952,0.701,0.780':'#B4E6DA', // pale pink bedding
    '0.770,0.447,0.549':'#A7D5CA', // pale pink wall
    '0.670,0.174,0.224':'#6C9F8D', // dark pink detail
    '1.000,0.568,0.460':'#A67B64', // warm mushroom top -> milk chocolate
    '0.493,0.796,0.796':'#704D40', // mirror frame -> dark chocolate
  };
  const originalColors=new Map();
  function trackThemeMaterials(root){
    root.traverse(node=>{
      if(!node.isMesh||node.userData.markerCube)return;
      // Never recolor the avatar or meshes outside the exported furniture.
      const original=node.material;
      if(!original)return;
      const copies=(Array.isArray(original)?original:[original]).map(mat=>{
        const copy=mat.clone();
        if(mat.color){
          const key=[mat.color.r,mat.color.g,mat.color.b].map(n=>n.toFixed(3)).join(',');
          originalColors.set(copy,{color:mat.color.clone(),mint:mintPalette[key]||null});
        }
        return copy;
      });
      node.material=Array.isArray(original)?copies:copies[0];
      themeMeshes.push(...copies);
    });
    applyRoomTheme();
  }
  function applyRoomTheme(){
    const mint=effectiveTheme()==='mint';
    for(const mat of themeMeshes){
      const state=originalColors.get(mat);
      if(!state)continue;
      mat.color.copy(mint&&state.mint?new THREE.Color(state.mint):state.color);
    }
    scene.background.set(mint?0xD5EDE4:0xF6D4E7);
    stage.dataset.roomTheme=effectiveTheme();
  }
  const themeBar=document.createElement('div');
  themeBar.className='room-theme-bar';
  themeBar.innerHTML='<label for="room-theme-choice">🎨 미니룸 테마</label><select id="room-theme-choice" aria-label="미니룸 테마"><option value="auto">홈페이지 따라가기</option><option value="strawberry">🍓 딸기초코</option><option value="mint">🌿 민트초코</option></select>';
  stage.parentElement.insertBefore(themeBar,stage);
  const themeSelect=themeBar.querySelector('select');
  themeSelect.value=roomThemeChoice;
  function onRoomThemeChange(){roomThemeChoice=themeSelect.value;try{localStorage.setItem(THEME_KEY,roomThemeChoice)}catch{}applyRoomTheme()}
  themeSelect.addEventListener('change',onRoomThemeChange);
  const onSiteThemeChange=()=>applyRoomTheme();
  window.addEventListener('minihome:site-theme-changed',onSiteThemeChange);

  const cameraRig=new THREE.Group();scene.add(cameraRig);cameraRig.scale.setScalar(1/3);
  const camera=new THREE.PerspectiveCamera(35,1,.01,100);cameraRig.add(camera);camera.position.set(8,7.2,9);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;
  controls.target.set(0,0.5,0);controls.minDistance=5;controls.maxDistance=17;
  controls.maxPolarAngle=Math.PI/2.04;controls.minPolarAngle=.35;controls.enablePan=false;controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0xD5A0BD,2.4));
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-3,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;scene.add(sun);
  const room=new THREE.Group();scene.add(room);room.scale.setScalar(1/3);
  // C4D objects are rendered at their original world dimensions.
  // Only the legacy procedural room is converted from 6 units to the 2-unit C4D floor.
  const c4d=new THREE.Group();scene.add(c4d);
  // The only room geometry comes from the three exported C4D files.
  let c4dBed=null,c4dDesk=null,c4dFrame=null,c4dMirror=null;
  const bedFootprint={minX:-2.77,maxX:1,maxZ:.04,minZ:-2.78};
  let bedSleep={x:.15,y:1.10,z:-1.50,rotation:Math.PI/2};
  const chair=new THREE.Group(); // coordinate fallback only; never rendered
  chair.position.set(-1.37,0,1.34);
  chair.rotation.y=Math.PI/2;
  // Unified C4D scene. Keep its original scale, positions, and rotations.
  let unifiedRoom=null, separateMirror=null, separateToybox=null;
  const roomParts=new Map();
  const part=(name)=>roomParts.get(loadedName(name))||null;
  const worldLegacy=(node)=>node.getWorldPosition(new THREE.Vector3()).multiplyScalar(3);
  const marker=(group,name)=>group?.getObjectByName(loadedName(name))||null;
  let curtainProgress=0,curtainTarget=0,curtainLeft=null,curtainRight=null;
  const curtainRest=new Map();
  // 0 = closed (wider than exported mesh), 1 = gathered open.
  const CURTAIN_CLOSED_WIDTH=1.35; // Increase to cover more window
  const CURTAIN_OPEN_WIDTH=.35;
  let boxLid=null,boxLidY=0,boxLidProgress=0,boxLidTarget=0;
  let lampLight=null, lampOn=false;
  const interactionNames=new Set(['침대','침대서랍','침대조명','.거울','책상','노트북','커피','컵케이크','의자','액자','천장 선반','창문','커텐 1','커텐 2','인형상자']);
  // GLTFLoader sanitizes node names: spaces -> underscores, dots removed.
  // Keep the C4D labels for UI and click actions; normalize only lookups.
  const loadedName=name=>THREE.PropertyBinding.sanitizeNodeName(name);
  const originalNameByLoaded=new Map([...interactionNames].map(name=>[loadedName(name),name]));
  const labelFor=name=>originalNameByLoaded.get(name)||name;
  const loader=new GLTFLoader();
  // One interaction registry for all three GLTF assets. Hitboxes follow their
  // corresponding mesh every frame, so moving parts remain clickable.
  const interactiveRoots=[];
  function registerRoot(group){
    if(!group||interactiveRoots.includes(group))return;
    interactiveRoots.push(group);
    group.traverse(node=>{
      if(!node.isMesh||node.userData.markerCube)return;
      let parent=node;
      while(parent&&parent!==group){
        if(parent.name.includes('위치')||parent.name.includes('바라볼곳'))return;
        parent=parent.parent;
      }
      node.userData.interactionGroup=group;
    });
  }
  // A projected mesh footprint is used only for the two difficult-to-hit
  // objects, not as an extra invisible 3D box that can block other clicks.
  function projectedHit(group,point,padding=9){
    if(!group)return null;
    group.updateWorldMatrix(true,true);
    camera.updateMatrixWorld(true);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    let found=false;
    group.traverse(node=>{
      if(!node.isMesh||node.userData.markerCube||!node.visible)return;
      const box=new THREE.Box3().setFromObject(node);
      if(box.isEmpty())return;
      for(const x of [box.min.x,box.max.x])
      for(const y of [box.min.y,box.max.y])
      for(const z of [box.min.z,box.max.z]){
        const q=new THREE.Vector3(x,y,z).project(camera);
        if(q.z < -1 || q.z > 1)continue;
        found=true;
        minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);
        minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y);
      }
    });
    if(!found)return null;
    const rect=renderer.domElement.getBoundingClientRect();
    const px=padding*2/rect.width,py=padding*2/rect.height;
    if(point.x<minX-px||point.x>maxX+px||point.y<minY-py||point.y>maxY+py)return null;
    return {area:(maxX-minX+px*2)*(maxY-minY+py*2),centerDistance:(point.x-(minX+maxX)/2)**2+(point.y-(minY+maxY)/2)**2};
  }
  function prepareMarkers(group){
    group.traverse(node=>{
      if(node.isMesh){node.castShadow=true;node.receiveShadow=true}
      if(node.name.includes('위치')||node.name.includes('바라볼곳')){
        node.traverse(child=>{if(child.isMesh){child.visible=false;child.userData.markerCube=true}});
      }
    });
  }
  function loadSeparate(url,kind){
    loader.load(url,gltf=>{
      if(disposed)return;
      const model=gltf.scene;
      c4d.add(model);
      model.updateMatrixWorld(true);
      prepareMarkers(model);
      if(kind==='mirror')trackThemeMaterials(model);
      const rootName=loadedName(kind==='mirror'?'.거울':'인형상자');
      const root=model.children.find(n=>n.name===rootName)||model.getObjectByName(rootName);
      if(!root){console.error('[miniroom] Missing root in',url);return}
      if(kind==='mirror'){
        separateMirror=model;c4dMirror=root;
      }else{
        separateToybox=model;
        boxLid=root.children.find(n=>n.name.includes('뚜껑'))||null;
        if(boxLid)boxLidY=boxLid.position.y;
      }
      registerRoot(root);
      if(kind==='mirror')root.traverse(mesh=>{
        if(mesh.isMesh&&!mesh.userData.markerCube)mesh.userData.interactionGroup=root;
      });
      console.info('[miniroom] loaded',kind,root.name,'meshes',root.getObjectByProperty('isMesh',true)?.name||'none');
    },undefined,e=>console.error('[miniroom] Failed loading '+url,e));
  }
  loader.load('assets/models/miniroom.gltf',gltf=>{
    if(disposed)return;
    unifiedRoom=gltf.scene;c4d.add(unifiedRoom);
    for(const child of unifiedRoom.children){if(child.name)roomParts.set(child.name,child)}
    unifiedRoom.updateMatrixWorld(true);
    prepareMarkers(unifiedRoom);
    trackThemeMaterials(unifiedRoom);
    const floorGroup=part('벽&바닥');
    const floorNode=marker(floorGroup,'바닥');
    floorPlanks=[];
    for(const name of ['Cloner','Cloner.1']){
      const planks=marker(floorNode,name);
      if(planks)floorPlanks.push(planks);
    }
    floorNode?.updateWorldMatrix(true,true);
    if(!floorPlanks.length)console.warn('[miniroom] Wooden floor plank groups not found');
    updateWoodFloorHeight();
    syncFloorHeight();
    c4dBed=part('침대');c4dDesk=part('책상');c4dFrame=part('액자');
    curtainLeft=part('커텐 1');curtainRight=part('커텐 2');
    for(const curtain of [curtainLeft,curtainRight]){
      if(curtain)curtainRest.set(curtain,{position:curtain.position.clone(),scale:curtain.scale.clone()});
    }
    for(const [name,group] of roomParts){const label=labelFor(name);if(interactionNames.has(label)&&label!=='.거울'&&label!=='인형상자')registerRoot(group)}
    const bedPoint=marker(c4dBed,'침대 누울 위치');
    if(bedPoint){
      const p=worldLegacy(bedPoint);
      // The Null anchors the character's root, but after lying down the head
      // extends toward the bookshelf (-X). Move the root toward the foot (+X).
      // Keep the original working rotation and vertical position unchanged.
      bedSleep={x:p.x+0.8,y:p.y+0.05,z:p.z,rotation:Math.PI/2};
    }
    if(c4dBed){const b=new THREE.Box3().setFromObject(c4dBed);
      bedFootprint.minX=b.min.x*3;bedFootprint.maxX=b.max.x*3;
      bedFootprint.minZ=b.min.z*3;bedFootprint.maxZ=b.max.z*3;
    }
    status.textContent='미니룸을 불러왔어요 ♡';
  },undefined,e=>console.error('통합 미니룸 GLTF 로딩 실패',e));
  loadSeparate('assets/models/mirror.gltf','mirror');
  loadSeparate('assets/models/toybox.gltf','toybox');
  function markerCamera(group, cameraName, targetName){
    // Use only the camera/aim Nulls exported in miniroom.gltf.
    // Never silently substitute the old hand-written camera coordinates.
    if(!group){console.error('[miniroom] Camera group missing:',cameraName);return null}
    group.updateWorldMatrix(true,true);
    const cam=marker(group,cameraName),aim=marker(group,targetName);
    if(!cam||!aim){
      console.error('[miniroom] Camera Null missing:',{group:group.name,cameraName,targetName,foundCamera:!!cam,foundTarget:!!aim});
      return null;
    }
    cam.updateWorldMatrix(true,false);
    aim.updateWorldMatrix(true,false);
    // The camera is parented under cameraRig(scale=1/3), but OrbitControls.target
    // is a WORLD-space point. Only the camera local position needs the 3x conversion.
    const position=worldLegacy(cam),target=aim.getWorldPosition(new THREE.Vector3());
    console.info('[miniroom] Using C4D camera Nulls:',cameraName,position.toArray(),targetName,target.toArray());
    return {position,target};
  }
  function toggleInventory(){panel.hidden=!panel.hidden;refreshInventory();boxLidTarget=panel.hidden?0:1}
  function toggleCurtains(){curtainTarget=curtainTarget?0:1;status.textContent=curtainTarget?'커튼을 열었어요 ♡':'커튼을 닫았어요 ♡'}
  // Mushroom lamp on the ceiling shelf: independent of the bedside lamp.
  let mushroomLight=null,mushroomOn=false;
  const mushroomMaterials=[];
  function toggleMushroomLamp(){
    const shelf=part('천장 선반');
    const mushroom=marker(shelf,'버섯 램프');
    if(!mushroom){
      console.warn('[miniroom] 버섯 램프를 찾지 못했어요');
      status.textContent='버섯 램프를 찾지 못했어요';
      return;
    }
    if(!mushroomLight){
      mushroom.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3().setFromObject(mushroom);
      const center=bounds.getCenter(new THREE.Vector3());
      center.y=bounds.max.y+.035;
      mushroom.worldToLocal(center);
      mushroomLight=new THREE.PointLight(0xffc987,0,2.3,2);
      mushroomLight.position.copy(center);
      mushroom.add(mushroomLight);
      mushroom.traverse(obj=>{
        if(!obj.isMesh)return;
        const original=obj.material;
        const mats=Array.isArray(original)?original:[original];
        const clones=mats.map(mat=>mat.clone());
        obj.material=Array.isArray(original)?clones:clones[0];
        for(const mat of clones){
          if(!mat.emissive)continue;
          mushroomMaterials.push({material:mat,color:mat.emissive.clone(),intensity:mat.emissiveIntensity});
        }
      });
    }
    mushroomOn=!mushroomOn;
    mushroomLight.intensity=mushroomOn?0.5:0;
    for(const entry of mushroomMaterials){
      entry.material.emissive.copy(mushroomOn?new THREE.Color(0xffbd70):entry.color);
      entry.material.emissiveIntensity=mushroomOn?.3:entry.intensity;
    }
    status.textContent=mushroomOn?'버섯 램프를 켰어요 ♡':'버섯 램프를 껐어요 ♡';
  }

  function toggleLamp(){lampOn=!lampOn;
    if(lampOn&&!lampLight&&part('침대조명')){lampLight=new THREE.PointLight(0xffd7a0,1.8,2.3);part('침대조명').add(lampLight)}
    if(lampLight)lampLight.visible=lampOn;
    status.textContent=lampOn?'조명을 켰어요 ♡':'조명을 껐어요 ♡';
  }
  // Claw-machine collection unlocks one placeable 3D toy per type.
  const toyTypes=[
    {name:'BEAR',color:0xc69a70,kind:'bear'},
    {name:'BUNNY',color:0xd6c2d8,kind:'bunny'},
    {name:'CAT',color:0xa7b7c6,kind:'cat'},
    {name:'DUCK',color:0xe5d38c,kind:'duck'},
    {name:'STAR',color:0xc2b9e2,kind:'star'}
  ];
  const inventoryStyle=document.createElement('style');
  inventoryStyle.textContent=`
    .room-toy-inventory{position:absolute;z-index:12;right:9px;bottom:9px;width:min(232px,calc(100% - 18px));font-family:inherit;color:#493036;font-size:12px}
    .room-toy-close{cursor:pointer;background:#f6d4e7;border:1px solid #b98aa0;border-radius:5px;color:#493036}
    .room-toy-panel{margin-top:5px;background:#fff9fced;border:2px solid #b98aa0;border-radius:10px;padding:10px;box-shadow:0 5px 15px #49303633;max-height:min(265px,65vh);overflow:auto}
    .room-toy-panel[hidden]{display:none}
    .room-toy-heading{display:flex;justify-content:space-between;gap:6px;align-items:center;font-weight:700;margin-bottom:7px}
    .room-toy-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
    .room-toy-item{border:1px solid #d8b5c4;background:#fff;border-radius:7px;min-width:0;min-height:47px;padding:3px 1px;cursor:pointer;font:inherit;color:#493036;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
    .room-toy-item:disabled{opacity:.43;cursor:not-allowed}
    .room-toy-item.is-selected{outline:2px solid #a74b7d;background:#ffe2ef}
    .room-toy-item.is-placed{background:#f2e8ef}
    .room-toy-item span{font-size:18px;line-height:1.2}.room-toy-item small{font-size:8px;line-height:1.1}
    .room-toy-help{margin:8px 0 0;line-height:1.5;font-size:10px;color:#755569}
  `;
  document.head.appendChild(inventoryStyle);
  const inventory=document.createElement('div');inventory.className='room-toy-inventory';
  inventory.innerHTML=`<div class="room-toy-panel" hidden><div class="room-toy-heading"><span>MY PLUSHIES ♡</span><button type="button" class="room-toy-close" aria-label="인형 인벤토리 닫기">✕</button><span data-toy-count>0 / 5</span></div><div class="room-toy-grid" data-toy-grid></div><p class="room-toy-help" data-toy-help>인형뽑기에서 획득하면 해금돼요 ♡</p></div>`;
  stage.appendChild(inventory);
  const panel=inventory.querySelector('.room-toy-panel'),grid=inventory.querySelector('[data-toy-grid]'),help=inventory.querySelector('[data-toy-help]');
  inventory.querySelector('.room-toy-close').addEventListener('click',()=>{panel.hidden=true;boxLidTarget=0});
  const toyIcons=['🧸','🐰','🐱','🐤','⭐'];
  function ownedToys(){try{const data=JSON.parse(localStorage.getItem('minihome_claw_collection')||'{}');return data&&typeof data==='object'?data:{}}catch(_){return {}}}
  const toyPositions=(()=>{try{const data=JSON.parse(localStorage.getItem('minihome_room_toy_positions')||'{}');return data&&typeof data==='object'?data:{}}catch(_){return {}}})();
  const toyMeshes=new Map();let selectedToy=null;let toyDragging=null;
  const toyMaterial=(color)=>new THREE.MeshStandardMaterial({color,roughness:.88});
  function toyBall(group,r,color,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),toyMaterial(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;group.add(mesh);return mesh}
  function createToy(type){
    const g=new THREE.Group(),c=type.color;
    toyBall(g,.24,c,0,.32,0,1,1.12,.82);
    if(type.kind==='bear'||type.kind==='cat'||type.kind==='bunny'){
      if(type.kind==='bunny'){toyBall(g,.09,c,-.16,.62,0,.8,2.3,.8);toyBall(g,.09,c,.16,.62,0,.8,2.3,.8)}
      else if(type.kind==='bear'){toyBall(g,.105,c,-.18,.52,0);toyBall(g,.105,c,.18,.52,0)}
      else{const cone=new THREE.ConeGeometry(.115,.23,4);for(const x of [-.16,.16]){const ear=new THREE.Mesh(cone,toyMaterial(c));ear.position.set(x,.57,0);ear.rotation.y=Math.PI/4;g.add(ear)}}
    }else if(type.kind==='duck'){toyBall(g,.12,0xffc876,0,.30,.225,1,.65,.8)}
    else{const star=new THREE.Mesh(new THREE.IcosahedronGeometry(.23,0),toyMaterial(0xf9e4a6));star.position.set(0,.34,.06);g.add(star)}
    for(const x of [-.085,.085])toyBall(g,.022,0x3c3038,x,.36,.208);
    toyBall(g,.022,0xe8a4ae,0,.285,.226,1.1,.65,.7);
    toyBall(g,.11,c,-.15,.105,.035,.75,.8,1);toyBall(g,.11,c,.15,.105,.035,.75,.8,1);
    g.userData.toyName=type.name;
    return g;
  }
  function saveToys(){try{localStorage.setItem('minihome_room_toy_positions',JSON.stringify(toyPositions))}catch(_){}}
  function removeToy(name){const mesh=toyMeshes.get(name);if(mesh){room.remove(mesh);toyMeshes.delete(name)}delete toyPositions[name];if(selectedToy===name)selectedToy=null;saveToys();refreshInventory()}
  function placeToy(name,x,z,y=.025){if(!ownedToys()[name])return;let mesh=toyMeshes.get(name);if(!mesh){mesh=createToy(toyTypes.find(t=>t.name===name));room.add(mesh);toyMeshes.set(name,mesh)}mesh.position.set(THREE.MathUtils.clamp(x,-2.55,2.55),.025,THREE.MathUtils.clamp(z,-2.55,2.55));mesh.position.y=y<.15?floorHeight(mesh.position.x,mesh.position.z)+.025:y;toyPositions[name]=[mesh.position.x,mesh.position.z,mesh.position.y];selectedToy=null;saveToys();refreshInventory();status.textContent=name+' 인형을 배치했어요 ♡'}
  function refreshInventory(){
    const owned=ownedToys();grid.replaceChildren();inventory.querySelector('[data-toy-count]').textContent=toyTypes.filter(t=>Number(owned[t.name])>0).length+' / 5';
    toyTypes.forEach((t,i)=>{const unlocked=Number(owned[t.name])>0,placed=toyMeshes.has(t.name),button=document.createElement('button');button.type='button';button.className='room-toy-item'+(selectedToy===t.name?' is-selected':'')+(placed?' is-placed':'');button.disabled=!unlocked;button.title=unlocked?(placed?'배치 중 · 클릭하여 회수':'클릭 후 바닥·침대·책상에 배치'):'인형뽑기에서 획득하세요';
      const icon=document.createElement('span');icon.textContent=unlocked?toyIcons[i]:'🔒';const label=document.createElement('small');label.textContent=unlocked?(placed?'배치 중':t.name):'???';button.append(icon,label);
      button.addEventListener('click',()=>{if(placed){removeToy(t.name);help.textContent=t.name+' 인형을 인벤토리로 회수했어요 ♡'}else{selectedToy=selectedToy===t.name?null:t.name;help.textContent=selectedToy?'바닥·침대·책상을 클릭하면 배치돼요 ♡':'배치를 취소했어요 ♡';refreshInventory()}});grid.appendChild(button)});
  }
  // Existing collection counts remain unchanged; room placement uses unlock state only.
  Object.entries(toyPositions).forEach(([name,pos])=>{if(toyTypes.some(t=>t.name===name)&&Array.isArray(pos)&&pos.length>=2&&pos.slice(0,3).every(Number.isFinite)&&Number(ownedToys()[name])>0)placeToy(name,pos[0],pos[1],Number.isFinite(pos[2])?pos[2]:.025)});
  refreshInventory();
  const onToyCollectionChanged=()=>refreshInventory();
  window.addEventListener('minihome:claw-collection-changed',onToyCollectionChanged);
  window.addEventListener('storage',onToyCollectionChanged);
  // C4D character: separate pivot nodes allow rig-free animation.
  const character=new THREE.Group();room.add(character);
  const puppet=new THREE.Group();character.add(puppet);
  const skin=new THREE.MeshStandardMaterial({color:0xffdfce});
  const outfit=new THREE.MeshStandardMaterial({color:0xE7A3C7});
  const hair=new THREE.MeshStandardMaterial({color:0x6c5264});
  const pants=new THREE.MeshStandardMaterial({color:0x83a995});
  const leftArm=new THREE.Group(),rightArm=new THREE.Group(),leftLeg=new THREE.Group(),rightLeg=new THREE.Group();
  let modelEyes=null, limbBaseRotations=new Map();
  let modelReady=false, modelHairNodes=[], modelBodyNodes=[], activeHair=1, activeBody=1, bareLegs=false, skinColor=null, modelColorParts={hair:[],outfit:[],pants:[],skirt:[]};
  const accessoryNames=['bun','mandubuns','pigtails','ponytail','hat','rabbit hat','hairpinL','hairpinR'];
  const accessoryLabels={'bun':'번','mandubuns':'만두','pigtails':'양갈래','ponytail':'포니테일','hat':'비니','rabbit hat':'토끼','hairpinL':'왼쪽 핀','hairpinR':'오른쪽 핀'};
  const accessoryNodes=new Map();
  const hairColorAccessoryNames=new Set(['bun','mandubuns','pigtails','ponytail']);
  let previewModel=null, previewSource=null;
  function syncPreview(){
    if(!previewModel||!previewSource)return;
    const original=[],copy=[];
    previewSource.traverse(n=>original.push(n));previewModel.traverse(n=>copy.push(n));
    for(let i=0;i<Math.min(original.length,copy.length);i++){
      copy[i].visible=original[i].visible;
      if(original[i].isMesh)copy[i].material=original[i].material;
    }
  }
  // One-time migration: rabbit hat was accidentally saved as worn by the previous version.
  // Reset only that accessory once; later user toggles are saved normally.
  const wornAccessories=new Set((()=>{try{
    const saved=JSON.parse(localStorage.getItem('minihome_character_accessories')||'[]');
    const selected=Array.isArray(saved)?saved.filter(n=>accessoryNames.includes(n)):[];
    if(localStorage.getItem('minihome_rabbit_hat_default_off_v1')!=='1'){
      const index=selected.indexOf('rabbit hat');
      if(index!==-1)selected.splice(index,1);
      localStorage.setItem('minihome_character_accessories',JSON.stringify(selected));
      localStorage.setItem('minihome_rabbit_hat_default_off_v1','1');
    }
    return selected;
  }catch(_){return []}})());
  function updateAccessories(){
    for(const [name,node] of accessoryNodes){
      const show=wornAccessories.has(name);
      node.visible=show;
      // Some glTF accessory groups have nested objects; explicitly sync those too.
      if(name==='rabbit hat')node.traverse(child=>{child.visible=show});
    }
    document.querySelectorAll('.room-customize [data-accessory]').forEach(btn=>{
      const active=wornAccessories.has(btn.dataset.accessory);
      btn.classList.toggle('is-selected',active);
      btn.setAttribute('aria-pressed',String(active));
    });
  }
  function toggleAccessory(name){
    if(!accessoryNames.includes(name))return;
    if(wornAccessories.has(name))wornAccessories.delete(name);else wornAccessories.add(name);
    updateAccessories();
    try{localStorage.setItem('minihome_character_accessories',JSON.stringify([...wornAccessories]))}catch(_){}
  }
  const savedHair=(()=>{try{const n=Number(localStorage.getItem('minihome_character_hair'));return [1,2,3,4].includes(n)?n:1}catch(_){return 1}})();
  activeHair=savedHair;
  function setHairStyle(n){
    if(![1,2,3,4].includes(n))return;
    activeHair=n;
    if(modelReady)tintModelParts();
    for(let i=0;i<modelHairNodes.length;i++)if(modelHairNodes[i])modelHairNodes[i].visible=(i===n-1);
    try{localStorage.setItem('minihome_character_hair',String(n))}catch(_){}
    document.querySelectorAll('.room-customize [data-hair-style]').forEach(btn=>{const selected=Number(btn.dataset.hairStyle)===n;btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-pressed',String(selected))});
  }
  try{const v=Number(localStorage.getItem('minihome_character_body'));if([1,2,3].includes(v))activeBody=v;bareLegs=localStorage.getItem('minihome_character_bare_legs')==='true'}catch(_){}
  function setBodyStyle(n){
    if(![1,2,3].includes(n))return;
    activeBody=n;
    if(n===1)bareLegs=false;
    modelBodyNodes.forEach((node,i)=>{if(node)node.visible=i===n-1});
    try{localStorage.setItem('minihome_character_body',String(n))}catch(_){}
    customize?.querySelectorAll('[data-body-style]').forEach(btn=>{const selected=Number(btn.dataset.bodyStyle)===n;btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-pressed',String(selected))});
    tintModelParts();
    updateBareLegsButton();
    syncPreview();
  }
  function updateBareLegsButton(){
    const btn=customize?.querySelector('[data-bare-legs]');
    if(!btn)return;
    const enabled=activeBody!==1;
    btn.hidden=!enabled;
    btn.disabled=!enabled;
    btn.classList.toggle('is-selected',enabled&&bareLegs);
    btn.setAttribute('aria-pressed',String(enabled&&bareLegs));
    btn.setAttribute('aria-label',bareLegs?'맨다리 적용 중, 바지색으로 전환':'바지색 유지 중, 맨다리로 전환');
    btn.title=bareLegs?'맨다리':'바지색 유지';
  }
  function setBareLegs(value){
    bareLegs=activeBody!==1&&!!value;
    try{localStorage.setItem('minihome_character_bare_legs',String(bareLegs))}catch(_){}
    tintModelParts();
    updateBareLegsButton();
    syncPreview();
  }
  function tintModelParts(){
    for(const mesh of modelColorParts.skirt)for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(mat?.color)mat.color.copy(pants.color);
    for(const mesh of modelColorParts.pants)for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(mat.color)mat.color.copy(activeBody!==1&&bareLegs&&skinColor?skinColor:pants.color);
    for(const mesh of modelColorParts.hair)for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(mat.color)mat.color.copy(hair.color);
    for(const mesh of modelColorParts.outfit)for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(mat.color)mat.color.copy(outfit.color);
  }
  loader.load('assets/models/character.gltf?v=20261116-rabbit-eye-renamed',gltf=>{
    if(disposed)return;
    const model=gltf.scene;
    const root=model.getObjectByName('Character')||model;
    // Keep authored pivot hierarchy and center the model at its feet.
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    if(!size.y){console.error('[miniroom] Empty character model');return}
    const scale=1.65/size.y;
    const center=bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    model.scale.setScalar(scale);
    puppet.add(model);
    // Match all three hair objects by normalized glTF names, including 'hair3 '.
    const normalizedPartName=name=>String(name||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    modelHairNodes=[1,2,3,4].map(n=>{
      let match=null;root.traverse(node=>{if(normalizedPartName(node.name)==='hair'+n)match=node});return match;
    });
    modelBodyNodes=[1,2,3].map(n=>{let match=null;root.traverse(node=>{if(normalizedPartName(node.name)===(n===1?'body':'body'+n))match=node});return match});
    // GLTFLoader may convert spaces in object names to underscores (rabbit hat -> rabbit_hat).
    // Resolve accessories by their original logical names, regardless of that conversion.
    const normalizeAccessoryName=name=>String(name||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    const accessoryByNormalizedName=new Map(accessoryNames.map(name=>[normalizeAccessoryName(name),name]));
    root.traverse(node=>{
      const logicalName=accessoryByNormalizedName.get(normalizeAccessoryName(node.name));
      if(logicalName)accessoryNodes.set(logicalName,node);
    });
    // A hidden parent also hides every nested mesh, including both rabbit ears.
    updateAccessories();
    const limbs=[['armL',leftArm],['armR',rightArm],['legL',leftLeg],['legR',rightLeg]];
    // The GLTF nodes already have shoulder/hip pivots: animate these directly.
    for(const [name,controller] of limbs){
      const node=root.getObjectByName(name);
      if(node){controller.userData.target=node;limbBaseRotations.set(controller,node.quaternion.clone())}
      else console.warn('[miniroom] Character part missing:',name);
    }
    root.traverse(node=>{
      if(!node.isMesh)return;
      node.castShadow=true;node.receiveShadow=true;
      // Clone materials to avoid recoloring unrelated pieces sharing a material.
      node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();
      const n=node.name.trim().toLowerCase();
      // Classify by actual glTF node ancestry, not material names. In this model
      // hair1/2/3 and the four hairstyle accessories share a material named '눈'.
      // Each mesh's material was cloned above so recoloring cannot affect eyes.
      let part=node, isHairPart=false;
      while(part&&part!==root.parent){
        if(modelHairNodes.includes(part)){isHairPart=true;break}
        for(const [accessoryName,accessoryRoot] of accessoryNodes){
          if(hairColorAccessoryNames.has(accessoryName)&&part===accessoryRoot){isHairPart=true;break}
        }
        if(isHairPart)break;
        part=part.parent;
      }
      if(isHairPart)modelColorParts.hair.push(node);
      const skirtRoot=modelBodyNodes[1];
      if(node===skirtRoot)modelColorParts.skirt.push(node);
      else if(n.includes('상의')||modelBodyNodes.some(b=>{let p=node;while(p){if(p===b)return true;p=p.parent}return false}))modelColorParts.outfit.push(node);
    });
    // Body is itself a mesh; sleeves and trousers are separately named meshes.
    const bodyMesh=root.getObjectByName('body');
    if(bodyMesh?.isMesh)modelColorParts.outfit.push(bodyMesh);
    for(const b of modelBodyNodes)if(b?.isMesh&&b!==modelBodyNodes[1])modelColorParts.outfit.push(b);
    root.traverse(node=>{
      if(!node.isMesh)return;
      if(/arm[LR]-상의/i.test(node.name))modelColorParts.outfit.push(node);
      if(/leg[LR]-바지/i.test(node.name))modelColorParts.pants.push(node);
      if(!skinColor&&/arm[LR]-피부/i.test(node.name)&&node.material?.color)skinColor=node.material.color.clone();
    });
    modelColorParts.outfit=[...new Set(modelColorParts.outfit)].filter(node=>node!==modelBodyNodes[1]);
    modelColorParts.pants=[...new Set(modelColorParts.pants)];
    modelColorParts.skirt=[...new Set(modelColorParts.skirt)];
    // Every hairstyle and hair-colored accessory is now collected by ancestry.
    modelColorParts.hair=[...new Set(modelColorParts.hair)];
    // Find the actual character face, excluding accessory subtrees entirely.
    // The rabbit hat has its own eyes; never search the entire Head for eyeL/eyeR.
    const normEyeName=n=>String(n||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    const headNode=root.children.find(n=>normEyeName(n.name)==='head');
    const faceNode=headNode?.children.find(n=>normEyeName(n.name)==='face');
    const findFaceEye=name=>{
      let found=null;
      faceNode?.traverse(n=>{if(!found&&normEyeName(n.name)===normEyeName(name))found=n});
      return found;
    };
    const openEyes=['eyeL','eyeR'].map(findFaceEye).filter(Boolean);
    const closedEyes=['eyeclosedL','eyeclosedR'].map(findFaceEye).filter(Boolean);
    modelEyes={openEyes,closedEyes};
    if(openEyes.length!==2||closedEyes.length!==2){
      console.error('[miniroom] Character face eyes missing', {
        head:headNode?.name,face:faceNode?.name,
        faceChildren:faceNode?.children.map(n=>n.name),
        open:openEyes.map(n=>n.name),closed:closedEyes.map(n=>n.name)
      });
    }
    updateEyeVisibility();
    modelReady=true;setHairStyle(activeHair);setBodyStyle(activeBody);
    previewSource=model;
    previewModel=model.clone(true);
    previewScene.add(previewModel);
    syncPreview();
    // Always tint on load, even with no saved preferences; hair3 must not retain
    // the glTF material's dark eye color as its default.
    tintModelParts();
    console.info('[miniroom] Character loaded',size.toArray());
  },undefined,e=>console.error('[miniroom] Failed loading character.gltf',e));
  // Natural occasional blink using the existing closed-eye meshes.
  // Change these values to adjust the blinking frequency and duration.
  const BLINK_MIN_INTERVAL=3.0;
  const BLINK_MAX_INTERVAL=7.0;
  const BLINK_DURATION=0.15;
  let blinkWait=BLINK_MIN_INTERVAL+Math.random()*(BLINK_MAX_INTERVAL-BLINK_MIN_INTERVAL);
  let blinkRemaining=0;
  function updateBlink(dt){
    if(mode==='sleep'){
      blinkRemaining=0;
      blinkWait=BLINK_MIN_INTERVAL+Math.random()*(BLINK_MAX_INTERVAL-BLINK_MIN_INTERVAL);
      return;
    }
    if(blinkRemaining>0){
      blinkRemaining=Math.max(0,blinkRemaining-dt);
    }else{
      blinkWait-=dt;
      if(blinkWait<=0){
        blinkRemaining=BLINK_DURATION;
        blinkWait=BLINK_MIN_INTERVAL+Math.random()*(BLINK_MAX_INTERVAL-BLINK_MIN_INTERVAL);
      }
    }
  }
  function updateEyeVisibility(){
    if(!modelEyes || Array.isArray(modelEyes))return;
    const closed=mode==='sleep'||blinkRemaining>0;
    for(const eye of modelEyes.openEyes)eye.visible=!closed;
    for(const eye of modelEyes.closedEyes)eye.visible=closed;
  }
  // Invisible drag target works even before the GLTF finishes loading.
  const hitBody=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.65,4,8),new THREE.MeshBasicMaterial({visible:false}));
  hitBody.position.y=.77;character.add(hitBody);
  function setLimbRotation(group,axis,value){
    const target=group.userData.target;
    if(target)target.rotation[axis]=value;
  }
  character.position.set(-.15,0,.65);
  let mode='wander',holding=false,dragMoved=false,walkTarget=new THREE.Vector3(0,0,1.2),nextChoice=0,walkPhase=0,heldOffset=0;
  // Gentle, camera-facing sleep letters; local to the character so they follow the bed.
  const sleepZCanvas=document.createElement('canvas');sleepZCanvas.width=128;sleepZCanvas.height=128;
  const sleepZContext=sleepZCanvas.getContext('2d');
  sleepZContext.font='bold 94px Arial, sans-serif';sleepZContext.textAlign='center';sleepZContext.textBaseline='middle';
  sleepZContext.fillStyle='#7E5246';sleepZContext.fillText('z',64,65);
  const sleepZTexture=new THREE.CanvasTexture(sleepZCanvas);
  const sleepLetters=Array.from({length:3},(_,i)=>{
    const material=new THREE.SpriteMaterial({map:sleepZTexture,transparent:true,opacity:0,depthTest:false,depthWrite:false});
    const sprite=new THREE.Sprite(material);sprite.visible=false;sprite.renderOrder=5;
    character.add(sprite);return sprite;
  });
  // Drag uses screen pixels, not a tilted 3D plane.
  const dragStartPosition=new THREE.Vector3();
  const dragRight=new THREE.Vector3();
  let dragStartX=0,dragStartY=0,dragPixelsPerUnit=100;
  const clock=new THREE.Clock();const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);const groundHit=new THREE.Vector3();
  // Sample the visible wooden floor planks, not the old y=0 plane.
  // Exclude the circular rug and the lower foundation cube.
  // The wooden planks have seams. Per-step raycasts fall through the seams,
  // returning zero and making the character alternate between two heights.
  // Treat the wood as one continuous walkable surface instead.
  let floorPlanks=[];
  let woodFloorY=0;
  function updateWoodFloorHeight(){
    const tops=[];
    for(const group of floorPlanks){
      group.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3().setFromObject(group);
      if(!bounds.isEmpty()&&Number.isFinite(bounds.max.y))tops.push(bounds.max.y*3);
    }
    if(tops.length)woodFloorY=Math.max(...tops);
    console.info('[miniroom] Stable wooden floor height:',woodFloorY);
  }
  function floorHeight(x,z){return woodFloorY}
  function syncFloorHeight(){
    if(mode==='wander')character.position.y=floorHeight(character.position.x,character.position.z);
    for(const [name,mesh] of toyMeshes){
      const saved=toyPositions[name];
      if(saved&&saved[2]<.15){
        mesh.position.y=floorHeight(mesh.position.x,mesh.position.z)+.025;
        saved[2]=mesh.position.y;
      }
    }
  }
  function pointOnFloor(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.ray.intersectPlane(ground,groundHit);
    if(hit){groundHit.multiplyScalar(3);groundHit.y=floorHeight(groundHit.x,groundHit.z)}return hit}
  // Place plushies on the mattress, desktop or floor; use the visible top surface.
  // The bed's pillow/blanket and desk accessories must not become placement surfaces.
  // Raycast actual C4D furniture instead of outdated procedural placement proxies.
  function toyDropPoint(e){
    setPointer(e);
    const surfaces=[...(c4dBed?[c4dBed]:[]),...(c4dDesk?[c4dDesk]:[])];
    const hits=raycaster.intersectObjects(surfaces,true);
    for(const hit of hits){
      const normal=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld);
      if(!normal||normal.y<.65)continue;
      // All plush positions are stored in the 3x legacy room coordinate system.
      return {x:hit.point.x*3,z:hit.point.z*3,y:hit.point.y*3+.04};
    }
    if(pointOnFloor(e))return {x:THREE.MathUtils.clamp(groundHit.x,-2.55,2.55),z:THREE.MathUtils.clamp(groundHit.z,-2.55,2.55),y:groundHit.y+.025};
    return null;
  }
  // Furniture footprints, expanded by the character's radius.
  // Only autonomous walking uses these barriers; dropping onto furniture is still allowed.
  const characterRadius=.27;
  const bedObstacle=bedFootprint;
  const obstacles=[
    bedObstacle, // actual C4D bed footprint
    {minX:-2.84,maxX:-1.74,minZ:.41,maxZ:2.27}, // desk
    {minX:-1.75,maxX:-.99,minZ:.96,maxZ:1.72}, // chair
    // Old procedural plant removed
  ];
  function walkable(x,z){
    if(x < -2.65 || x > 2.65 || z < -2.65 || z > 2.65)return false;
    return !obstacles.some(o=>x>o.minX-characterRadius && x<o.maxX+characterRadius && z>o.minZ-characterRadius && z<o.maxZ+characterRadius);
  }
  function chooseTarget(){
    for(let i=0;i<70;i++){
      const x=-2.5+Math.random()*5,z=-2.5+Math.random()*5;
      if(walkable(x,z)){walkTarget.set(x,0,z);nextChoice=3+Math.random()*4;return}
    }
    walkTarget.copy(character.position);nextChoice=1;
  }
  function walkStep(dx,dz,step){
    const x=character.position.x,z=character.position.z;
    const nx=x+dx*step,nz=z+dz*step;
    if(walkable(nx,nz)){character.position.x=nx;character.position.z=nz;character.position.y=floorHeight(nx,nz);return true}
    // Slide along furniture rather than passing through it.
    if(walkable(nx,z)){character.position.x=nx;character.position.y=floorHeight(nx,z);return true}
    if(walkable(x,nz)){character.position.z=nz;character.position.y=floorHeight(nx,nz);return true}
    return false;
  }
  function nearestWalkable(x,z){
    if(walkable(x,z))return {x,z};
    let best=null,bestDist=Infinity;
    for(let ix=-26;ix<=26;ix++)for(let iz=-26;iz<=26;iz++){
      const px=ix/10,pz=iz/10;
      if(!walkable(px,pz))continue;
      const d=(px-x)**2+(pz-z)**2;
      if(d<bestDist){bestDist=d;best={x:px,z:pz}}
    }
    return best||{x:0,z:2.5};
  }
  function placeCharacter(){const x=character.position.x,z=character.position.z;
    const onBed=x>=bedFootprint.minX&&x<=bedFootprint.maxX&&z>=bedFootprint.minZ&&z<=bedFootprint.maxZ;
    const chairNode=part('의자');const seatNode=marker(chairNode,'의자 앉는 위치');const seatPos=seatNode?worldLegacy(seatNode):chair.position;
    const onChair=Math.abs(x-seatPos.x)<.48&&Math.abs(z-seatPos.z)<.48;
    if(onBed){
      mode='sleep';character.position.set(bedSleep.x,bedSleep.y,bedSleep.z);
      character.rotation.y=bedSleep.rotation;puppet.position.y=0;
      puppet.rotation.set(-Math.PI/2,0,0);
      status.textContent='침대에 내려놓았어요. 캐릭터가 쉬고 있어요 ♡';
    }else if(onChair){
      mode='sit';const seat=marker(part('의자'),'의자 앉는 위치');const seatP=seat?worldLegacy(seat):new THREE.Vector3(chair.position.x,.58,chair.position.z);character.position.copy(seatP);character.position.y-=0.2; // C4D seat Null is above the character's feet; lower the seated root
      character.rotation.y=chair.rotation.y+Math.PI;puppet.rotation.set(0,0,0);puppet.position.y=0;
      leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
      leftLeg.rotation.set(0,0,0);rightLeg.rotation.set(0,0,0);
      status.textContent='의자에 앉았어요 ♡';
    }else{
      mode='wander';const safe=nearestWalkable(x,z);
      character.position.set(safe.x,floorHeight(safe.x,safe.z),safe.z);puppet.rotation.set(0,0,0);
      nextChoice=0;status.textContent='바닥에 내려놓았어요. 다시 혼자 돌아다녀요 ♡';
    }
  }
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down=null;let frame=0;let disposed=false;
  const initial={position:camera.position.clone(),target:controls.target.clone()};
  // Laptop confirmation popup — Figma miniroom laptop design.
  const pcStyle=document.createElement('style');
  pcStyle.textContent=`
    .minipc-overlay{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.54);opacity:0;pointer-events:none;transition:opacity .22s ease;font-family:'DOSIyagi',inherit}
    .minipc-overlay.is-open{opacity:1;pointer-events:auto}
    .minipc-confirm{width:298px;max-width:100%;box-sizing:border-box;background:#EFB1D0;border:5px solid #EFB1D0;border-radius:6px;color:#66544B;overflow:hidden;font-family:'DOSIyagi',inherit}
    .minipc-titlebar{height:29px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 4px 0 9px;font-size:15px}
    .minipc-close{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:3px;background:#FFFDF9;color:#806767;font:inherit;font-size:20px;line-height:1;cursor:pointer;padding:0}
    .minipc-body{min-height:134px;box-sizing:border-box;background:#FFFDF9;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:24px 12px 22px}
    .minipc-question{margin:0;text-align:center;font-size:15px;line-height:1.4;color:#66544B}
    .minipc-actions{display:flex;align-items:center;justify-content:center;gap:33px}
    .minipc-action{width:80px;height:30px;box-sizing:border-box;border:1px solid #806767;border-radius:4px;background:#FFFDF9;color:#806767;font:inherit;font-size:14px;cursor:pointer;transition:background-color .12s,color .12s,border-color .12s}
    .minipc-action:hover,.minipc-close:hover{background:#F9DFEC;color:#66544B}
    .minipc-action:active,.minipc-close:active{background:#EFB1D0;color:#FFFDF9}
    .minipc-action:focus-visible,.minipc-close:focus-visible{outline:2px solid #806767;outline-offset:2px}
    @media(max-width:360px){.minipc-overlay{padding:8px}.minipc-confirm{width:100%}}
  `;
  document.head.appendChild(pcStyle);
  const stagePosition=stage.style.position;
  stage.style.position='relative';
  // A single short-lived speech bubble, anchored above the clicked 3D furniture.
  const furnitureMessage=document.createElement('div');
  furnitureMessage.className='room-furniture-message';
  furnitureMessage.setAttribute('aria-hidden','true');
  const furnitureMessageStyle=document.createElement('style');
  furnitureMessageStyle.textContent=`.room-furniture-message{position:absolute;z-index:15;left:0;top:0;transform:translate(-50%,-100%);padding:6px 10px;border:1px solid #b98aa0;border-radius:12px;background:#fff9f2f2;color:#493036;font-size:12px;font-weight:700;box-shadow:0 3px 9px #49303630;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .18s ease}.room-furniture-message.is-visible{opacity:1}`;
  document.head.appendChild(furnitureMessageStyle);stage.appendChild(furnitureMessage);
  let messageAnchor=null,messageUntil=0;
  const messageWorld=new THREE.Vector3(),messageProjected=new THREE.Vector3();
  function showFurnitureMessage(group,message){
    if(!group)return;
    furnitureMessage.textContent=message;messageAnchor=group;
    messageUntil=clock.elapsedTime+1.65;
    furnitureMessage.classList.add('is-visible');
  }
  function updateFurnitureMessage(now){
    if(!messageAnchor||now>=messageUntil){furnitureMessage.classList.remove('is-visible');messageAnchor=null;return}
    messageAnchor.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(messageAnchor);
    if(bounds.isEmpty()){furnitureMessage.classList.remove('is-visible');return}
    bounds.getCenter(messageWorld);messageWorld.y=bounds.max.y+.055;
    messageProjected.copy(messageWorld).project(camera);
    if(messageProjected.z < -1||messageProjected.z > 1){furnitureMessage.classList.remove('is-visible');return}
    furnitureMessage.style.left=((messageProjected.x+1)*.5*renderer.domElement.clientWidth)+'px';
    furnitureMessage.style.top=((1-messageProjected.y)*.5*renderer.domElement.clientHeight-7)+'px';
  }
  const pcOverlay=document.createElement('div');pcOverlay.className='minipc-overlay';
  pcOverlay.setAttribute('aria-hidden','true');
  pcOverlay.innerHTML=`<div class="minipc-confirm" role="dialog" aria-modal="true" aria-label="미니게임 실행">
    <div class="minipc-titlebar"><span>미니게임 실행</span><button type="button" class="minipc-close" data-pc-exit aria-label="닫기">×</button></div>
    <div class="minipc-body"><p class="minipc-question">미니 게임을 시작하시겠습니까?</p><div class="minipc-actions"><button type="button" class="minipc-action" data-pc-cancel>취소</button><button type="button" class="minipc-action" data-pc-play>시작</button></div></div>
  </div>`;
  stage.appendChild(pcOverlay);
  let pcMode='idle',pcProgress=0,pcStart=null,pcReturn=null,pcGoal=null;
  // Photo-board portfolio gallery. The confirmation dialog reuses the laptop's minipc styles.
  const galleryStyle=document.createElement('style');
  galleryStyle.textContent=`
    .mini-gallery{position:absolute;inset:0;z-index:21;display:flex;align-items:center;justify-content:center;padding:12px;background:#38231b77;opacity:0;pointer-events:none;transition:opacity .25s ease;font-family:'DOSIyagi',inherit}
    .mini-gallery.is-open{opacity:1;pointer-events:auto}
    .mini-gallery-panel{position:relative;width:min(78%,760px);aspect-ratio:885/571;max-height:none;flex:none;background:url('assets/images/gallery/photoboard2.png') center/100% 100% no-repeat;filter:drop-shadow(0 9px 13px #38231b44)}
    .mini-gallery-close{position:absolute;z-index:8;left:50%;top:0;width:14.24%;height:10.51%;transform:translateX(-50%);border:0;padding:0;background:url('assets/images/gallery/미니룸액자닫기클립.png') center/100% 100% no-repeat;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;color:#765e69;font:24px 'DOSIyagi',sans-serif;line-height:1}.mini-gallery-close span{position:absolute;bottom:14%;left:50%;transform:translateX(-50%);font-size:clamp(10px,1.15vw,14px);white-space:nowrap;line-height:1}.mini-gallery-close:hover{filter:brightness(1.04)}.mini-gallery-close:focus-visible{outline:3px solid #b86d9b;outline-offset:3px}
    .mini-gallery-board-grid{position:absolute;inset:0;overflow:hidden}
    .mini-gallery-note{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;width:17%;height:31%;padding:1.25% 1.2% 1%;border:0;border-radius:3px;background:#fffdfa;box-shadow:2px 5px 7px #70505b4d;text-align:left;cursor:pointer;transform:rotate(var(--tilt));transform-origin:50% 5%;transition:filter .15s,scale .15s}
    .mini-gallery-note:hover{filter:brightness(1.03);scale:1.04;z-index:2}
    .mini-gallery-note:focus-visible{outline:3px solid #b86d9b;outline-offset:3px}
    .mini-gallery-note img{display:block;width:100%;height:73%;object-fit:cover;background:#f6d4e7}
    .mini-gallery-note strong{font-size:clamp(8px,1.3vw,12px);line-height:1.15;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}
    .mini-gallery-note small{font-size:clamp(6px,1vw,9px);line-height:1.1;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mini-gallery-peg{position:absolute;z-index:3;width:13%;height:46%;top:-35%;left:43.5%;background:center/contain no-repeat;filter:drop-shadow(2px 3px 2px #6a506b55);pointer-events:none}
    .mini-gallery-note:nth-child(4n + 1){left:15.5%;top:24%;--tilt:8deg}
    .mini-gallery-note:nth-child(4n + 2){left:36.7%;top:26%;--tilt:-1deg}
    .mini-gallery-note:nth-child(4n + 3){left:57.2%;top:25%;--tilt:-5deg}
    .mini-gallery-note:nth-child(4n + 4){left:76%;top:22%;--tilt:-4deg}
    .mini-gallery-note:nth-child(n + 5){top:63%;height:30%}
    .mini-gallery-note:nth-child(5){left:23%;--tilt:2deg}
    .mini-gallery-note:nth-child(6){left:46%;--tilt:-2deg}
    .mini-gallery-note:nth-child(7){left:68%;--tilt:-8deg}
    .mini-gallery-note:nth-child(n + 8){display:none}
    .mini-gallery-note:nth-child(n + 5) .mini-gallery-peg{top:-37%}
    .mini-gallery-board-grid.is-four .mini-gallery-note:nth-child(1){left:20%;top:24%;--tilt:7deg}
    .mini-gallery-board-grid.is-four .mini-gallery-note:nth-child(2){left:42%;top:26%;--tilt:-2deg}
    .mini-gallery-board-grid.is-four .mini-gallery-note:nth-child(3){left:65%;top:24%;--tilt:-6deg}
    .mini-gallery-board-grid.is-four .mini-gallery-note:nth-child(4){left:31%;top:63%;height:30%;--tilt:-5deg}
    .mini-gallery-board-grid.is-four .mini-gallery-note:nth-child(4) .mini-gallery-peg{top:-37%}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(-n+3),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(-n+3){top:24%}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(1),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(1){left:20%;--tilt:7deg}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(2),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(2){left:42%;--tilt:-2deg}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(3),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(3){left:65%;--tilt:-6deg}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(4),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(4){left:22%;top:63%;height:30%;--tilt:2deg}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(5),.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(5){left:46%;top:63%;height:30%;--tilt:-2deg}
    .mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(6){left:68%;top:63%;height:30%;--tilt:-8deg}
    .mini-gallery-board-grid.is-five .mini-gallery-note:nth-child(n+4) .mini-gallery-peg,.mini-gallery-board-grid.is-six .mini-gallery-note:nth-child(n+4) .mini-gallery-peg{top:-37%}
    .mini-gallery-empty{position:absolute;top:45%;left:0;width:100%;text-align:center;color:#74586b;font-size:14px}
    .mini-gallery-confirm{position:absolute;inset:0;z-index:6;display:none;align-items:center;justify-content:center;background:#0007}
    .mini-gallery-confirm.is-open{display:flex}
    .mini-gallery-confirm .minipc-confirm{filter:none}
    @media(max-width:600px){.mini-gallery-note strong{font-size:8px}.mini-gallery-note small{font-size:6px}.mini-gallery-close span{font-size:12px}}
  `;
  document.head.appendChild(galleryStyle);
  const gallery=document.createElement('div');gallery.className='mini-gallery';gallery.setAttribute('aria-hidden','true');
  gallery.innerHTML=`<div class="mini-gallery-panel" role="dialog" aria-modal="true" aria-label="포트폴리오 액자">
    <button type="button" class="mini-gallery-close" data-gallery-close aria-label="액자 닫기" title="액자 닫기"><span aria-hidden="true">CLOSE</span></button>
    <div class="mini-gallery-board-grid" data-gallery-grid></div>
    <div class="mini-gallery-confirm" data-gallery-confirm><div class="minipc-confirm" role="dialog" aria-modal="true" aria-label="포트폴리오 실행">
      <div class="minipc-titlebar"><span>포트폴리오 실행</span><button type="button" class="minipc-close" data-gallery-confirm-close aria-label="닫기">×</button></div>
      <div class="minipc-body"><p class="minipc-question">작품설명으로 넘어가시겠습니까?</p><div class="minipc-actions"><button type="button" class="minipc-action" data-gallery-cancel>취소</button><button type="button" class="minipc-action" data-gallery-go>확인</button></div></div>
    </div></div>
  </div>`;
  stage.appendChild(gallery);
  let galleryIndex=0;
  function galleryProjects(){return Array.isArray(window.PORTFOLIO_PROJECTS)?window.PORTFOLIO_PROJECTS:[]}
  const galleryConfirm=gallery.querySelector('[data-gallery-confirm]');
  function hideGalleryConfirm(){galleryConfirm.classList.remove('is-open');gallery.querySelectorAll('.mini-gallery-note')[galleryIndex]?.focus()}
  function showGalleryBoard(){
    galleryConfirm.classList.remove('is-open');
    const grid=gallery.querySelector('[data-gallery-grid]');grid.replaceChildren();for(const n of [4,5,6])grid.classList.toggle('is-'+({4:'four',5:'five',6:'six'}[n]),galleryProjects().length===n);
    galleryProjects().slice(0,7).forEach((item,i)=>{
      const note=document.createElement('button');note.type='button';note.className='mini-gallery-note';
      const img=document.createElement('img');img.src=item.thumbnail||'';img.alt=item.title||'작품';img.loading='lazy';
      const name=document.createElement('strong');name.textContent=item.title||'작품';
      const meta=document.createElement('small');meta.textContent=[item.category,item.year].filter(Boolean).join(' · ');
      const peg=document.createElement('span');peg.className='mini-gallery-peg';peg.style.backgroundImage=`url("assets/images/gallery/${i%2===0?'Asset 53.png':'Asset 55.png'}")`;
      note.append(img,name,meta,peg);
      note.addEventListener('click',()=>{galleryIndex=i;galleryConfirm.classList.add('is-open');gallery.querySelector('[data-gallery-go]').focus()});
      grid.appendChild(note);
    });
    if(!grid.children.length){const empty=document.createElement('div');empty.className='mini-gallery-empty';empty.textContent='등록된 작품이 없습니다.';grid.appendChild(empty)}
  }
  function openGallery(){if(pcMode!=='idle'||holding)return;const goal=frameCameraGoal();if(!goal){status.textContent='액자 카메라 위치를 찾지 못했어요';return}galleryIndex=0;showGalleryBoard();pcReturn={position:camera.position.clone(),target:controls.target.clone()};beginCameraTransition('galleryApproach',goal.position,goal.target);status.textContent='액자에 가까이 다가갑니다...'}
  function closeGallery(){if(pcMode!=='gallery'&&pcMode!=='galleryApproach')return;galleryConfirm.classList.remove('is-open');gallery.classList.remove('is-open');gallery.setAttribute('aria-hidden','true');beginCameraTransition('return',null,null);status.textContent='미니룸으로 돌아갑니다 ♡'}
  gallery.querySelector('[data-gallery-close]').addEventListener('click',closeGallery);
  gallery.querySelector('[data-gallery-confirm-close]').addEventListener('click',hideGalleryConfirm);
  gallery.querySelector('[data-gallery-cancel]').addEventListener('click',hideGalleryConfirm);
  function openGalleryProject(){const item=galleryProjects()[galleryIndex];if(!item)return;if(stage.classList.contains('room-stage-zoomed')){status.textContent='포트폴리오로 이동하려면 먼저 원래 크기로 돌아가 주세요 ♡';return}closeGallery();window.openMinihomeProjectModal?.(item.id)}
  gallery.querySelector('[data-gallery-go]').addEventListener('click',openGalleryProject);
  function frameCameraGoal(){
    return markerCamera(c4dFrame,'액자 카메라 위치','액자 바라볼곳');
  }
  function beginCameraTransition(nextMode,position,target){
    if(nextMode==='galleryApproach')pcReturn={position:camera.position.clone(),target:controls.target.clone()};
    pcStart={position:camera.position.clone(),target:controls.target.clone()};
    pcProgress=0;pcMode=nextMode;pcGoal=position&&target?{position:position.clone(),target:target.clone()}:null;controls.enabled=false;
  }
  // Press feedback uses an absolute scale, not repeated multiplication.
  const pressEffects=new Map();
  function pressFurniture(group){
    if(!group)return;
    const previous=pressEffects.get(group);
    const originalY=previous?.originalY ?? group.position.y;
    const originalScale=previous?.originalScale ?? group.scale.clone();
    pressEffects.set(group,{elapsed:0,originalY,originalScale});
  }

  function laptopCameraGoal(){
    return markerCamera(part('노트북'),'노트북 카메라 위치','노트북 바라볼곳');
  }
  function openPC(){if(pcMode!=='idle'||holding)return;const goal=laptopCameraGoal();if(!goal){status.textContent='노트북 카메라 위치를 찾지 못했어요';return}pcReturn={position:camera.position.clone(),target:controls.target.clone()};beginCameraTransition('approach',goal.position,goal.target);status.textContent='컴퓨터 화면으로 이동 중입니다...'}
  function closePC(){if(pcMode==='idle'||pcMode==='return')return;pcOverlay.classList.remove('is-open');pcOverlay.setAttribute('aria-hidden','true');pcStart={position:camera.position.clone(),target:controls.target.clone()};pcProgress=0;pcGoal=null;pcMode='return';status.textContent='미니룸으로 돌아갑니다 ♡'}
  function onPcKey(e){if(e.key!=='Escape')return;if(!customize.hidden){closeCustomize();return}if(stage.classList.contains('room-stage-zoomed')){setRoomZoom(false);return}if(pcMode==='mirror'){closeCustomize();return}if(pcMode==='gallery'||pcMode==='galleryApproach'){if(galleryConfirm.classList.contains('is-open'))hideGalleryConfirm();else closeGallery();return}if(pcMode!=='idle'){closePC()}}
  pcOverlay.querySelector('[data-pc-exit]').addEventListener('click',closePC);
  pcOverlay.querySelector('[data-pc-cancel]').addEventListener('click',closePC);
  pcOverlay.querySelector('[data-pc-play]').addEventListener('click',()=>{if(stage.classList.contains('room-stage-zoomed')){status.textContent='미니게임으로 이동하려면 먼저 원래 크기로 돌아가 주세요 ♡';return}closePC();window.goMinihome?.('game')});
  document.addEventListener('keydown',onPcKey);

  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);const board=gallery.querySelector('.mini-gallery-panel');if(board)board.style.width=Math.max(0,Math.min(w*.78,760,(h-36)*885/571))+'px'}
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  function setPointer(e){
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
  }
  function onDown(e){
    if(pcMode!=='idle')return;
    down={x:e.clientX,y:e.clientY};setPointer(e);
    const toyHit=raycaster.intersectObjects([...toyMeshes.values()],true)[0];
    if(toyHit){let node=toyHit.object;while(node&&!node.userData.toyName)node=node.parent;if(node){toyDragging=node.userData.toyName;controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();return}}
    if(selectedToy){controls.enabled=false;e.preventDefault();return}

    const characterHits=raycaster.intersectObject(character,true).filter(h=>h.object!==hitBody);
    if(characterHits.length && projectedHit(character,pointer,0)){
      holding=true;dragMoved=false;mode='held';controls.enabled=false;
      renderer.domElement.setPointerCapture(e.pointerId);
      character.rotation.y=0;puppet.position.y=0;puppet.rotation.set(0,0,0);
      // Remember the character's position BEFORE lifting. Mouse movement is
      // translated directly to left/right and up/down in screen space.
      dragStartPosition.copy(character.position);
      dragStartPosition.y=Math.max(.65,dragStartPosition.y);
      dragStartX=e.clientX;dragStartY=e.clientY;
      camera.updateMatrixWorld();
      dragRight.setFromMatrixColumn(camera.matrixWorld,0).setY(0).normalize();
      const distance=camera.position.distanceTo(character.position);
      dragPixelsPerUnit=Math.max(35,renderer.domElement.clientHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*distance));
      character.position.y=dragStartPosition.y;
      status.textContent='좌우로 옮기고, 위아래로 들어 올려 보세요 ♡';
      e.preventDefault();
    }
  }
  function onMove(e){
    if(toyDragging){const drop=toyDropPoint(e);if(drop){const mesh=toyMeshes.get(toyDragging);if(mesh)mesh.position.set(drop.x,drop.y,drop.z)}e.preventDefault();return}
    if(!holding)return;
    dragMoved=true;
    const dx=(e.clientX-dragStartX)/dragPixelsPerUnit;
    const dy=(dragStartY-e.clientY)/dragPixelsPerUnit;
    // Keep the character visible: vertical mouse motion changes ONLY height.
    character.position.x=THREE.MathUtils.clamp(dragStartPosition.x+dragRight.x*dx,-2.65,2.65);
    character.position.z=THREE.MathUtils.clamp(dragStartPosition.z+dragRight.z*dx,-2.65,2.65);
    character.position.y=THREE.MathUtils.clamp(dragStartPosition.y+dy,.45,2.65);
    e.preventDefault();
  }
  function onUp(e){
    if(toyDragging){const mesh=toyMeshes.get(toyDragging);if(mesh){toyPositions[toyDragging]=[mesh.position.x,mesh.position.z,mesh.position.y];saveToys();status.textContent=toyDragging+' 인형의 위치를 저장했어요 ♡'}toyDragging=null;controls.enabled=true;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);down=null;return}
    if(selectedToy){const drop=toyDropPoint(e);if(drop)placeToy(selectedToy,drop.x,drop.z,drop.y);else status.textContent='바닥·침대·책상을 클릭해 주세요 ♡';controls.enabled=true;down=null;return}
    if(holding){
      setPointer(e);
      // Dropping on visible furniture takes priority over the floor ray.
      const furnitureHits=raycaster.intersectObjects([c4dBed,part('의자')].filter(Boolean),true);
      if(furnitureHits.length){
        let node=furnitureHits[0].object;
        while(node&&node!==c4dBed&&node!==part('의자'))node=node.parent;
        if(node===c4dBed){character.position.x=bedSleep.x;character.position.z=bedSleep.z}
        else if(node===part('의자')){const p=marker(part('의자'),'의자 앉는 위치');const v=p?worldLegacy(p):chair.position;character.position.x=v.x;character.position.z=v.z}
      }else if(pointOnFloor(e)){
        character.position.x=THREE.MathUtils.clamp(groundHit.x,-2.65,2.65);
        character.position.z=THREE.MathUtils.clamp(groundHit.z,-2.65,2.65);
        character.position.y=floorHeight(character.position.x,character.position.z);
      }
      holding=false;controls.enabled=true;
      if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
      placeCharacter();down=null;return;
    }
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return}down=null;
    setPointer(e);
    if(interactiveRoots.length){
      // Direct visible-mesh raycast. No stale world-space boxes or duplicate paths.
      // Restore the earlier mesh-based interaction approach: raycast the
      // actual rendered meshes and walk to their registered furniture root.
      // Do not use projected screen rectangles or generated hitboxes.
      const rootsHits=raycaster.intersectObjects(interactiveRoots,true)
        .filter(h=>h.object.visible&&!h.object.userData.markerCube);
      const rootFor=hit=>{
        let object=hit.object;
        while(object){
          if(interactiveRoots.includes(object))return object;
          object=object.parent;
        }
        return null;
      };
      const node=rootsHits.map(rootFor).find(Boolean)||null;
      if(!node){console.info('[miniroom] click missed',pointer.x.toFixed(2),pointer.y.toFixed(2));}
      if(node){
        const name=labelFor(node.name);
        console.info('[miniroom] clicked:',name);
        if(['창문','커텐 1','커텐 2'].includes(name)){toggleCurtains();showFurnitureMessage(node,curtainTarget?'커튼을 열었어요 ♡':'커튼을 닫았어요 ♡');return}
        if(name!=='인형상자'&&name!=='.거울')pressFurniture(node);
        if(name==='인형상자'){toggleInventory();showFurnitureMessage(node,panel.hidden?'인형상자를 닫았어요 ♡':'내 인형들이에요 ♡');return}
        if(name==='커피'||name==='컵케이크'){status.textContent=name==='커피'?'호로록~ 맛있다 ♡':'냠냠~ 맛있다 ♡';showFurnitureMessage(node,status.textContent);return}
        if(name==='노트북'){openPC();return}
        if(name==='액자'){openGallery();return}
        if(name==='.거울'){openCustomize();showFurnitureMessage(node,'캐릭터를 꾸며봐요 ♡');return;}
        if(name==='침대조명'){toggleLamp();showFurnitureMessage(node,status.textContent);return}
        if(name==='천장 선반'){toggleMushroomLamp();showFurnitureMessage(node,status.textContent);return}
        status.textContent=name+'을(를) 선택했어요 ♡';showFurnitureMessage(node,status.textContent);return;
      }
    }
  }
  // Mirror: full-size dress-up panel with an independent, live 3D preview.
  const previewScene=new THREE.Scene();
  const previewCamera=new THREE.PerspectiveCamera(32,1,.01,100);
  previewCamera.position.set(2.7,2.1,3.5);
  previewScene.add(new THREE.HemisphereLight(0xffffff,0xc5a2a5,2.6));
  const previewLight=new THREE.DirectionalLight(0xffffff,2.8);previewLight.position.set(-2,5,5);previewScene.add(previewLight);
  const previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  previewRenderer.outputColorSpace=THREE.SRGBColorSpace;
  const previewControls=new OrbitControls(previewCamera,previewRenderer.domElement);
  previewControls.enableDamping=true;previewControls.enablePan=false;
  previewControls.minDistance=2.2;previewControls.maxDistance=7;
  previewControls.target.set(0,.85,0);previewControls.update();
  // Figma 86:315 — user-provided assets and precise palette sampled from the PNG.
  // This dialog is mounted on <body> so it keeps its 960 × 600 design proportions
  // even when the 3D room's original stage is narrower than the popup.
  const customizeAsset=name=>'assets/images/customize/'+name;
  const customizeStyle=document.createElement('style');
  customizeStyle.textContent=`
    .room-customize{position:absolute;inset:0;z-index:100010;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;background:rgba(27,18,26,.55);font-family:"DOSIyagi",sans-serif;touch-action:auto}
    .room-customize[hidden],.room-customize-tab-panel[hidden]{display:none!important}
    .room-customize,.room-customize *{box-sizing:border-box}
    .room-customize-panel{position:relative;width:885px;height:536px;flex:none;transform-origin:center center;min-height:0;display:grid;grid-template-columns:50% 50%;overflow:hidden;border-radius:40px;background:#FDEBF4;color:#7F6E67;box-shadow:0 14px 44px #1d112a55;font-family:"DOSIyagi",sans-serif}
    .room-customize-preview{position:relative;min-width:0;min-height:0;margin:16px 0 16px 0;border-right:4px dashed #EDA4C8;overflow:hidden}
    .room-customize-heading{position:absolute;top:15px;left:24px;z-index:2;font-size:21px;color:#7F6E67;pointer-events:none}.room-customize-preview canvas{width:100%!important;height:100%!important;display:block;touch-action:none;cursor:grab}
    .room-customize-preview canvas:active{cursor:grabbing}
    .room-customize-settings{position:relative;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:24px 28px 24px 24px}
    .room-customize-toolbar{position:relative;display:flex;justify-content:center;align-items:center;gap:16px;height:58px;margin:0;flex-shrink:0;z-index:3}
    .room-customize button{font:inherit;cursor:pointer;border:0;padding:0;background:none;-webkit-tap-highlight-color:transparent}
    .room-customize-tab{background:#FDEBF4!important;width:58px;height:58px;display:grid;place-items:center;border:1px solid #EDA4C8!important;border-radius:50%;overflow:hidden;flex:none}
    .room-customize-tab.is-selected{border-color:#EDA4C8!important;background:#EDA4C8!important}
    .room-customize-tab img{display:block;width:76%;height:76%;object-fit:contain;object-position:center;pointer-events:none}
    .room-customize-finish{position:absolute;top:20px;right:20px;z-index:5;width:42px;height:42px;margin:0;transform:none;border-radius:50%!important;background:#EDA4C8!important;display:grid;place-items:center;flex:none;color:#fff}
    .room-customize-finish svg{width:28px;height:28px;display:block}
    .room-customize-finish:hover{background:#D78DB7!important}
    .room-customize-tab:hover:not(.is-selected){background:#FFF7FB!important}
    .room-customize-tab:focus-visible,.room-customize-finish:focus-visible,.room-customize-card:focus-visible,.room-customize-swatch:focus-visible{outline:3px solid #B66D98;outline-offset:3px}
    .room-customize-color-row{flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:20px;margin:0 0 17px;min-height:39px;padding-left:8px}
    .room-customize-swatch{width:38px;height:38px;flex:0 0 38px;border-radius:50%!important;position:relative;border:0!important}
    .room-customize-swatch.is-selected:after{content:"";position:absolute;inset:-7px;border:3px solid #EDA4C8;border-radius:50%;pointer-events:none}
    .room-customize-swatch:hover{transform:scale(1.07)}
    .room-customize-label{font-size:19px;font-weight:400;line-height:1.3;margin:8px 0 15px 6px;color:#7F6E67;white-space:nowrap}
    .room-customize-grid{flex-shrink:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0}
    .room-customize-grid.is-hairstyles{grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:0}
    .room-customize-card{height:auto;aspect-ratio:1;position:relative;border-radius:18px!important;display:flex;align-items:center;justify-content:center;overflow:visible;background:#AEDEE4!important;transition:background .12s,transform .12s}
    .room-customize-card.is-warm{background:#FFEBB3!important}
    .room-customize-card.is-selected{background:#EDA4C8!important}
    .room-customize-card:hover{transform:translateY(-2px)}
    .room-customize-card img{display:block;max-width:93%;max-height:92%;width:auto;height:auto;object-fit:contain;pointer-events:none}
    .room-customize-card.is-selected:after{content:"✓";position:absolute;right:-3px;top:-10px;width:26px;height:26px;border-radius:50%;background:#EDA4C8;border:2px solid white;color:white;font-family:Arial,sans-serif;font-size:20px;font-weight:700;line-height:22px;text-align:center;pointer-events:none}
    .room-customize-outfit-heading{font-size:19px;margin:14px 0 14px;color:#7F6E67}
    .room-customize-tab-panel{position:relative;flex-shrink:0;width:100%} .room-customize-outfit-hint{font-size:15px;line-height:1.5;margin:18px 0;color:#7F6E67}
    #room3d-stage:not(.room-stage-zoomed) .room-customize-settings{justify-content:center}
    #room3d-stage:not(.room-stage-zoomed) .room-customize-panel{border-radius:24px}
    @media(max-width:760px){.room-customize-panel{border-radius:26px}.room-customize-settings{padding:14px 14px 12px 17px}.room-customize-toolbar{gap:8px}.room-customize-finish{right:20px;top:20px}.room-customize-tab{width:44px;height:44px}.room-customize-finish{width:36px;height:36px}.room-customize-color-row{gap:11px}.room-customize-swatch{width:29px;height:29px;flex-basis:29px}.room-customize-grid{gap:6px}.room-customize-card{border-radius:13px!important}.room-customize-label{font-size:15px;margin-left:0}}
    @media(max-width:540px){.room-customize{padding:10px}.room-customize-panel{position:relative;width:100%;height:min(740px,calc(100dvh - 20px));grid-template-columns:1fr;grid-template-rows:minmax(170px,36%) minmax(0,1fr);border-radius:25px}.room-customize-preview{margin:0 16px;border-right:0;border-bottom:3px dashed #EDA4C8}.room-customize-settings{padding:10px 20px 20px}.room-customize-toolbar{margin-bottom:12px}.room-customize-grid{gap:9px}.room-customize-card{border-radius:15px!important}.room-customize-label{font-size:17px}}
    .room-stage-zoom-button{position:absolute;right:12px;top:12px;z-index:21;border:1px solid #b98aa0;border-radius:9px;background:#fff8fbee;color:#493036;padding:7px 11px;cursor:pointer;font:inherit}
    .room-customize-panel{width:885px!important;height:536px!important;grid-template-columns:50% 50%!important;grid-template-rows:1fr!important;border-radius:40px!important}
    .room-customize-settings{overflow:hidden!important;padding:24px 28px 24px 24px!important;justify-content:flex-start!important;position:relative!important}
    .room-customize-toolbar{position:absolute!important;top:31px!important;left:0!important;right:0!important;margin:0!important;gap:16px!important;height:58px!important;pointer-events:auto!important;display:flex!important;justify-content:center!important;align-items:center!important}
    .room-customize-tab{width:58px!important;height:58px!important;padding:12px!important;box-sizing:border-box!important;overflow:hidden!important}.room-customize-tab img{width:100%!important;height:100%!important;object-fit:contain!important}.room-customize-tab-panel{margin-top:92px!important}.room-customize-tab-panel[data-custom-panel="clothes"]{padding-top:52px!important}
    .room-customize-finish{position:absolute!important;top:20px!important;right:20px!important;transform:none!important;width:42px!important;height:42px!important}
    .room-customize-grid.is-outfits{grid-template-columns:repeat(3,90px);gap:10px;justify-content:center;margin:0 0 12px}
    .room-customize-grid.is-outfits .room-customize-card img{max-width:76%;max-height:76%}
    .room-customize-outfit-symbol{display:flex;justify-content:center;align-items:center;height:42px;margin:9px 0 9px}
    .room-customize-outfit-symbol img{width:68px;height:42px;object-fit:contain}
    /* Keep the original clothing controls spacing; only add the toggle beneath them. */
    .room-customize-tab-panel[data-custom-panel="clothes"]{margin-top:75px!important;padding-top:0!important;display:flex;flex-direction:column;align-items:stretch}
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-color-row{margin:0 0 10px}
    .room-customize-bare-toggle{position:relative!important;display:grid;place-items:center;flex:none;
      width:42px!important;height:42px!important;margin:18px auto 0!important;padding:5px!important;
      border:0!important;border-radius:50%!important;background:transparent!important;cursor:pointer}
    .room-customize-bare-toggle[hidden]{display:none!important}
    .room-customize-bare-toggle img{width:100%;height:100%;display:block;object-fit:contain}
    .room-customize-bare-toggle.is-selected:after{content:"";position:absolute;inset:0;border:3px solid #EDA4C8;border-radius:50%;pointer-events:none}
    .room-customize-bare-toggle:hover{transform:scale(1.05)}
    /* Fixed, five-level clothing layout: toolbar, outfits, top colors, bottom colors, bare legs.
       Toolbar top and bare button bottom use matching 31px insets. */
    .room-customize-settings{position:relative!important}
    .room-customize-tab-panel[data-custom-panel="clothes"]:not([hidden]){
      position:absolute!important;inset:115px 28px 31px 24px!important;
      width:auto!important;height:auto!important;margin:0!important;padding:0!important;
      display:flex!important;flex-direction:column!important;justify-content:space-between!important;
      align-items:center!important;overflow:visible!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-grid.is-outfits{
      width:100%!important;grid-template-columns:repeat(3,90px)!important;
      justify-content:center!important;gap:10px!important;margin:0!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-color-group{
      width:100%;display:flex;flex-direction:column;align-items:center;gap:9px;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-outfit-symbol{
      height:39px!important;width:100%!important;margin:0!important;display:flex!important;
      align-items:center!important;justify-content:center!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-outfit-symbol img{
      width:68px!important;height:39px!important;object-fit:contain!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-color-row{
      width:100%!important;min-height:39px!important;margin:0!important;padding:0!important;
      display:flex!important;justify-content:center!important;align-items:center!important;
      gap:20px!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-bare-toggle{
      position:relative!important;inset:auto!important;margin:0 auto!important;
      width:42px!important;height:42px!important;padding:5px!important;flex:0 0 42px!important;
      display:grid!important;place-items:center!important;box-sizing:border-box!important;
      border:0!important;border-radius:50%!important;background:transparent!important;
    }
    .room-customize-tab-panel[data-custom-panel="clothes"] .room-customize-bare-toggle.is-selected:after{
      content:"";position:absolute;inset:0;border:3px solid #EDA4C8;border-radius:50%;
    }
    body > #room3d-stage.room-stage-zoomed{position:fixed!important;inset:auto!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;width:min(1050px,82vw)!important;height:min(680px,82dvh)!important;max-width:none!important;max-height:none!important;z-index:99999!important;box-shadow:0 0 0 100vmax #1d1520b8,0 16px 45px #1d152066;border-radius:12px;overflow:hidden}
  `;
  document.head.appendChild(customizeStyle);
  const customize=document.createElement('div');customize.className='room-customize';customize.hidden=true;
  customize.innerHTML=`<div class="room-customize-panel" role="dialog" aria-modal="true" aria-label="캐릭터 꾸미기">
    <div class="room-customize-preview" data-custom-preview aria-label="3D 캐릭터 미리보기"><div class="room-customize-heading">♡ CHARACTER CUSTOMIZE ♡</div></div>
    <button type="button" class="room-customize-finish" data-custom-close aria-label="꾸미기 완료"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 14L11.5 21L24 6" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="room-customize-settings">
      <div class="room-customize-toolbar" role="tablist" aria-label="꾸미기 종류">
        <button type="button" class="room-customize-tab is-selected" data-custom-tab="hair" role="tab" aria-selected="true" aria-label="헤어"><img src="${customizeAsset('Asset 44.png')}" alt=""></button>
        <button type="button" class="room-customize-tab" data-custom-tab="clothes" role="tab" aria-selected="false" aria-label="옷"><img src="${customizeAsset('Asset 42.png')}" alt=""></button>

      </div>
      <section class="room-customize-tab-panel" data-custom-panel="hair" role="tabpanel" aria-label="헤어 선택">
        <div class="room-customize-color-row" data-custom-hair aria-label="머리 색상"></div>
        <div class="room-customize-grid is-hairstyles" data-custom-hairstyles aria-label="헤어스타일"></div>
        <div class="room-customize-label">헤어 액세서리 (중복 선택가능)</div>
        <div class="room-customize-grid" data-custom-accessories aria-label="헤어 액세서리"></div>
      </section>
      <section class="room-customize-tab-panel" data-custom-panel="clothes" role="tabpanel" aria-label="옷 색상" hidden>
        <div class="room-customize-grid is-outfits" data-custom-outfits aria-label="의상 종류"></div>
        <div class="room-customize-color-group">
          <div class="room-customize-outfit-symbol"><img src="${customizeAsset('Asset 43.png')}" alt="상의 색상"></div>
          <div class="room-customize-color-row" data-custom-outfit></div>
        </div>
        <div class="room-customize-color-group">
          <div class="room-customize-outfit-symbol"><img src="${customizeAsset('Asset 50.png')}" alt="하의 색상"></div>
          <div class="room-customize-color-row" data-custom-pants></div>
        </div>
        <button type="button" class="room-customize-bare-toggle" data-bare-legs aria-pressed="false" aria-label="바지색 유지 중, 맨다리로 전환" title="바지색 유지"><img src="${customizeAsset('Group 69.png')}" alt=""></button>

      </section>
    </div>
  </div>`;
  stage.appendChild(customize);
  customize.querySelector('[data-custom-preview]').appendChild(previewRenderer.domElement);
  const customizeTabIcons={hair:['Asset 41.png','Asset 44.png'],clothes:['Asset 42.png','Asset 43.png']};
  function selectCustomizeTab(tab){
    customize.querySelectorAll('[data-custom-tab]').forEach(btn=>{
      const selected=btn.dataset.customTab===tab;
      btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-selected',String(selected));
      btn.querySelector('img').src=customizeAsset(customizeTabIcons[btn.dataset.customTab][selected?0:1]);
    });
    customize.querySelectorAll('[data-custom-panel]').forEach(panel=>{panel.hidden=panel.dataset.customPanel!==tab});
  }
  customize.querySelectorAll('[data-custom-tab]').forEach(btn=>btn.addEventListener('click',()=>selectCustomizeTab(btn.dataset.customTab)));
  const zoomButton=document.createElement('button');zoomButton.type='button';zoomButton.className='room-stage-zoom-button';zoomButton.textContent='⛶ 크게 보기';zoomButton.setAttribute('aria-label','미니룸 확대하기');stage.appendChild(zoomButton);
  // Move the stage outside transformed diary/page containers while enlarged.
  // position:fixed inside a transformed ancestor is relative to that ancestor,
  // which caused the enlarged room to overflow at the upper-left of the page.
  const zoomPlaceholder=document.createComment('miniroom zoom original position');
  let zoomOriginalParent=null;
  function setRoomZoom(enabled){
    if(enabled){
      if(stage.classList.contains('room-stage-zoomed'))return;
      zoomOriginalParent=stage.parentNode;
      zoomOriginalParent.insertBefore(zoomPlaceholder,stage);
      document.body.appendChild(stage);
      stage.classList.add('room-stage-zoomed');
    }else{
      stage.classList.remove('room-stage-zoomed');
      if(zoomPlaceholder.parentNode){
        zoomPlaceholder.parentNode.insertBefore(stage,zoomPlaceholder);
        zoomPlaceholder.remove();
      }
      zoomOriginalParent=null;
    }
    for(const button of [pcOverlay.querySelector('[data-pc-play]'),gallery.querySelector('[data-gallery-preview]')]){if(button){button.setAttribute('aria-disabled',String(enabled));button.style.opacity=enabled?'.48':'';button.style.cursor=enabled?'not-allowed':'';button.title=enabled?'원래 크기로 돌아간 후 이동할 수 있어요':'';}}
    zoomButton.textContent=enabled?'⤢ 원래 크기':'⛶ 크게 보기';
    zoomButton.setAttribute('aria-label',enabled?'미니룸 원래 크기로':'미니룸 확대하기');
    resize();
  }
  zoomButton.addEventListener('click',()=>{if(!customize.hidden)return;setRoomZoom(!stage.classList.contains('room-stage-zoomed'))});
  // Match asset placement in the Figma frame. Extra assets are retained in the
  // supplied ZIP but not inserted as unrelated extra options.
  const hairThumbs={1:'Asset 33.png',2:'Asset 35.png',3:'Asset 34.png',4:'Asset 52.png'};
  for(let i=1;i<=4;i++){
    const btn=document.createElement('button');btn.type='button';btn.className='room-customize-card is-warm';
    btn.dataset.hairStyle=String(i);btn.setAttribute('aria-label','헤어 '+i);btn.setAttribute('aria-pressed',String(i===activeHair));
    const img=document.createElement('img');img.src=customizeAsset(hairThumbs[i]);img.alt='';btn.appendChild(img);
    btn.addEventListener('click',()=>setHairStyle(i));
    customize.querySelector('[data-custom-hairstyles]').appendChild(btn);
  }
  const bodyThumbs={1:'Asset 45.png',2:'Asset 46.png',3:'Asset 47.png'};
  for(let i=1;i<=3;i++){
    const btn=document.createElement('button');btn.type='button';btn.className='room-customize-card is-warm';
    btn.dataset.bodyStyle=String(i);btn.setAttribute('aria-label',['','바지','치마','원피스'][i]);
    const img=document.createElement('img');img.src=customizeAsset(bodyThumbs[i]);img.alt='';btn.appendChild(img);
    btn.addEventListener('click',()=>setBodyStyle(i));
    customize.querySelector('[data-custom-outfits]').appendChild(btn);
  }
  customize.querySelector('[data-bare-legs]').addEventListener('click',()=>setBareLegs(!bareLegs));
  setBodyStyle(activeBody);setBareLegs(bareLegs);
  const accessoryOrder=['bun','ponytail','mandubuns','pigtails','hat','rabbit hat','hairpinL','hairpinR'];
  const accessoryThumbs={'bun':'Asset 25.png','ponytail':'Asset 27.png','mandubuns':'Asset 26.png','pigtails':'Asset 28.png','hat':'Asset 29.png','rabbit hat':'Asset 32.png','hairpinL':'Asset 30.png','hairpinR':'Asset 31.png'};
  for(const name of accessoryOrder){
    const btn=document.createElement('button');btn.type='button';btn.className='room-customize-card'+(['hat','rabbit hat','hairpinL','hairpinR'].includes(name)?' is-warm':'');
    btn.dataset.accessory=name;btn.setAttribute('aria-label',accessoryLabels[name]||name);
    const img=document.createElement('img');img.src=customizeAsset(accessoryThumbs[name]);img.alt='';btn.appendChild(img);
    btn.addEventListener('click',()=>toggleAccessory(name));
    customize.querySelector('[data-custom-accessories]').appendChild(btn);
  }
  updateAccessories();
  setHairStyle(activeHair);
  const hairColors=['#6C5264','#493036','#A17A6C','#D5A0BD','#F2D3A3'];
  // Temporary clothes-tab palettes, deliberately separate from the hair choice.
  const outfitColors=['#E7A3C7','#F6D8E8','#83A995','#B5C8DF','#F6D88F'];
  const pantsColors=['#83A995','#F6D8E8','#B5C8DF','#C6A08C','#493036'];
  function updateCustomizeSwatches(){
    const colorMap={hair:'#'+hair.color.getHexString(),outfit:'#'+outfit.color.getHexString(),pants:'#'+pants.color.getHexString()};
    customize.querySelectorAll('[data-custom-color]').forEach(btn=>{
      const selected=colorMap[btn.dataset.customColor].toLowerCase()===btn.dataset.color.toLowerCase();
      btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-pressed',String(selected));
    });
    customize.querySelectorAll('[data-hair-style]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.classList.contains('is-selected'))));
  }
  function applyCharacterColors(h,o,p){
    hair.color.set(h);outfit.color.set(o);pants.color.set(p);tintModelParts();
    try{
      localStorage.setItem('minihome_character_colors',JSON.stringify({hair:h,outfit:o,pants:p}));
      localStorage.setItem('minihome_character_pants',p);
    }catch(_){}
    updateCustomizeSwatches();
  }
  try{
    const saved=JSON.parse(localStorage.getItem('minihome_character_colors')||'null');
    const savedPants=localStorage.getItem('minihome_character_pants');
    if(saved?.hair||saved?.outfit||saved?.pants||savedPants)
      applyCharacterColors(saved?.hair||'#6c5264',saved?.outfit||'#e7a3c7',savedPants||saved?.pants||'#83a995');
  }catch(_){}
  for(const [key,colors] of [['hair',hairColors],['outfit',outfitColors],['pants',pantsColors]])for(const color of colors){
    const btn=document.createElement('button');btn.type='button';btn.className='room-customize-swatch';
    btn.dataset.customColor=key;btn.dataset.color=color;
    btn.style.background=color;btn.setAttribute('aria-label',key+' '+color);
    btn.addEventListener('click',()=>applyCharacterColors(
      key==='hair'?color:'#'+hair.color.getHexString(),
      key==='outfit'?color:'#'+outfit.color.getHexString(),
      key==='pants'?color:'#'+pants.color.getHexString()
    ));
    customize.querySelector('[data-custom-'+key+']').appendChild(btn);
  }
  updateCustomizeSwatches();
  function closeCustomize(){customize.hidden=true}
  customize.querySelector('[data-custom-close]').addEventListener('click',closeCustomize);
  customize.addEventListener('click',e=>{if(e.target===customize)closeCustomize()});
  function fitCustomizePanel(){
    const panel=customize.querySelector('.room-customize-panel');
    const w=Math.max(1,stage.clientWidth-24),h=Math.max(1,stage.clientHeight-24);
    const scale=Math.min(1,w/885,h/536);
    panel.style.transform=`scale(${scale})`;
  }
  window.addEventListener('resize',()=>{if(!customize.hidden)fitCustomizePanel()});
  function openCustomize(){fitCustomizePanel();selectCustomizeTab('hair');updateCustomizeSwatches();customize.hidden=false;syncPreview();status.textContent='거울에서 캐릭터를 꾸며보세요 ♡'}
  const reset=document.getElementById('room3d-reset');function onReset(){camera.position.copy(initial.position);controls.target.copy(initial.target);controls.update();status.textContent='처음 시점으로 돌아왔습니다 ♡'}
  renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('pointerup',onUp);renderer.domElement.addEventListener('pointercancel',onUp);reset?.addEventListener('click',onReset);
  function animate(){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
    for(const [group,effect] of pressEffects){
      const next=effect.elapsed+dt;
      // Move the entire C4D object very slightly; never change exported scale.
      const pulse=Math.sin(Math.PI*Math.min(1,next/.30));
      group.position.y=effect.originalY-(labelFor(group.name)==='천장 선반'?0:.028*pulse);
      // A subtle squash is more visible than a small vertical movement alone.
      group.scale.copy(effect.originalScale).multiplyScalar(1-(labelFor(group.name)==='천장 선반'?.14:.055)*pulse);
      if(next>=.30){group.position.y=effect.originalY;group.scale.copy(effect.originalScale);pressEffects.delete(group)}
      else effect.elapsed=next;
    }
    if(mode==='wander'){nextChoice-=dt;if(nextChoice<=0)chooseTarget();const dx=walkTarget.x-character.position.x,dz=walkTarget.z-character.position.z,dist=Math.hypot(dx,dz);
      if(dist>.12){const step=Math.min(dist,dt*.48);if(!walkStep(dx/dist,dz/dist,step)){chooseTarget()}character.rotation.y=Math.atan2(dx,dz);walkPhase+=dt*9;leftLeg.rotation.x=Math.sin(walkPhase)*.38;rightLeg.rotation.x=-Math.sin(walkPhase)*.38;leftArm.rotation.x=-Math.sin(walkPhase)*.28;rightArm.rotation.x=Math.sin(walkPhase)*.28;puppet.position.y=Math.abs(Math.sin(walkPhase))*.035}
      else {leftLeg.rotation.x*=.85;rightLeg.rotation.x*=.85;leftArm.rotation.x*=.85;rightArm.rotation.x*=.85;puppet.position.y=0}}
    if(mode==='held'){
      puppet.position.y=Math.sin(t*11)*.038;
      puppet.rotation.z=Math.sin(t*9)*.13;puppet.rotation.x=.10+Math.sin(t*12)*.055;
      leftLeg.rotation.x=Math.sin(t*15)*.62;rightLeg.rotation.x=-Math.sin(t*15+0.7)*.62;
      leftArm.rotation.x=Math.sin(t*17)*.68;rightArm.rotation.x=-Math.sin(t*17+0.8)*.68;
    }
    if(mode==='sleep'){puppet.position.y=Math.sin(t*2)*.015;leftLeg.rotation.x=0;rightLeg.rotation.x=0}
    if(mode==='sit'){puppet.position.y=Math.sin(t*2)*.012;leftLeg.rotation.x=-.7;rightLeg.rotation.x=-.7}
    // Three softly fading z's rise continuously only while sleeping.
    for(let i=0;i<sleepLetters.length;i++){
      const z=sleepLetters[i];z.visible=mode==='sleep';
      if(!z.visible)continue;
      const phase=((t*.36+i/3)%1+1)%1;
      // Above the sleeping character's head, rather than low beside the curtains.
      z.position.set(-.12+phase*.18,.94+phase*.36,-.58);
      const size=(.23+phase*.15)*3;z.scale.set(size,size,1);
      z.material.opacity=1; // Solid chocolate lettering; only canvas anti-aliasing softens edges.
    }

    if(pcMode==='approach'||pcMode==='return'||pcMode==='galleryApproach'||pcMode==='mirrorApproach'){
      pcProgress=Math.min(1,pcProgress+dt/1.05);
      const k=pcProgress*pcProgress*(3-2*pcProgress);
      const goal=pcMode==='return'?pcReturn:pcGoal;
      if(!goal){console.error('[miniroom] Camera goal missing:',pcMode);pcMode='idle';controls.enabled=true;controls.update();}else{
      camera.position.copy(pcStart.position).lerp(goal.position,k);
      controls.target.copy(pcStart.target).lerp(goal.target,k);
      if(pcProgress>=1){if(pcMode==='approach'){pcMode='desktop';pcOverlay.classList.add('is-open');pcOverlay.setAttribute('aria-hidden','false');pcOverlay.querySelector('[data-pc-play]').focus();status.textContent='미니게임 실행 확인창입니다 ♡'}else if(pcMode==='mirrorApproach'){pcMode='mirror';openCustomize()}else if(pcMode==='galleryApproach'){pcMode='gallery';gallery.classList.add('is-open');gallery.setAttribute('aria-hidden','false');gallery.querySelector('[data-gallery-close]').focus();status.textContent='액자 속 작품을 감상해 보세요 ♡'}else{pcMode='idle';controls.enabled=true}}
      }
    }
    if(curtainLeft&&curtainRight){
      curtainProgress=THREE.MathUtils.damp(curtainProgress,curtainTarget,7,dt);
      // Window stays fixed. Curtains slide OUTWARD along world X, and gather
      // narrower as they open. Their exported transforms remain the baseline.
      const mid=(curtainRest.get(curtainLeft).position.x+curtainRest.get(curtainRight).position.x)/2;
      for(const curtain of [curtainLeft,curtainRight]){
        const rest=curtainRest.get(curtain);
        const direction=rest.position.x<mid?-1:1;
        curtain.position.x=rest.position.x+direction*.12*curtainProgress;
        curtain.scale.x=rest.scale.x*THREE.MathUtils.lerp(CURTAIN_CLOSED_WIDTH,CURTAIN_OPEN_WIDTH,curtainProgress);
      }
    }
    if(boxLid){boxLidProgress=THREE.MathUtils.damp(boxLidProgress,boxLidTarget,9,dt);boxLid.position.y=boxLidY+boxLidProgress*.075}
    // Forward-facing shoulder yaw belongs ONLY to the seated typing pose.
    // Reset it every frame when walking, sleeping or being held so the
    // previous seated pose cannot leak into other animations.
    if(mode!=='sit'){
      leftArm.rotation.y=0;
      rightArm.rotation.y=0;
    }
    // Apply animation before converting to the original C4D joint quaternions.
    leftArm.rotation.z=-.72;rightArm.rotation.z=.72;
    if(mode==='held'){
      leftArm.rotation.z=-.50+Math.sin(t*16)*.22;
      rightArm.rotation.z=.50-Math.sin(t*16+1.2)*.22;
    }else if(mode==='sleep'){
      leftArm.rotation.x=0;rightArm.rotation.x=0;
      leftLeg.rotation.x=0;rightLeg.rotation.x=0;
    }else if(mode==='sit'){
      // First aim both arms toward the desk, then swing the ENTIRE arm
      // vertically at the shoulder (not a tiny wrist-like yaw twitch).
      leftArm.rotation.set(0,-1.13,0);
      rightArm.rotation.set(0,1.13,0);
      leftLeg.rotation.x=-1.23;rightLeg.rotation.x=-1.23;
    }
    updateBlink(dt);
    updateEyeVisibility();
    for(const g of [leftArm,rightArm,leftLeg,rightLeg]){
      const target=g.userData.target,base=limbBaseRotations.get(g);
      if(target&&base){
        if(mode==='sit' && (g===leftArm||g===rightArm)){
          // Parent-space shoulder pitch makes the forward-pointing arms flap UP/DOWN.
          // Apply it after the forward-facing yaw and before the exported rest pose.
          const side=g===leftArm?0:Math.PI;
          const pitch=-0.12+Math.sin(t*8+side)*0.34;
          const pitchQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch);
          const forwardQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),g===leftArm?-1.13:1.13);
          target.quaternion.copy(pitchQ.multiply(forwardQ).multiply(base));
        }else{
          const offset=new THREE.Quaternion().setFromEuler(g.rotation);
          target.quaternion.copy(offset.multiply(base));
        }
      }
    }
    controls.update();updateFurnitureMessage(t);renderer.render(scene,camera);
    if(!customize.hidden){
      const rect=previewRenderer.domElement.getBoundingClientRect();
      const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
      if(previewRenderer.domElement.width!==Math.round(w*previewRenderer.getPixelRatio())||previewRenderer.domElement.height!==Math.round(h*previewRenderer.getPixelRatio())){
        previewRenderer.setSize(w,h,false);previewCamera.aspect=w/h;previewCamera.updateProjectionMatrix();
      }
      syncPreview();previewControls.update();previewRenderer.render(previewScene,previewCamera);
    }
  }animate();status.textContent='캐릭터를 마우스로 집어서 침대나 의자에 놓아보세요 ♡';
  return ()=>{window.removeEventListener('minihome:claw-collection-changed',onToyCollectionChanged);window.removeEventListener('storage',onToyCollectionChanged);inventory.remove();inventoryStyle.remove();themeSelect.removeEventListener('change',onRoomThemeChange);window.removeEventListener('minihome:site-theme-changed',onSiteThemeChange);themeBar.remove();furnitureMessage.remove();furnitureMessageStyle.remove();if(status){if(statusPreviousStyle===null)status.removeAttribute('style');else status.setAttribute('style',statusPreviousStyle);}document.removeEventListener('keydown',onPcKey);pcOverlay.remove();pcStyle.remove();gallery.remove();galleryStyle.remove();customize.remove();customizeStyle.remove();zoomButton.remove();setRoomZoom(false);previewControls.dispose();previewRenderer.dispose();sleepLetters.forEach(z=>z.material.dispose());sleepZTexture.dispose();stage.style.position=stagePosition;disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointermove',onMove);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('pointercancel',onUp);reset?.removeEventListener('click',onReset);controls.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});renderer.dispose();renderer.domElement.remove()};
}
function sync(){const stage=document.getElementById('room3d-stage');if(!stage){if(cleanup){cleanup();cleanup=null}return}if(stage.dataset.initialized)return;stage.dataset.initialized='true';try{cleanup=setup(stage)}catch(err){document.getElementById('room3d-status').textContent='3D 로딩에 실패했습니다. 로컬 서버로 실행해 주세요.';console.error(err)}}
new MutationObserver(sync).observe(content,{childList:true});sync();
