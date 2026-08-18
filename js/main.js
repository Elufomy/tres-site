/* main.js — интерактивность главной страницы, финальная версия */

/* хелперы */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 1. часы Владивостока + тень шапки */
const hd = $('#hd');
const clock = $('#clock');
function tick() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Vladivostok' }));
  clock.textContent = 'ВЛК · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
tick(); setInterval(tick, 15000);

/* 2. мобильное меню */
const mnav = $('#mnav');
$('#burger').addEventListener('click', () => {
  const open = mnav.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
$$('.mnav a').forEach(a => a.addEventListener('click', () => {
  mnav.classList.remove('open');
  document.body.classList.remove('menu-open');
  document.body.style.overflow = '';
}));

/* 3. появление при скролле */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
$$('.rv, .lm').forEach(el => io.observe(el));

/* 4. эффект декодирования */
function scramble(el) {
  const orig = el.dataset.text || el.textContent;
  el.dataset.text = orig;
  const chars = '#%&*+=/<>';
  const total = Math.max(16, orig.length * 2);
  let frame = 0;
  const step = () => {
    frame++;
    const reveal = Math.floor((frame / total) * orig.length);
    el.textContent = [...orig].map((c, i) =>
      i < reveal || c === ' ' ? c : chars[(Math.random() * chars.length) | 0]).join('');
    if (frame < total) requestAnimationFrame(step); else el.textContent = orig;
  };
  step();
}
if (!REDUCED) {
  const ioS = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { scramble(e.target); ioS.unobserve(e.target); }
  }), { threshold: 0.6 });
  $$('[data-scramble]').forEach(el => ioS.observe(el));
}

/* 5. счётчики */
function countUp(el) {
  const target = +el.dataset.count, dur = 1200, t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const ioC = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  REDUCED ? e.target.textContent = e.target.dataset.count : countUp(e.target);
  ioC.unobserve(e.target);
}), { threshold: 0.6 });
$$('[data-count]').forEach(el => ioC.observe(el));

/* 6. аккордеон услуг */
$$('.srv').forEach((srv, i) => {
  const btn = $('.srv-btn', srv), panel = $('.srv-panel', srv);
  btn.addEventListener('click', () => {
    const open = srv.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0';
  });
  if (i === 0) btn.click();
});

/* 7. кастомный курсор (только десктоп) */
if (matchMedia('(pointer:fine)').matches && !REDUCED) {
  const cur = $('#cur'), curT = $('#curT');
  cur.classList.add('on');
  let tx = -100, ty = -100, cx = tx, cy = ty;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    cx += (tx - cx) * .18; cy += (ty - cy) * .18;
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', e => {
    const view = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, .chip, summary');
    cur.classList.toggle('is-view', !!view);
    cur.classList.toggle('is-link', !!link && !view);
    curT.textContent = view ? view.dataset.cursor : '';
  });
}

/* 8. параллакс полароидов */
if (!REDUCED) {
  const pars = $$('[data-par]');
  addEventListener('scroll', () => {
    const y = scrollY;
    pars.forEach(el => el.style.transform =
      `translateY(${y * el.dataset.par}px) rotate(${el.style.getPropertyValue('--r') || '0deg'})`);
  }, { passive: true });
}

/* 9. чипсы услуг (выбор одной услуги) */
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  $$('.chip', $('#chips')).forEach(x => x.classList.remove('on'));
  c.classList.add('on');
});

/* 10. чипсы канала связи + смена подсказки поля */
const channelGroup = $('#channel');
const contactLabel = $('#contactLabel');
const contactInput = contactLabel.querySelector('input');

const hints = {
  telegram: ['Ваш ник в телеграме', '@username'],
  whatsapp: ['Номер в WhatsApp', '+7 ___ ___-__-__'],
  max:      ['Ваш ник в Max', '@username'],
  email:    ['Почта для ответа', 'mail@example.com'],
  call:     ['Телефон для звонка', '+7 ___ ___-__-__']
};

channelGroup.addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  $$('.chip', channelGroup).forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  const [label, placeholder] = hints[btn.dataset.ch];
  contactLabel.firstChild.textContent = label;
  contactInput.placeholder = placeholder;
  contactInput.type = (btn.dataset.ch === 'email') ? 'email' : 'text';
});

/* 11. отправка формы: заявка уходит на почту через Formspree */
$('#brief').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (!f.name.value.trim() || !f.contact.value.trim()) { f.reportValidity(); return; }

  // собираем данные для письма
  const channel = channelGroup.querySelector('.chip.on')?.dataset.ch || '';
  const service = $('#chips').querySelector('.chip.on')?.textContent || '';

  // добавляем скрытые поля — они тоже уйдут на почту
  let chField = f.querySelector('input[name="channel"]');
  if (!chField) { chField = document.createElement('input'); chField.type = 'hidden'; chField.name = 'channel'; f.appendChild(chField); }
  chField.value = channel;

  let svcField = f.querySelector('input[name="service"]');
  if (!svcField) { svcField = document.createElement('input'); svcField.type = 'hidden'; svcField.name = 'service'; f.appendChild(svcField); }
  svcField.value = service;

  // служебные поля Formspree
  let subjectField = f.querySelector('input[name="_subject"]');
  if (!subjectField) { subjectField = document.createElement('input'); subjectField.type = 'hidden'; subjectField.name = '_subject'; f.appendChild(subjectField); }
  subjectField.value = '✦ новая заявка с сайта TRES*';

  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'отправляем…';

  try {
    const formData = new FormData(f);
    const res = await fetch(f.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error();
    $('#contact').classList.add('sent');
    f.reset();
    // возвращаем чипсы в исходное состояние
    channelGroup.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === 0));
    $('#chips').querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === 0));
  } catch {
    alert('Не получилось отправить. Напишите нам на почту hello.tres.studio@gmail.com ✦');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить заявку ↗';
  }
});

/* 12. кнопка «Наверх» + тень шапки при скролле */
const toTop = $('#toTop');
addEventListener('scroll', () => {
  toTop.classList.toggle('show', scrollY > 600);
  hd.classList.toggle('scrolled', scrollY > 10);
}, { passive: true });
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));

/* 13. клик по всей карточке работы ведёт на кейс */
$$('.work').forEach(w => {
  const link = $('.work-link', w);
  if (!link) return;
  w.style.cursor = 'pointer';
  w.addEventListener('click', e => {
    if (e.target.closest('a, button')) return;
    location.href = link.getAttribute('href');
  });
});