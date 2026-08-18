/* ═══════════ CASE.JS — скрипт страниц кейсов ═══════════ */
const hd    = document.querySelector('#hd');
const toTop = document.querySelector('#toTop');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* тень шапки + кнопка «наверх» */
if (hd && toTop) {
  addEventListener('scroll', () => {
    hd.classList.toggle('scrolled', scrollY > 10);
    toTop.classList.toggle('show', scrollY > 500);
  }, { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
}

/* скрываем незагруженные картинки — остаётся аккуратная заглушка */
document.querySelectorAll('img').forEach(img =>
  img.addEventListener('error', () => img.classList.add('is-broken')));