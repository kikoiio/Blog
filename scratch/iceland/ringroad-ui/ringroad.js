import { project, VIEWBOX } from './geography.js';

const $ = q => document.querySelector(q);
const stage = $('#stage');
const world = $('#world');
const plates = [...world.children];
const nodes = [];

const places = await fetch('places.json').then(r => r.json());
const ordered = [...places].sort((a, b) =>
  Math.atan2(a.lat - 65, (a.lon + 19) * .48) - Math.atan2(b.lat - 65, (b.lon + 19) * .48)
);

// Route positions are expressed as [0, 2π) around the island's projected centroid.
const center = ordered.reduce((s, p) => [s[0] + project(p.lon, p.lat)[0], s[1] + project(p.lon, p.lat)[1]], [0, 0])
  .map(v => v / ordered.length);
const route = ordered.map(p => {
  const [x, y] = project(p.lon, p.lat);
  return { ...p, x, y, angle: Math.atan2(y - center[1], x - center[0]) };
});
const totalKm = 1332;
const startIndex = route.findIndex(p => p.id === 'reykjavik');
const startAngle = route[startIndex].angle;
for (const p of route) p.angle = routeAngle(p.angle - startAngle);
let progress = 0;                       // radians around the route
let velocity = 0;                 // radians/s
let dragging = null;
let settledAt = 0;
let hintGone = false;
let lastFrame = performance.now();
const oneSlot = Math.PI * 2 / route.length;

function routeAngle(a) { return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); }
function nearestIndex(a) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < route.length; i++) {
    let d = Math.abs(routeAngle(route[i].angle - a));
    d = Math.min(d, Math.PI * 2 - d);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
function slotOf(i) { return ((i % route.length) + route.length) % route.length; }
function centerIndex() { return nearestIndex(progress); }

function image(name) { return `../assets/landscapes/${encodeURIComponent(name)}`; }

let renderedCenter = -99;
let loadIndex = 0;
const cache = new Map();
function preload(name) {
  if (cache.has(name)) return cache.get(name);
  const p = new Image();
  p.decoding = 'async';
  p.src = image(name);
  cache.set(name, p);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return p;
}

function syncPlates(force = false) {
  const ci = centerIndex();
  if (ci === renderedCenter && !force) return;
  renderedCenter = ci;
  for (const plate of plates) plate.style.transition = 'none';
  // The three plates always show previous/current/next; the world slides between them.
  for (let s = 0; s < 3; s++) {
    const p = route[slotOf(ci + s - 1)];
    const img = preload(p.image);
    plates[s].src = img.src;
    plates[s].alt = `${p.zh}风景插画`;
    if (s === 1) plates[s].dataset.active = '';
    else delete plates[s].dataset.active;
  }
  world.style.transform = `translateX(${-(ci + 1) * 100}vw)`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const plate of plates) plate.style.transition = '';
  }));
}

const weatherFor = p => p.weather || '';
function atmosphere(p) {
  const text = weatherFor(p);
  $('#heat').toggleAttribute('data-on', /地热|蒸汽|间歇泉/.test(text + p.name));
  $('#rain').toggleAttribute('data-on', /雨/.test(text));
  $('#fog').toggleAttribute('data-on', /雾|云/.test(text));
}

function copyFor(p) {
  $('#kicker').textContent = p.region.toUpperCase();
  $('#place-name').textContent = p.name;
  $('#place-zh').textContent = p.zh;
  $('#place-line').textContent = p.line;
  document.title = `${p.zh} · Ring Road`;
}

function buildRing() {
  const ring = $('#route-ring');
  for (const p of route) {
    const n = document.createElement('i');
    n.className = 'node';
    n.style.left = `${50 + (p.x - center[0]) / VIEWBOX.width * 118}%`;
    n.style.top = `${50 + (p.y - center[1]) / VIEWBOX.height * 118}%`;
    ring.append(n);
    nodes.push(n);
  }
  const car = document.createElement('i');
  car.className = 'vehicle';
  ring.append(car);
}

function bearingNow() {
  const i = centerIndex(), a = route[slotOf(i + 1)].angle - route[i].angle;
  const deg = ((Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI) + 450) % 360;
  return String(Math.round(deg)).padStart(3, '0');
}

function updateUI() {
  const i = centerIndex();
  const p = route[i];
  copyFor(p);
  atmosphere(p);
  $('#bearing').textContent = `${bearingNow()}°`;
  $('#odo-value').textContent = Math.round(routeAngle(progress) / (Math.PI * 2) * totalKm);
  nodes.forEach((n, j) => {
    n.classList.toggle('active', j === i);
    n.classList.toggle('visited', j !== i && routeAngle(route[j].angle - progress) < 2.2);
  });
  const car = $('#route-ring .vehicle');
  const i0 = route[i], i1 = route[slotOf(i + 1)];
  let local = routeAngle(i1.angle - i0.angle);
  let t = Math.min(1, Math.max(0, routeAngle(progress - i0.angle) / local));
  const x = i0.x + (i1.x - i0.x) * t, y = i0.y + (i1.y - i0.y) * t;
  car.style.left = `${50 + (x - center[0]) / VIEWBOX.width * 118}%`;
  car.style.top = `${50 + (y - center[1]) / VIEWBOX.height * 118}%`;
  const speed = Math.abs(velocity);
  $('#drive-state').textContent = speed > .18 ? 'DRIVING' : speed > .02 ? 'COASTING' : 'ARRIVED';
  $('#drive-state').classList.toggle('motion', speed > .02);
  stage.classList.toggle('settled', speed <= .001);
}

function layout() {
  const ci = centerIndex();
  const i0 = route[ci], i1 = route[slotOf(ci + 1)];
  let local = routeAngle(i1.angle - i0.angle);
  const t = Math.min(1, Math.max(0, routeAngle(progress - i0.angle) / local));
  // Three full-viewport plates; the active one is always the middle slot.
  world.style.transform = `translateX(${-(ci + t + 1) * 100}vw)`;
}

function frame(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!dragging) {
    velocity *= Math.exp(-2.15 * dt);
    if (Math.abs(velocity) < .0008) velocity = 0;
    progress += velocity * dt;
  }
  syncPlates();
  layout();
  updateUI();
  requestAnimationFrame(frame);
}

stage.addEventListener('pointerdown', e => {
  dragging = { x: e.clientX, progress };
  velocity = 0;
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
  if (!hintGone) { $('#hint').classList.add('hide'); hintGone = true; }
});
stage.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - dragging.x;
  const next = dragging.progress - dx / Math.max(360, innerWidth) * 1.65;
  velocity = (next - progress) / Math.max(1/240, (performance.now() - settledAt) / 1000);
  progress = next;
});
function endDrag(e) {
  if (!dragging) return;
  dragging = null;
  settledAt = performance.now();
  stage.classList.remove('dragging');
  if (e.type === 'pointercancel') velocity = 0;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input,textarea')) return;
  if (e.key === 'ArrowRight') velocity = -1.4;
  if (e.key === 'ArrowLeft') velocity = 1.4;
  if (e.key === 'Home') { progress = 0; velocity = 0; }
});

function signal(active) {
  const el = $('#signal');
  if (active) { el.dataset.on = ''; el.style.minWidth = `${Math.min(180, Math.abs(velocity) * 130)}px`; }
  else { delete el.dataset.on; el.style.minWidth = '0px'; }
}
setInterval(() => signal(dragging !== null || Math.abs(velocity) > .01), 80);

buildRing();
await Promise.all(route.slice(0, 3).map(p => new Promise(r => {
  const img = preload(p.image); img.complete ? r() : img.onload = img.onerror = r;
})));
syncPlates(true);
updateUI();
requestAnimationFrame(frame);
$('#app').dataset.ready = '';
