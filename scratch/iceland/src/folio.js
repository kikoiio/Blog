const clamp = value => Math.max(0, Math.min(1, value));

export function createFolio({ dialog, trigger, onChange = () => {}, onPullStart = () => {} }) {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  dialog.classList.add('folio-dialog');
  if (trigger) {
    trigger.type = 'button';
    trigger.setAttribute('aria-controls', dialog.id);
  }
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'folio-grip';
  grip.setAttribute('aria-label', '合上文章目录');
  grip.setAttribute('aria-controls', dialog.id);
  grip.innerHTML = '<span aria-hidden="true"></span>';
  dialog.append(grip);

  let progress = 0;
  let raf = 0;
  let lastFrame = 0;
  let active = false;
  let settlingTo = null;
  let gesture = null;
  let suppressClick = false;
  let closingAnimation = null;

  function publishActive(value) {
    if (active === value) return;
    active = value;
    onChange(value);
  }

  function measure() {
    const viewportWidth = document.documentElement.clientWidth || innerWidth;
    const viewportHeight = document.documentElement.clientHeight || innerHeight;
    const openWidth = Math.min(830, Math.max(1, viewportWidth - 36));
    const openHeight = Math.min(850, Math.max(1, viewportHeight - 44));
    const closedWidth = Math.min(86, openWidth);
    const closedHeight = Math.min(82, openHeight);
    const width = closedWidth + (openWidth - closedWidth) * progress;
    const height = closedHeight + (openHeight - closedHeight) * progress;
    const xOpen = (viewportWidth - openWidth) / 2;
    const yOpen = (viewportHeight - openHeight) / 2;
    const xClosed = viewportWidth - closedWidth - 27;
    const yClosed = viewportHeight - closedHeight - 28;
    // Keep the reading page at its final dimensions: dragging reveals the sheet
    // from its lower corner, without reflowing a long article on every frame.
    const dx = xClosed - (openWidth - closedWidth) - xOpen;
    const dy = yClosed - (openHeight - closedHeight) - yOpen;
    dialog.style.left = `${xOpen}px`;
    dialog.style.top = `${yOpen}px`;
    dialog.style.width = `${openWidth}px`;
    dialog.style.height = `${openHeight}px`;
    dialog.style.transform = `translate(${dx * (1 - progress)}px, ${dy * (1 - progress)}px)`;
    dialog.style.clipPath = `inset(${openHeight - height}px 0 0 ${openWidth - width}px)`;
    dialog.style.setProperty('--folio-progress', progress.toFixed(4));
    dialog.style.setProperty('--folio-content', clamp((progress - 0.3) / 0.55).toFixed(4));
    dialog.style.setProperty('--folio-shade', (progress * 0.52).toFixed(4));
    dialog.dataset.folioReady = String(progress > 0.82);
    dialog.dataset.folioProgress = progress.toFixed(4);
    if (trigger) trigger.setAttribute('aria-expanded', String(progress > 0.025));
    return {progress:+progress.toFixed(4),active,dragging:!!gesture,settlingTo};
  }

  function setProgress(value) {
    progress = clamp(value);
    measure();
  }

  function show() {
    if (dialog.open) return;
    publishActive(true);
    if (!dialog.showModal) {
      dialog.setAttribute('open', '');
    } else {
      dialog.showModal();
    }
    setProgress(0);
  }

  function finish(target) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    settlingTo = null;
    setProgress(target);
    if (target === 0 && dialog.open) dialog.close();
  }

  function settle(target) {
    settlingTo = target;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    if (motionPreference.matches) {
      finish(target);
      return;
    }

    const tick = now => {
      raf = 0;
      const dt = lastFrame ? Math.min(0.08, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      const gap = settlingTo - progress;
      const factor = 1 - Math.exp(-dt * 13);
      setProgress(progress + gap * factor);
      if (Math.abs(gap) < 0.0015) {
        finish(settlingTo);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function open({instant=false}={}) {
    closingAnimation?.cancel();closingAnimation=null;
    show();
    if (!dialog.open) return;
    if(instant)finish(1);else settle(1);
  }

  function close() {
    if (!dialog.open) return;
    if(gesture){const held=gesture;gesture=null;try{held.target.releasePointerCapture(held.id);}catch{}}
    publishActive(true);
    if(dialog.dataset.entry==='sand'||dialog.dataset.entry==='city'){
      if(closingAnimation)return;
      if(motionPreference.matches){finish(0);return;}
      const animation=dialog.animate([{opacity:1},{opacity:0}],{duration:170,easing:'ease-out'});
      closingAnimation=animation;
      animation.finished.then(()=>{if(closingAnimation===animation){closingAnimation=null;finish(0);}}).catch(()=>{});
    }else settle(0);
  }

  function distanceUnit() {
    return Math.max(122, Math.min(250, Math.min(innerWidth, innerHeight) * 0.36));
  }

  function beginGesture(event, kind) {
    if (gesture) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (kind === 'open' && dialog.open) return;
    if (kind === 'close' && !dialog.open) return;
    event.preventDefault();
    event.stopPropagation();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    settlingTo = null;
    lastFrame = 0;

    gesture = {
      id: event.pointerId,
      kind,
      x: event.clientX,
      y: event.clientY,
      start: progress,
      moved: false,
      unit: distanceUnit(),
      target: event.currentTarget,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}

    if (kind === 'open') {
      trigger?.focus({ preventScroll: true });
      onPullStart();
      show();
      gesture.start = progress;
    } else {
      publishActive(true);
    }
  }

  function moveGesture(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 4) gesture.moved = true;
    if (!gesture.moved) return;
    event.preventDefault();
    const delta = -(dx + dy) / (2 * gesture.unit);
    setProgress(gesture.start + delta);
  }

  function endGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const ended = gesture;
    gesture = null;
    try {
      if (ended.target.hasPointerCapture(event.pointerId)) ended.target.releasePointerCapture(event.pointerId);
    } catch {}

    if (cancelled) {
      settle(ended.start);
      return;
    }
    if (!ended.moved) {
      settle(ended.kind === 'open' ? 1 : 0);
      return;
    }
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    settle(progress >= 0.48 ? 1 : 0);
  }

  trigger?.addEventListener('pointerdown', event => beginGesture(event, 'open'));
  grip.addEventListener('pointerdown', event => beginGesture(event, 'close'));
  window.addEventListener('pointermove', moveGesture, { passive: false });
  window.addEventListener('pointerup', event => endGesture(event));
  window.addEventListener('pointercancel', event => endGesture(event, true));
  window.addEventListener('blur',()=>{if(gesture)endGesture({pointerId:gesture.id},true);});
  for(const handle of [grip])handle?.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId)endGesture(event,true);});

  trigger?.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  grip.addEventListener('click', event => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    close();
  });

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    settlingTo = null;
    gesture = null;
    setProgress(0);
    publishActive(false);
  });
  window.addEventListener('resize', measure);
  motionPreference.addEventListener('change', event => {
    if (event.matches && settlingTo !== null) finish(settlingTo);
  });

  setProgress(0);
  return { open, close, measure, get progress() { return progress; } };
}
