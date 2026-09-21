import { content } from './content.js';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const total = content.gifts.length;
const stored = (() => { try { return JSON.parse(sessionStorage.getItem('anniversary-progress') || '{}'); } catch { return {}; } })();
const restoredOpened = Array.isArray(stored.opened) ? [...new Set(stored.opened.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < total))] : [];
// Show the welcome screen on each visit: its button is the gesture that enables background audio.
const state = { started: false, opened: restoredOpened, zone: Math.min(4, Math.max(0, stored.zone || 0)), muted: stored.muted === true, dialog: null, letterPage: 0, song: Number.isInteger(stored.song) ? Math.min(content.songs.length-1, Math.max(0, stored.song)) : 0, playing: false, progress: 0, chestPhase: '' };
let audioContext, melodyTimer, htmlAudio, melodyIndex = 0, openingTimer, closingTimer, fireworksFrame, fireworkVisibilityHandler;
const rocketSprite = new Image();
rocketSprite.src = './firework-rocket.png';
const activeSounds = new Set();
const activeSoundSources = new Set();
const soundFiles = { chestOpen:'./sounds/chest-open.ogg', chestClose:'./sounds/chest-close.ogg', pageTurn:'./sounds/page-turn.ogg', fireworkLaunch:'./sounds/firework-launch.ogg', fireworkBlast:'./sounds/firework-blast.ogg', fireworkTwinkle:'./sounds/firework-twinkle.ogg' };
const soundBank = Object.fromEntries(Object.entries(soundFiles).map(([name,url]) => { const audio = new Audio(url); audio.preload = 'auto'; return [name,audio]; }));
const decodedSounds = new Map();
try {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  for (const [name, url] of Object.entries(soundFiles)) {
    fetch(url).then(response => {
      if (!response.ok) throw new Error(`Could not load ${url}`);
      return response.arrayBuffer();
    }).then(data => audioContext.decodeAudioData(data)).then(buffer => decodedSounds.set(name, buffer)).catch(() => {});
  }
} catch { /* The preloaded audio elements remain available as a fallback. */ }
const terrainFiles = { grass:'./grass-block.png', dirt:'./dirt-block.png', stone:'./stone-block.png', coal:'./stone-ore.png', mottled:'./stone-mottled.png', iron:'./iron-ore.png', diorite:'./diorite-block.png', granite:'./granite-block.png' };
const terrainTextures = Object.fromEntries(Object.entries(terrainFiles).map(([name,url]) => { const img = new Image(); img.src=url; return [name,img]; }));
const terrainReady = Promise.all(Object.values(terrainTextures).map(img => img.decode().catch(() => null)));
let terrainObserver;
function terrainHash(x, y) { let n = Math.imul(x + 137, 374761393) + Math.imul(y + 73, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; }
function paintTerrain(canvas) {
  if (!canvas.isConnected) return;
  const parent=canvas.parentElement, width=parent.clientWidth, height=parent.clientHeight;
  const tile=matchMedia('(max-width:680px)').matches ? 48 : 64;
  const dpr=Math.min(devicePixelRatio || 1, 2);
  canvas.width=Math.ceil(width*dpr); canvas.height=Math.ceil(height*dpr);
  const ctx=canvas.getContext('2d'); if(!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false;
  const cols=Math.ceil(width/tile), rows=Math.ceil(height/tile), left=Math.floor((width-cols*tile)/2);
  const crop={grass:1,dirt:3,stone:1,coal:1,mottled:1,iron:0,diorite:1,granite:1};
  for(let col=0;col<cols;col++) {
    const dirtDepth=2+terrainHash(Math.floor(col/2),9)%3;
    for(let row=0;row<rows;row++) {
      let kind;
      if(row===0) kind='grass';
      else if(row<=dirtDepth) kind='dirt';
      else {
        const roll=terrainHash(col,row)%100;
        kind=roll<7?'coal':roll<14?'iron':roll<23?'diorite':roll<32?'granite':roll<57?'mottled':'stone';
      }
      const img=terrainTextures[kind], x=left+col*tile, y=row*tile, inset=crop[kind];
      if(img.naturalWidth) ctx.drawImage(img,inset,inset,img.naturalWidth-inset*2,img.naturalHeight-inset*2,x,y,tile,tile);
      else { ctx.fillStyle=kind==='grass'?'#5a8f3e':kind==='dirt'?'#76513a':'#696d6b'; ctx.fillRect(x,y,tile,tile); }
      ctx.fillStyle='rgba(17,25,24,.15)'; ctx.fillRect(x,y,tile,1); ctx.fillRect(x,y,1,tile);
    }
  }
  ctx.fillStyle='rgba(10,35,46,.67)';
  ctx.fillRect(0,tile*4,width,Math.max(0,height-tile*4));
}
function mountTerrain() {
  terrainObserver?.disconnect();
  const canvas=$('.terrain-canvas'); if(!canvas) return;
  const draw=()=>paintTerrain(canvas);
  terrainObserver=new ResizeObserver(() => requestAnimationFrame(draw));
  terrainObserver.observe(canvas.parentElement);
  terrainReady.then(draw);
}
const save = () => sessionStorage.setItem('anniversary-progress', JSON.stringify({ started: state.started, opened: state.opened, zone: state.zone, muted: state.muted, song: state.song }));
const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const controlIcons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h5v16H5zm9 0h5v16h-5z" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zM16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>'
};
const pixelClock = '<svg viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges"><path d="M10 3h12v2h4v4h2v14h-2v4h-4v2H10v-2H6v-4H4V9h2V5h4zM16 9v8h7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/></svg>';
const giftIcon = gift => gift.icon === 'clock' ? pixelClock : esc(gift.icon);
let lockedScrollY = null;
function syncScrollLock() {
  const shouldLock = !state.started || state.dialog !== null;
  if (shouldLock && lockedScrollY === null) {
    lockedScrollY = window.scrollY;
    document.documentElement.classList.add('scroll-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = '100%';
  } else if (!shouldLock && lockedScrollY !== null) {
    const y = lockedScrollY;
    lockedScrollY = null;
    document.documentElement.classList.remove('scroll-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previous; });
  }
}

function tone(freq = 520, duration = .08, type = 'sine', volume = .035) {
  if (state.muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + duration);
  } catch { /* Audio is optional. */ }
}
function chime() { [523, 659, 784].forEach((n, i) => setTimeout(() => tone(n, .22, 'triangle', .04), i * 95)); }
function playSound(name, volume = .5) {
  if (state.muted || !soundBank[name]) return;
  const buffer = decodedSounds.get(name);
  if (buffer && audioContext) {
    try {
      if (audioContext.state === 'suspended') void audioContext.resume();
      const source = audioContext.createBufferSource(), gain = audioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(audioContext.destination);
      activeSoundSources.add(source);
      source.addEventListener('ended', () => activeSoundSources.delete(source), {once:true});
      source.start();
      return;
    } catch { /* Use the preloaded audio element if Web Audio is unavailable. */ }
  }
  const sound = soundBank[name];
  sound.currentTime = 0;
  sound.volume = volume;
  activeSounds.add(sound);
  sound.addEventListener('ended', () => activeSounds.delete(sound), {once:true});
  sound.play().catch(() => activeSounds.delete(sound));
}
function silenceEffects() {
  for (const source of activeSoundSources) { try { source.stop(); } catch {} }
  activeSoundSources.clear();
  for (const sound of activeSounds) { sound.pause(); sound.currentTime = 0; }
  activeSounds.clear();
}
function toast(message) {
  const box = $('#toast'); box.textContent = message; box.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove('show'), 3300);
}
function progressLabel() { return `${state.opened.length}/${total}`; }
function isLocked(i) { return i === 4 && ![0,1,2,3].every(n => state.opened.includes(n)); }
function missingGiftIndex() { return [0,1,2,3].find(n => !state.opened.includes(n)); }
function progressHint() {
  const missing = missingGiftIndex();
  if (missing !== undefined) return `FALTA ABRIR: ${content.gifts[missing].title.toUpperCase()} ↗`;
  return state.opened.includes(4) ? 'TODOS LOS COFRES DESCUBIERTOS ♥' : 'EL ÚLTIMO COFRE ESTÁ DESBLOQUEADO ↗';
}
function zoneStars() { return Array.from({length: 18}, (_,i) => `<i style="--x:${(i * 73 + 11) % 100}%;--y:${(i * 37 + 8) % 65}%;--delay:${(i % 7) * -.5}s"></i>`).join(''); }
function flowerField(variant = 'scene') {
  const flowers = variant === 'intro'
    ? [[3,34,0],[9,46,4],[15,27,0],[84,30,1],[91,43,5],[97,32,0]]
    : [[3,28,0],[6,43,3],[10,25,0],[20,36,5],[24,48,0],[28,29,2],[33,39,0],[67,31,1],[71,45,5],[75,27,0],[84,39,3],[89,26,0],[94,43,4]];
  return `<div class="yellow-flower-field ${variant}" aria-hidden="true">${flowers.map(([x,size,lift],n)=>`<img src="./dandelion.png" alt="" style="--x:${x}%;--size:${size}px;--lift:${lift}px;--delay:${n*-.45}s">`).join('')}</div>`;
}
function scene() {
  const zone = content.zones[state.zone], gift = content.gifts[state.zone], opened = state.opened.includes(state.zone), locked = isLocked(state.zone);
  return `<section class="scene ${zone.sky}" aria-label="${esc(zone.name)}" style="--zone-background:url('${esc(encodeURI(zone.background))}')">
    <div class="stars">${zoneStars()}</div>${flowerField()}
    <div class="sky-particles" aria-hidden="true">${Array.from({length:12},(_,i)=>`<b style="--x:${(i*79+12)%98}%;--y:${(i*29+17)%85}%;--delay:${i*-.53}s"></b>`).join('')}</div>
    <button class="secret-flower" data-action="secret-flower" aria-label="Descubrir la flor secreta" title="¿Qué es esto?">✿</button>
    <button class="secret-moon" data-action="secret-moon" aria-label="Descubrir secreto del cielo" title="Algo brilla aquí">✦</button>
    <div class="scene-content">
      <div class="chapter-label"><span class="chapter-spark">✦</span> CAPÍTULO ${String(state.zone+1).padStart(2,'0')}${state.zone ? ` <span class="chapter-line"></span> ${esc(zone.name.toUpperCase())}` : ''}</div>
      <div class="chapter-inner">
        <div class="chapter-copy"><div class="tiny-label">${esc(gift.tag)} · ${opened ? 'DESCUBIERTO' : locked ? 'BLOQUEADO' : 'POR DESCUBRIR'}</div><h1>${esc(gift.title)}</h1><p>${esc(gift.description)}</p><div class="chapter-hint">${esc(locked ? `Antes abrí el cofre de ${content.gifts[missingGiftIndex()].title}` : zone.hint)}</div></div>
        <button class="chest mc-chest ${locked?'locked':''} ${state.chestPhase}" data-action="open" aria-label="${locked?'Cofre bloqueado':'Abrir '+esc(gift.title)}" ${locked?'aria-disabled="true"':''}>
          <span class="mc-glow"></span><span class="mc-shadow"></span><span class="mc-body"></span><span class="mc-interior"></span><span class="mc-lid-assembly"><span class="mc-lid-top"></span><span class="mc-lid"><span class="mc-lock"></span></span></span>
          <span class="mc-prompt">${locked?'ABRÍ LOS OTROS 4':opened?'VOLVER A VER':'TOCÁ PARA ABRIR'}</span>
        </button>
      </div>
      <div class="scene-bottom"><span class="coordinate">✧ X: ${210 + state.zone * 144} &nbsp; Y: 64 &nbsp; Z: ${14 + state.zone * 28}</span>${state.zone ? `<span class="biome-name">BIOMA · ${esc(zone.name.toUpperCase())}</span>` : ''}</div>
    </div>
  </section>`;
}
function render() {
  const first = content.couple.first, second = content.couple.second;
  app.innerHTML = `<div class="site-shell ${state.started?'adventure-started':''}">
    <header class="topbar"><a class="brand" href="#" data-action="home" aria-label="Volver al inicio"><span class="brand-heart">♥</span><span>UN MUNDO <small>PARA NOSOTROS</small></span></a><div class="top-actions"><span class="date-badge">${esc(first)} <span>✦</span> ${esc(second)}</span><button class="icon-btn music-toggle ${state.playing?'music-active':''}" data-action="music-toggle" title="${state.playing?'Pausar':'Reproducir'} música de fondo" aria-label="${state.playing?'Pausar':'Reproducir'} música de fondo">${state.playing?controlIcons.pause:controlIcons.play}</button><button class="icon-btn" data-action="mute" title="${state.muted?'Activar':'Silenciar'} sonido" aria-label="${state.muted?'Activar':'Silenciar'} sonido">${state.muted?controlIcons.muted:controlIcons.sound}</button></div></header>
    <main>${scene()}<div class="underworld"><canvas class="terrain-canvas" aria-hidden="true"></canvas><section class="quest-area" aria-label="Mapa de regalos"><div class="quest-head"><div><span class="eyebrow">TU INVENTARIO DE MOMENTOS</span><h2>La aventura continúa <span>✦</span></h2><p>Elegí un cofre para explorar cada rincón de nuestra historia.</p></div><div class="progress-box" aria-label="Progreso ${progressLabel()}"><span>REGALOS ENCONTRADOS</span><strong>${progressLabel()}</strong><div class="progress-bar"><i style="width:${state.opened.length/total*100}%"></i></div></div></div>
      <div class="quest-grid">${content.gifts.map((g,i)=>`<button class="quest-card ${i===state.zone?'active':''} ${state.opened.includes(i)?'collected':''} ${isLocked(i)?'quest-locked':''}" data-action="zone" data-zone="${i}" aria-label="Ir a ${esc(g.title)}${isLocked(i)?', bloqueado':''}"><span class="quest-card-number">${String(i+1).padStart(2,'0')}</span><span class="quest-icon">${isLocked(i)?'◇':giftIcon(g)}</span><span class="quest-name">${esc(g.title)}</span><span class="quest-state">${state.opened.includes(i)?'✓ DESCUBIERTO':isLocked(i)?'◆ BLOQUEADO':'EXPLORAR ↗'}</span></button>`).join('')}</div>
      <div class="map-nav"><button data-action="previous" ${state.zone===0?'disabled':''}>← BIOMA ANTERIOR</button><div class="map-dots">${content.zones.map((_,i)=>`<button data-action="zone" data-zone="${i}" class="${state.zone===i?'current':''}" aria-label="Ir al bioma ${i+1}"></button>`).join('')}</div><button data-action="next" ${state.zone===4?'disabled':''}>SIGUIENTE BIOMA →</button></div>
    </section><footer><span>✦ Hecho con amor, bloque por bloque.</span><span>Una historia para seguir construyendo.</span></footer></div></main>
    ${!state.started ? `<div class="intro" role="dialog" aria-modal="true" aria-label="Comenzar aventura"><div class="intro-grain"></div>${flowerField('intro')}<div class="intro-content"><span class="intro-eyebrow">✦ ${esc(content.intro.eyebrow)} ✦</span><div class="intro-flower" aria-hidden="true"><img src="./dandelion.png" alt=""></div><h2>${esc(content.intro.titleTop)}<br><em>${esc(content.intro.titleHighlight)}</em><br>${esc(content.intro.titleBottom)} <span>♥</span></h2><p>${esc(content.intro.subtitle)}</p><button class="primary-btn" data-action="start"><span>▶</span> ${esc(content.intro.start)}</button><div class="intro-foot">${esc(first.toUpperCase())} + ${esc(second.toUpperCase())} <span>·</span> ${esc(content.couple.specialDate.toUpperCase())}</div></div><div class="intro-ground"></div></div>` : ''}
    <div id="toast" class="toast" role="status"></div><div id="dialog-root"></div>
  </div>`;
  const nextGift = missingGiftIndex() ?? (state.opened.includes(4) ? null : 4);
  $('.progress-box')?.insertAdjacentHTML('beforeend', nextGift === null
    ? `<span class="progress-tip">${esc(progressHint())}</span>`
    : `<button class="progress-tip" data-action="zone" data-zone="${nextGift}" title="Ir al cofre que falta">${esc(progressHint())}</button>`);
  mountTerrain();
  if (state.dialog !== null) renderDialog();
  syncScrollLock();
}
function dialogBody(i) {
  if (i === 0) return `<div class="timeline">${content.timeline.map((item,n)=>`<div class="timeline-item"><div class="timeline-node">${n+1}</div><div><span>${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></div>`).join('')}</div>`;
  if (i === 1) return `<div class="memory-grid">${content.memories.map((item,n)=>`<article class="memory-card"><div class="memory-frame"><div class="memory-photo ${esc(item.tone)}" ${item.image?`style="background-image:url('${encodeURI(item.image)}')"`:''}><span>${item.image?'':item.icon}</span><small>${item.image?'':'FOTO '+String(n+1).padStart(2,'0')+' · REEMPLAZABLE'}</small></div></div><div class="memory-caption"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join('')}</div>`;
  if (i === 2) { const page = content.letter[state.letterPage]; return `<div class="book"><div class="book-spine"></div><div class="book-page"><span class="book-top">DE MI CORAZÓN PARA EL TUYO</span><div class="book-ornament">❧</div><h3>${esc(page.heading)}</h3><p>${esc(page.body)}</p><div class="book-bottom"><span>página ${state.letterPage+1} de ${content.letter.length}</span><div><button data-action="letter-prev" ${state.letterPage===0?'disabled':''} aria-label="Página anterior">←</button><button data-action="letter-next" ${state.letterPage===content.letter.length-1?'disabled':''} aria-label="Página siguiente">→</button></div></div></div></div>`; }
  if (i === 3) { const song = content.songs[state.song]; return `<div class="jukebox"><div class="record-area"><div class="record ${state.playing?'spinning':''}"><div class="record-label">♥</div></div><div class="record-needle"></div></div><div class="player-area"><span class="player-label">${state.playing?'TOCANDO EN EL TOCADISCOS':'TOCADISCOS EN PAUSA'}</span><h3>${esc(song.title)}</h3><p>${esc(song.artist)}</p><div class="player-progress"><i style="width:${state.progress}%"></i></div><div class="player-controls"><button data-action="song-prev" aria-label="Canción anterior">◀◀</button><button class="play-btn" data-action="song-toggle" aria-label="${state.playing?'Pausar':'Reproducir'}">${state.playing?controlIcons.pause:controlIcons.play}</button><button data-action="song-next" aria-label="Canción siguiente">▶▶</button></div><div class="playlist">${content.songs.map((s,n)=>`<button class="${state.song===n?'selected':''}" data-action="song-select" data-song="${n}"><span>${n+1}. ${esc(s.title)}</span><small>${esc(s.artist)}</small></button>`).join('')}</div><p class="player-note">♫ No sabia q canciones ponerrr</p></div></div>`; }
  return `<div class="finale"><canvas class="fireworks-canvas" aria-hidden="true"></canvas><div class="finale-heart">♥</div><span class="finale-kicker">MISIÓN COMPLETADA · 5/5</span><h3>${esc(content.finale.title)}</h3><p>${esc(content.finale.message)}</p><strong>${esc(content.finale.signature)}</strong><div class="finale-stars">✦ ✧ ✦ ✧ ✦</div></div>`;
}
function renderDialog() {
  const i = state.dialog, gift = content.gifts[i], root = $('#dialog-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="close"><section class="modal ${i===4?'final-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-header"><div><span>${esc(gift.tag)} · REGALO DESCUBIERTO</span><h2 id="modal-title">${esc(gift.title)}</h2></div><button class="modal-close" data-action="close" aria-label="Cerrar regalo">×</button></div><div class="modal-body">${dialogBody(i)}</div><div class="modal-footer"><span>✦ ${esc(content.couple.first)} + ${esc(content.couple.second)}</span><button data-action="close">VOLVER AL MUNDO ↗</button></div></section></div>`;
  $('.modal', root)?.focus();
  if (i === 4) startFireworks();
}
function stopFireworks() {
  cancelAnimationFrame(fireworksFrame);
  if (fireworkVisibilityHandler) document.removeEventListener('visibilitychange', fireworkVisibilityHandler);
  fireworksFrame = undefined;
  fireworkVisibilityHandler = undefined;
}
function startFireworks() {
  stopFireworks();
  const canvas = $('.fireworks-canvas');
  if (!canvas) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const colors = ['#ffd173','#f6a6c2','#a3e8d2','#b9bbff','#f5e9bb'];
  const rockets = [], sparks = [], flashes = [];
  let launchCount = 0;
  let lastFrameAt = 0, nextLaunchAt = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst(x, y, color, sound = true) {
    const count = reduced ? 24 : 46;
    for (let n = 0; n < count; n++) {
      const angle = n * Math.PI * 2 / count + Math.random() * .18;
      const speed = 2 + Math.random() * 3.5;
      sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1,color:n%4===0?'#fff5cc':color,size:Math.random()>.55?7:5});
    }
    flashes.push({x,y,life:1,color});
    if (sound) {
      playSound('fireworkBlast', .38);
      setTimeout(() => { if (state.dialog === 4 && !document.hidden) playSound('fireworkTwinkle', .23); }, 230);
    }
  }
  function launch() {
    if (state.dialog !== 4) return;
    const left = launchCount++ % 2 === 0;
    const x = width * (left ? .2 + Math.random()*.18 : .66 + Math.random()*.15);
    const target = height * (.13 + Math.random() * .28);
    rockets.push({x,y:height+15,target,vy:-(5.5+Math.random()*1.7),color:colors[Math.floor(Math.random()*colors.length)]});
    playSound('fireworkLaunch', .28);
  }
  function draw(now = performance.now()) {
    fireworksFrame = undefined;
    if (!reduced) {
      if (lastFrameAt && now - lastFrameAt > 300) {
        rockets.length = 0; sparks.length = 0; flashes.length = 0;
        nextLaunchAt = now;
      }
      lastFrameAt = now;
      if (now >= nextLaunchAt) { launch(); nextLaunchAt = now + 900; }
    }
    ctx.clearRect(0,0,width,height);
    for (let n=rockets.length-1;n>=0;n--) {
      const r=rockets[n]; r.y += r.vy;
      if (rocketSprite.complete && rocketSprite.naturalWidth) {
        ctx.drawImage(rocketSprite,130,40,190,303,Math.round(r.x-13),Math.round(r.y-27),26,42);
      } else {
        ctx.fillStyle=r.color; ctx.fillRect(Math.round(r.x-4),Math.round(r.y-8),9,19);
      }
      sparks.push({x:r.x,y:r.y+21,vx:(Math.random()-.5)*.8,vy:1.5,life:.32,color:'#ffd78b',size:4});
      if (r.y <= r.target) { burst(r.x,r.y,r.color); rockets.splice(n,1); }
    }
    for (let n=flashes.length-1;n>=0;n--) {
      const f=flashes[n]; f.life-=.065;
      ctx.globalAlpha=Math.max(0,f.life); ctx.fillStyle=f.color;
      const radius=Math.round((1-f.life)*30+5);
      ctx.fillRect(Math.round(f.x-radius),Math.round(f.y-4),radius*2,8);
      ctx.fillRect(Math.round(f.x-4),Math.round(f.y-radius),8,radius*2);
      ctx.globalAlpha=1;
      if(f.life<=0) flashes.splice(n,1);
    }
    for (let n=sparks.length-1;n>=0;n--) {
      const p=sparks[n]; p.x+=p.vx; p.y+=p.vy; p.vy+=.055; p.vx*=.992; p.life-=reduced ? .004 : .012;
      ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.color;
      ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
      ctx.globalAlpha=1;
      if(p.life<=0) sparks.splice(n,1);
    }
    if(!reduced && state.dialog===4 && !document.hidden) fireworksFrame=requestAnimationFrame(draw);
  }
  if (reduced) {
    burst(width*.28,height*.35,colors[0],false);
    burst(width*.75,height*.24,colors[1],false);
    draw();
    return;
  }
  function suspend() {
    cancelAnimationFrame(fireworksFrame);
    fireworksFrame = undefined;
    rockets.length = 0; sparks.length = 0; flashes.length = 0;
    lastFrameAt = 0; nextLaunchAt = 0;
    ctx.clearRect(0,0,width,height);
    silenceEffects();
  }
  function resume() {
    if (document.hidden || state.dialog !== 4 || fireworksFrame !== undefined) return;
    nextLaunchAt = performance.now();
    fireworksFrame = requestAnimationFrame(draw);
  }
  fireworkVisibilityHandler = () => { if (document.hidden) suspend(); else resume(); };
  document.addEventListener('visibilitychange', fireworkVisibilityHandler);
  resume();
}
function stopMusic() {
  state.playing = false; clearInterval(melodyTimer); melodyTimer = null;
  if (htmlAudio) { htmlAudio.pause(); htmlAudio = null; }
}
function playMusic() {
  stopMusic(); state.playing = true; state.muted = false; save();
  const song = content.songs[state.song];
  if (song.url) {
    const audio = new Audio(song.url); htmlAudio = audio;
    audio.preload = 'auto'; audio.loop = content.songs.length === 1; audio.volume = .65;
    if (!audio.loop) audio.addEventListener('ended', nextSong);
    audio.addEventListener('timeupdate', () => { if (htmlAudio !== audio) return; state.progress = audio.duration ? audio.currentTime / audio.duration * 100 : 0; const bar=$('.player-progress i'); if(bar) bar.style.width=`${state.progress}%`; });
    audio.play().catch(() => { if (htmlAudio !== audio) return; stopMusic(); render(); toast('No se pudo reproducir esta canción. Revisá su enlace.'); });
  } else {
    melodyIndex = 0;
    const tick = () => {
      if (!state.playing || document.hidden) return;
      const beat = melodyIndex % song.notes.length, note = song.notes[beat], root = song.chords[Math.floor(beat / 8) % song.chords.length];
      tone(note, .32, 'triangle', .075);
      if (beat % 2 === 0) tone(root / 2, .55, 'sine', .038);
      if (beat % 4 === 0) tone(root * 1.5, .48, 'sine', .018);
      melodyIndex++; state.progress = melodyIndex / song.notes.length * 100;
      const bar=$('.player-progress i'); if(bar) bar.style.width=`${state.progress}%`;
      if(melodyIndex >= song.notes.length) melodyIndex=0;
    };
    tick(); melodyTimer = setInterval(tick, song.tempo);
  }
  render();
}
function nextSong() { state.song = (state.song+1)%content.songs.length; state.progress=0; if(state.playing) playMusic(); else renderDialog(); }
function openGift() {
  const i=state.zone;
  if(isLocked(i)) { toast(`Antes abrí el cofre de ${content.gifts[missingGiftIndex()].title} ♥`); tone(220); return; }
  if(state.chestPhase==='opening') return;
  clearTimeout(closingTimer);
  state.chestPhase='opening';
  $('.mc-chest')?.classList.add('opening');
  playSound('chestOpen', .7);
  openingTimer=setTimeout(() => {
    if(state.zone!==i) return;
    if(!state.opened.includes(i)) { state.opened.push(i); save(); if(i===3) toast('¡El último cofre ya está listo para abrir!'); }
    state.chestPhase=''; state.dialog=i; state.letterPage=0; render();
  }, 780);
}
function closeGift() {
  if(state.dialog===null) return;
  stopFireworks(); playSound('chestClose', .65);
  state.dialog=null; state.chestPhase='closing'; render();
  clearTimeout(closingTimer);
  closingTimer=setTimeout(() => { state.chestPhase=''; $('.mc-chest')?.classList.remove('closing'); }, 500);
}
function setZone(n) {
  if(n<0 || n>=total) return;
  clearTimeout(openingTimer); stopFireworks(); state.chestPhase='';
  state.zone=n; state.dialog=null; save(); render(); window.scrollTo({top:0,behavior:'smooth'}); tone(440,.07);
  if (isLocked(n)) toast(`Para desbloquear el final, abrí el cofre de ${content.gifts[missingGiftIndex()].title}.`);
}
document.addEventListener('click', e => {
  const btn=e.target.closest('[data-action]'); if(!btn) return;
  if(btn.tagName==='A') e.preventDefault();
  const action=btn.dataset.action;
  if(action==='close' && e.target.closest('.modal') && e.target!==btn && btn.classList.contains('modal-backdrop')) return;
  if(action==='start') { state.started=true; state.song=0; save(); render(); chime(); if(!state.muted) playMusic(); toast('Tu aventura comienza aquí. Tocá el primer cofre ✦'); }
  if(action==='home') { clearTimeout(openingTimer); stopFireworks(); state.chestPhase=''; state.started=false; stopMusic(); state.dialog=null; save(); const behavior=document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0,0); document.documentElement.style.scrollBehavior=behavior; render(); }
  if(action==='mute') { state.muted=!state.muted; save(); if(state.muted) { stopMusic(); silenceEffects(); render(); } else if(state.started) playMusic(); else render(); toast(state.muted?'Sonido apagado':'Sonido activado'); }
  if(action==='music-toggle') { if(state.playing) { stopMusic(); render(); } else playMusic(); }
  if(action==='secret-flower') { toast(content.secrets.flower); chime(); }
  if(action==='secret-moon') { toast(content.secrets.moon); chime(); }
  if(action==='open') openGift();
  if(action==='zone') setZone(Number(btn.dataset.zone));
  if(action==='previous') setZone(state.zone-1);
  if(action==='next') setZone(state.zone+1);
  if(action==='close') closeGift();
  if(action==='letter-prev' && state.letterPage>0) { state.letterPage--; renderDialog(); playSound('pageTurn', .65); }
  if(action==='letter-next' && state.letterPage<content.letter.length-1) { state.letterPage++; renderDialog(); playSound('pageTurn', .65); }
  if(action==='song-toggle') { if(state.playing) { stopMusic(); render(); } else playMusic(); }
  if(action==='song-prev') { state.song=(state.song+content.songs.length-1)%content.songs.length; state.progress=0; if(state.playing) playMusic(); else renderDialog(); }
  if(action==='song-next') nextSong();
  if(action==='song-select') { state.song=Number(btn.dataset.song); state.progress=0; if(state.playing) playMusic(); else renderDialog(); }
});
document.addEventListener('keydown', e => {
  if(e.key==='Escape' && state.dialog!==null) closeGift();
  else if(state.started && state.dialog===null && e.key==='ArrowRight') setZone(state.zone+1);
  else if(state.started && state.dialog===null && e.key==='ArrowLeft') setZone(state.zone-1);
});
render();
