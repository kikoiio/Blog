const $ = q => document.querySelector(q);
const app = $('#app');
const a = $('#a'), b = $('#b');
const places = await fetch('places.json').then(r => r.json());

let index = Math.max(0, places.findIndex(p => location.hash.slice(1) && p.id === location.hash.slice(1)));
let front = a, back = b;
let pending = null;

const image = p => `../assets/landscapes/${encodeURIComponent(p.image)}`;
const cache = new Map();
function preload(p) {
  if (!cache.has(p.id)) {
    const i = new Image();
    i.decoding = 'async';
    i.src = image(p);
    cache.set(p.id, i);
  }
  return cache.get(p.id);
}

function render() {
  const p = places[index];
  back.src = preload(p).src;
  back.alt = `${p.zh}风景插画`;
  back.onload = () => {
    back.classList.add('on');
    front.classList.remove('on');
    [front, back] = [back, front];
  };
  $('#region').textContent = p.region;
  $('#name').textContent = p.name;
  $('#zh').textContent = p.zh;
  $('#line').textContent = p.line;
  document.title = `${p.zh} · Ísland`;
  history.replaceState(null, '', `#${p.id}`);
  [...$('#track').children].forEach((n, i) => n.classList.toggle('now', i === index));
  preload(places[(index + 1) % places.length]);
}

function go(next, delta) {
  index = (next + places.length) % places.length;
  if (delta) render();
}

for (const p of places) {
  const dot = document.createElement('i');
  dot.style.left = `${(places.indexOf(p) + .5) / places.length * 100}%`;
  $('#track').append(dot);
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place';
  button.innerHTML = `<em>${p.name}</em><span>${p.zh}</span>`;
  button.addEventListener('click', () => { go(places.indexOf(p)); $('#index').close(); });
  item.append(button);
  $('#index menu').append(item);
}

let drag = null, lastX = 0, lastT = 0, velocity = 0;
app.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, start: index };
  velocity = 0;
  app.setPointerCapture(e.pointerId);
  app.classList.add('dragging');
  $('#hint').classList.add('hide');
});
app.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const target = drag.start - Math.round(dx / Math.max(180, innerWidth * .28));
  if (target !== index) {
    const now = performance.now();
    velocity = (target - index) / Math.max(16, now - lastT) * 1000;
    lastT = now;
    go(target);
  }
  lastX = e.clientX;
});
function release(e) {
  if (!drag) return;
  drag = null;
  app.classList.remove('dragging');
  if (e.type === 'pointercancel') velocity = 0;
  else if (Math.abs(velocity) > 2.4) go(index + Math.sign(velocity));
}
app.addEventListener('pointerup', release);
app.addEventListener('pointercancel', release);

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input,textarea')) return;
  if (e.key === 'ArrowRight') go(index + 1);
  if (e.key === 'ArrowLeft') go(index - 1);
});
$('#index-open').addEventListener('click', () => $('#index').showModal());

render();
await new Promise(r => requestAnimationFrame(r));
front.classList.add('on');
app.dataset.ready = '';
