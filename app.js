(() => {
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
gsap.registerPlugin(ScrollTrigger);

/* плавная прокрутка */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); lenis.scrollTo(el, { duration: 1.6 });
  }));
}

/* шапка */
const nav = document.getElementById('nav');
ScrollTrigger.create({ start: 80, onUpdate: s => nav.classList.toggle('solid', s.scroll() > 80) });

/* первый экран */
if (!reduce) {
  gsap.from('.hero-title .mask>span', { yPercent: 110, duration: 1.5, ease: 'expo.out', stagger: .14, delay: .15 });
  gsap.from('.hero-meta,.hero-foot', { opacity: 0, y: 24, duration: 1.2, ease: 'power3.out', delay: .9, stagger: .12 });
  gsap.from('.hero-media', { scale: 1.18, duration: 2.6, ease: 'power3.out' });
  /* видео стоит за страницей; «Принцип» наезжает на него, а оно тает целиком, без края */
  gsap.to('.hero-media', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'center 55%', scrub: true } });
  gsap.to('.hero-title', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* принцип: слова проявляются по прокрутке */
const st = document.getElementById('statement');
st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
const words = [...st.querySelectorAll('.w')];
if (reduce) words.forEach(w => w.classList.add('on'));
else ScrollTrigger.create({ trigger: st, start: 'top 82%', end: 'bottom 45%', onUpdate: s => { const n = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); } });

/* заголовки-маски */
document.querySelectorAll('.reveal').forEach(h => {
  if (reduce) return;
  gsap.from(h.querySelectorAll('.mask>span'), { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: h, start: 'top 85%' } });
});

/* ───── процесс ───── */
const SEQ = window.SEQ || { n1: 0, n2: 0 };
const TOTAL = SEQ.n1 + SEQ.n2;
const cv = document.getElementById('seq'), ctx = cv.getContext('2d');
const off = document.createElement('canvas'), octx = off.getContext('2d');
const frames = new Array(TOTAL);
const src = i => i < SEQ.n1 ? `media/seq/a${String(i + 1).padStart(4, '0')}.jpg` : `media/seq/b${String(i - SEQ.n1 + 1).padStart(4, '0')}.jpg`;
function load(i) { if (frames[i] || i < 0 || i >= TOTAL) return; const im = new Image(); im.decoding = 'async'; im.src = src(i); frames[i] = im; im.onload = () => { im.ok = true; if (i === lastDrawn || lastDrawn < 0) dirty = true; }; }
/* сначала редкая сетка кадров, потом все подряд */
[8, 4, 2, 1].forEach((step, k) => setTimeout(() => { for (let i = 0; i < TOTAL; i += step) load(i); }, k * 500));

let W = 0, H = 0, dirty = true, lastDrawn = -1;
function size() { const d = Math.min(1.5, devicePixelRatio || 1); W = cv.width = Math.round(cv.clientWidth * d); H = cv.height = Math.round(cv.clientHeight * d); dirty = true; }
addEventListener('resize', size); size();

/* прокрутка → номер кадра: удержание A, заморозка, удержание B (откачка), сублимация, удержание C */
function frameAt(p) {
  if (p < .12) return 0;
  if (p < .42) return Math.round((p - .12) / .30 * (SEQ.n1 - 1));
  if (p < .50) return SEQ.n1 - 1;
  if (p < .85) return SEQ.n1 + Math.round((p - .50) / .35 * (SEQ.n2 - 1));
  return TOTAL - 1;
}
function draw(p) {
  let i = frameAt(p), im = frames[i];
  if (!im || !im.ok) { for (let d = 1; d < 24 && !(im && im.ok); d++) { im = frames[i - d]; if (im && im.ok) break; im = frames[i + d]; } }
  if (!im || !im.ok) return;
  lastDrawn = i;
  const iw = im.naturalWidth, ih = im.naturalHeight, zoom = 1 + .04 * p;
  ctx.clearRect(0, 0, W, H);
  let r, x, y;
  if (H > W) {
    /* телефон: облако фруктов крупно, в верхней части кадра */
    r = (W * 1.55 / iw) * zoom; x = (W - iw * r) / 2; y = H * .7 - ih * r * .46;
  } else {
    /* широкий экран: облако над текстом стадий, левее приборов */
    const h0 = Math.min(H * .62, W * .38);
    r = (h0 / ih) * zoom; x = W * .48 - iw * r / 2; y = H * .68 - ih * r * .46;
  }
  const w = Math.round(iw * r), h = Math.round(ih * r);
  /* кадр растворяется овальной маской по прозрачности: ни рамки, ни подложки, ни линии */
  if (off.width !== w || off.height !== h) { off.width = w; off.height = h; }
  octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, w, h); octx.drawImage(im, 0, 0, w, h);
  octx.globalCompositeOperation = 'destination-in';
  octx.save(); octx.translate(w / 2, h * .46); octx.scale(1, h / w * 1.25);
  const g = octx.createRadialGradient(0, 0, w * .26, 0, 0, w * .5);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.6, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  octx.fillStyle = g; octx.fillRect(-w, -h * 2, w * 2, h * 4); octx.restore();
  ctx.drawImage(off, x, y);
}

/* ключевые точки цикла: p, T °C, P мбар, влага % */
const K = [[0, 4, 1013, 87], [.12, 4, 1013, 87], [.40, -40, 1013, 87], [.50, -40, .5, 87], [.68, -25, .5, 10], [.85, 35, .1, 5], [.93, 20, 1013, 5], [1, 20, 1013, 5]];
function sample(p) {
  let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], t = clamp((p - a[0]) / (b[0] - a[0] || 1));
  return { T: lerp(a[1], b[1], t), P: Math.pow(10, lerp(Math.log10(a[2]), Math.log10(b[2]), t)), M: lerp(a[3], b[3], t) };
}
const sceneAt = p => p < .12 ? 0 : p < .42 ? 1 : p < .68 ? 2 : p < .85 ? 3 : 4;

/* фазовая диаграмма */
const pd = document.getElementById('pd'), NS = 'http://www.w3.org/2000/svg';
const X = T => 30 + (T + 60) / 120 * 222, Y = P => 156 - (Math.log10(P) - Math.log10(.05)) / (Math.log10(2000) - Math.log10(.05)) * 144;
const sub = [[-48, .05], [-40, .128], [-30, .38], [-20, 1.03], [-10, 2.6], [0, 6.11]], vap = [[0, 6.11], [10, 12.3], [20, 23.4], [30, 42.4], [40, 73.8], [50, 123], [60, 199]];
const path = a => a.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join('');
const el = (n, at, txt) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); if (txt) e.textContent = txt; pd.appendChild(e); return e; };
el('path', { d: 'M30 8V156H254', fill: 'none', stroke: 'rgba(14,23,35,.2)' });
el('path', { d: path(sub), fill: 'none', stroke: '#2a6fae', 'stroke-width': 1.2 });
el('path', { d: path(vap), fill: 'none', stroke: 'rgba(14,23,35,.45)', 'stroke-width': 1.2 });
el('path', { d: `M${X(0)} ${Y(6.11)}V${Y(2000)}`, fill: 'none', stroke: 'rgba(14,23,35,.45)', 'stroke-width': 1.2 });
el('circle', { cx: X(0), cy: Y(6.11), r: 2.4, fill: '#0e1723' });
el('text', { x: X(0) + 6, y: Y(6.11) + 11 }, 'ТРОЙНАЯ ТОЧКА');
el('text', { x: X(-46), y: Y(120) }, 'ЛЁД'); el('text', { x: X(24), y: Y(500) }, 'ВОДА'); el('text', { x: X(-16), y: Y(.09) }, 'ПАР');
el('text', { x: 30, y: 170 }, '−60 °C'); el('text', { x: 224, y: 170 }, '+60 °C');
const trail = el('path', { d: '', fill: 'none', stroke: '#d4245e', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
const dot = el('circle', { r: 4, fill: '#d4245e', stroke: '#ffffff', 'stroke-width': 1.5 });
function drawTrail(p) {
  let d = ''; const n = Math.max(2, Math.round(p * 90));
  for (let i = 0; i <= n; i++) { const s = sample(p * i / n); d += (i ? 'L' : 'M') + X(s.T).toFixed(1) + ' ' + Y(s.P).toFixed(1); }
  trail.setAttribute('d', d); const s = sample(p); dot.setAttribute('cx', X(s.T)); dot.setAttribute('cy', Y(s.P));
}

const $ = id => document.getElementById(id), scenes = [...document.querySelectorAll('.scene')], rail = [...document.querySelectorAll('#rail span')];
let active = -1;
function ui(p) {
  const s = sample(p), idx = sceneAt(p);
  $('vT').textContent = (s.T > .5 ? '+' : s.T < -.5 ? '−' : '') + Math.abs(Math.round(s.T));
  $('vP').textContent = s.P >= 10 ? Math.round(s.P) : s.P.toFixed(s.P < 1 ? 2 : 1).replace('.', ',');
  $('vM').textContent = Math.round(s.M);
  $('gT').classList.toggle('hot', idx === 1 || idx === 3); $('gP').classList.toggle('hot', idx === 2);
  $('gM').classList.toggle('hot', idx >= 2);
  $('rail').style.setProperty('--p', p);
  drawTrail(p);
  if (idx !== active) { active = idx; scenes.forEach((e, i) => e.classList.toggle('on', i === idx)); rail.forEach((e, i) => { e.classList.toggle('on', i <= idx); e.classList.toggle('cur', i === idx); }); }
}

let target = 0, cur = 0, shown = -1;
ScrollTrigger.create({ trigger: '#process', start: 'top top', end: 'bottom bottom', onUpdate: s => { target = s.progress; } });
gsap.ticker.add(() => {
  cur = reduce ? target : cur + (target - cur) * .14;
  if (Math.abs(cur - shown) > .0004 || dirty) { shown = cur; dirty = false; draw(cur); ui(cur); }
});
window.__setP = v => { target = cur = v; dirty = true; };

/* ассортимент — по прайсу от 13.03.2026 */
const RANGE = [
  ['raspberry', 'Малина', ['целая', 'кусочки', 'порошок'], '#f4c3d1'],
  ['strawberry', 'Клубника', ['целая', '1-5 мм', '5-10 мм', 'слайсы', 'порошок'], '#f7c6c0'],
  ['blackberry', 'Ежевика', ['целая', '1-5 мм'], '#dccbe6'],
  ['cherry', 'Вишня', ['целая', '1-5 мм'], '#efc0c7'],
  ['blueberry', 'Черника', ['целая', 'порошок'], '#cfd6f0'],
  ['blackcurrant', 'Чёрная смородина', ['целая', 'порошок'], '#d9c9e3'],
  ['redcurrant', 'Красная смородина', ['целая'], '#f6c2c6'],
  ['seabuckthorn', 'Облепиха', ['целая'], '#fbd8b6'],
  ['lingonberry', 'Брусника', ['целая'], '#f2c1c9'],
  ['cranberry', 'Клюква', ['целая'], '#f3bfc3'],
  ['apple', 'Яблоко', ['кубик', '3-6 мм', 'порошок'], '#efe7cb'],
  ['banana', 'Банан', ['1-5 мм', 'слайсы', 'порошок'], '#f6ebbf']
];
/* предзагрузка вырезок */
RANGE.forEach(([k]) => { const i = new Image(); i.src = `media/float/${k}.png`; });
const namesEl = document.getElementById('names'), vit = document.getElementById('vitrine');
namesEl.innerHTML = RANGE.map(([k, n], i) => `<li><button type="button" data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${n}</button></li>`).join('');
const btns = [...namesEl.querySelectorAll('button')], flyA = document.getElementById('flyA'), flyB = document.getElementById('flyB');
let vCur = -1, front = flyA, back = flyB, userTook = false;
function show(i) {
  if (i === vCur) return; vCur = i;
  const [k, n, f, tone] = RANGE[i];
  back.src = `media/float/${k}.png`; back.alt = `${n}, сублимированная`;
  back.classList.add('on'); front.classList.remove('on'); [front, back] = [back, front];
  vit.style.setProperty('--tone', tone);
  document.getElementById('vName').textContent = n;
  document.getElementById('vChips').innerHTML = f.map(x => `<span>${x}</span>`).join('');
  btns.forEach((b, j) => b.classList.toggle('on', j === i));
}
btns.forEach(b => { const i = +b.dataset.i; b.addEventListener('mouseenter', () => { userTook = true; show(i); }); b.addEventListener('click', () => { userTook = true; show(i); }); b.addEventListener('focus', () => show(i)); });
show(0);
/* сама листает, пока посетитель не выбрал позицию; только когда витрина на экране */
let inView = false;
ScrollTrigger.create({ trigger: '#showcase', start: 'top 80%', end: 'bottom 20%', onToggle: s => { inView = s.isActive; } });
setInterval(() => { if (inView && !userTook && !reduce) show((vCur + 1) % RANGE.length); }, 3200);
/* продукт парит и слегка следует за курсором */
[flyA, flyB].forEach(el => el.classList.add('float'));
if (!reduce) {
  vit.addEventListener('mousemove', e => { const r = vit.getBoundingClientRect(); const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5; gsap.to([flyA, flyB], { x: dx * 40, y: dy * 30, rotate: dx * 6, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }); });
  vit.addEventListener('mouseleave', () => gsap.to([flyA, flyB], { x: 0, y: 0, rotate: 0, duration: 1.6, ease: 'power3.out' }));
  gsap.from('.names li', { opacity: 0, x: -30, duration: .9, ease: 'power3.out', stagger: .04, scrollTrigger: { trigger: '#showcase', start: 'top 80%' } });
}

/* структура */
if (!reduce) {
  /* разлом по прокрутке: настоящий ролик в замедлении, кадры листаются скроллом */
  const B = window.BRK || { n: 0 }, bc = document.getElementById('brk'), bx = bc.getContext('2d'), bf = [];
  const bsrc = i => `media/break/k${String(i + 1).padStart(4, '0')}.jpg`;
  const bload = i => { if (bf[i] || i < 0 || i >= B.n) return; const im = new Image(); im.decoding = 'async'; im.src = bsrc(i); bf[i] = im; im.onload = () => { im.ok = true; if (bShown < 0) bDraw(bLast); }; };
  [6, 3, 1].forEach((st, k) => setTimeout(() => { for (let i = 0; i < B.n; i += st) bload(i); }, 300 + k * 400));
  let bShown = -1, bLast = 0;
  function bDraw(i) {
    bLast = i; let im = bf[i];
    if (!im || !im.ok) { for (let d = 1; d < 12; d++) { im = bf[i - d]; if (im && im.ok) break; im = bf[i + d]; if (im && im.ok) break; } }
    if (!im || !im.ok) return;
    const d = Math.min(1.5, devicePixelRatio || 1), W = Math.round(bc.clientWidth * d), H = Math.round(bc.clientHeight * d);
    if (bc.width !== W || bc.height !== H) { bc.width = W; bc.height = H; }
    bx.globalCompositeOperation = 'source-over'; bx.clearRect(0, 0, W, H); bx.drawImage(im, 0, 0, W, H);
    /* фон ролика совпадает со страницей; края всё равно растворяем по прозрачности */
    bx.globalCompositeOperation = 'destination-in';
    const g = bx.createRadialGradient(W / 2, H / 2, W * .32, W / 2, H / 2, W * .5);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = g; bx.fillRect(0, 0, W, H); bShown = i;
  }
  ScrollTrigger.create({ trigger: '.st-media', start: 'center 90%', end: 'center 30%', scrub: .5, onUpdate: s => {
    /* первые 15% — ягода целая, дальше трещина и разлом в темпе прокрутки */
    const p = Math.max(0, (s.progress - .15) / .85), i = Math.min(B.n - 1, Math.round(p * (B.n - 1)));
    if (i !== bShown) bDraw(i);
  } });
  addEventListener('resize', () => { bShown = -1; bDraw(bLast); });
  gsap.from('.lead', { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.lead', start: 'top 88%' } });
  document.querySelectorAll('[data-count]').forEach(n => {
    const to = +n.dataset.count, pre = n.dataset.prefix || '', suf = n.dataset.suffix || '', o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: n, start: 'top 90%' }, onUpdate: () => { n.textContent = pre + Math.round(o.v) + suf; } });
  });
  /* производство */
  gsap.from('.fact', { opacity: 0, y: 40, duration: 1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.facts', start: 'top 85%' } });
  /* форматы */
  gsap.from('.fmt', { opacity: 0, y: 70, scale: .9, duration: 1.2, ease: 'power3.out', stagger: .14, scrollTrigger: { trigger: '.formats', start: 'top 82%' } });
  /* магнитная кнопка */
  const btn = document.querySelector('.btn');
  btn.addEventListener('mousemove', e => { if (btn.dataset.gone) return; const r = btn.getBoundingClientRect(); gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .35, duration: .5, ease: 'power3.out' }); });
  btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
}

/* ───── заявка: ягода взрывается и становится формой ───── */
(() => {
  const btn = document.getElementById('berryBtn'), form = document.getElementById('rfq'), done = document.getElementById('rfqDone');
  const FRUITS = ['Малина', 'Клубника', 'Ежевика', 'Вишня', 'Черника', 'Чёрная смородина', 'Красная смородина', 'Облепиха', 'Брусника', 'Клюква', 'Яблоко', 'Банан'];
  const FORMS = ['Целые', 'Слайсы', 'Кусочки', 'Порошок'];
  const chips = (el, list) => { el.innerHTML = list.map(x => `<button type="button" aria-pressed="false">${x}</button>`).join(''); el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); };
  chips(document.getElementById('pickFruit'), FRUITS); chips(document.getElementById('pickForm'), FORMS);

  /* частицы из пикселей самой ягоды + розовая пыль */
  function burst(img) {
    const r = img.getBoundingClientRect(), cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
    cv.className = 'burst'; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; document.body.appendChild(cv);
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const off = document.createElement('canvas'), w = Math.round(r.width), h = Math.round(r.height); off.width = w; off.height = h;
    const o = off.getContext('2d'); o.drawImage(img, 0, 0, w, h);
    let data = null; try { data = o.getImageData(0, 0, w, h).data; } catch (e) {}
    const P = [], cx = w / 2, cy = h / 2, step = Math.max(4, Math.round(w / 46));
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const k = (y * w + x) * 4; if (data && data[k + 3] < 140) continue;
      if (!data && Math.hypot(x - cx, y - cy) > w * .45) continue;
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = 5 + Math.random() * 11 + d / w * 10;
      P.push({ x: r.left + x, y: r.top + y, vx: dx / d * sp + (Math.random() - .5) * 4, vy: dy / d * sp + (Math.random() - .5) * 4 - 2, s: step * (.6 + Math.random() * .8), rot: Math.random() * 6, vr: (Math.random() - .5) * .4, col: data ? `rgb(${data[k]},${data[k + 1]},${data[k + 2]})` : '#c8204f', dust: false });
    }
    for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 14; P.push({ x: r.left + cx, y: r.top + cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1 + Math.random() * 2.5, rot: 0, vr: 0, col: Math.random() < .5 ? '#ff8fb0' : '#e23a6e', dust: true }); }
    const t0 = performance.now(), T = 1500;
    (function frame(now) {
      const t = (now - t0) / T; c.clearRect(0, 0, innerWidth, innerHeight);
      /* вспышка-облачко пудры в первые доли секунды */
      if (t < .5) { const g = c.createRadialGradient(r.left + cx, r.top + cy, 0, r.left + cx, r.top + cy, w * (.4 + t * 1.6)); g.addColorStop(0, `rgba(255,170,195,${.55 * (1 - t * 2)})`); g.addColorStop(1, 'rgba(255,170,195,0)'); c.fillStyle = g; c.fillRect(0, 0, innerWidth, innerHeight); }
      for (const p of P) {
        p.x += p.vx; p.y += p.vy; p.vx *= p.dust ? .93 : .955; p.vy = p.vy * (p.dust ? .93 : .955) + (p.dust ? .02 : .18); p.rot += p.vr;
        const a = Math.max(0, 1 - Math.max(0, t - .35) / .65); if (!a) continue;
        c.globalAlpha = a; c.fillStyle = p.col;
        if (p.dust) { c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); }
        else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .8); c.restore(); }
      }
      c.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  function openForm() {
    if (btn.dataset.gone) return; btn.dataset.gone = '1'; btn.setAttribute('aria-expanded', 'true');
    const img = btn.querySelector('.btn-berry'), br = btn.getBoundingClientRect();
    if (!reduce) burst(img);
    gsap.set(btn, { x: 0, y: 0 });
    gsap.to(btn, { scale: 1.25, opacity: 0, duration: reduce ? 0 : .18, ease: 'power2.out' });
    /* раскрытие формы не ждёт окончания анимации ягоды */
    setTimeout(() => {
      btn.style.display = 'none'; form.hidden = false; form.closest('.cta').classList.add('open');
      /* форма вырастает из точки, где была ягода */
      const fr = form.getBoundingClientRect();
      form.style.transformOrigin = `${br.left + br.width / 2 - fr.left}px ${br.top + br.height / 2 - fr.top}px`;
      if (!reduce) {
        gsap.fromTo(form, { opacity: 0, scale: .35, filter: 'blur(14px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'expo.out', delay: .12 });
        gsap.fromTo(form.querySelectorAll('.rfq-head,.field,.rfq-foot'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .05, delay: .35 });
      }
      setTimeout(() => document.getElementById('fCompany').focus({ preventScroll: true }), reduce ? 0 : 700);
    }, reduce ? 0 : 170);
  }
  btn.addEventListener('click', openForm);
  /* «Запросить образцы» в шапке ведёт к заявке и сразу раскрывает форму */
  document.querySelectorAll('a[href="#contact"]').forEach(a => a.addEventListener('click', () => setTimeout(openForm, 1500)));

  document.getElementById('rfqClose').addEventListener('click', () => {
    form.hidden = true; form.closest('.cta').classList.remove('open'); btn.style.display = ''; delete btn.dataset.gone; btn.setAttribute('aria-expanded', 'false');
    gsap.fromTo(btn, { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .8, ease: 'back.out(1.6)' }); btn.focus({ preventScroll: true });
  });

  form.addEventListener('submit', e => {
    e.preventDefault(); let ok = true;
    ['fCompany', 'fContact'].forEach(id => { const el = document.getElementById(id), bad = !el.value.trim(); el.closest('.field').classList.toggle('err', bad); if (bad && ok) { ok = false; el.focus({ preventScroll: true }); } });
    if (!ok) return;
    /* концепт: заявка никуда не отправляется — показываем подтверждение */
    gsap.to(form, { opacity: 0, scale: .96, duration: .35, ease: 'power2.in', onComplete: () => { form.hidden = true; done.hidden = false; if (!reduce) gsap.fromTo(done, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' }); } });
  });
  form.querySelectorAll('input').forEach(el => el.addEventListener('input', () => el.closest('.field').classList.remove('err')));
})();
})();
