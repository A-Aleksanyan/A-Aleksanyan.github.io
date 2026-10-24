/* Shared behaviour for the English and Armenian pages.
   Every feature checks that its elements exist, and all content stays
   readable when this script does not run. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Mobile nav toggle ---------- */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
function setMenu(open){
  navLinks.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  /* Close after choosing a link, on Escape, or on a click outside the menu */
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) { setMenu(false); navToggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
  });
}

/* ---------- Reveal-on-scroll animations ---------- */
const revealEls = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach(el => el.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
}
/* Show everything before printing, including sections not yet scrolled to */
window.addEventListener('beforeprint', () => revealEls.forEach(el => el.classList.add('visible')));

/* ---------- Back-to-top button ---------- */
const toTop = document.getElementById('toTop');
if (toTop) {
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 500), { passive: true });
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    const h1 = document.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  });
}

/* ---------- Current year in footer ---------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Active section highlighting in nav (scrollspy) ---------- */
if ('IntersectionObserver' in window && navLinks) {
  const navMap = {};
  navLinks.querySelectorAll('a[href^="#"]').forEach(a => { navMap[a.getAttribute('href').slice(1)] = a; });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      Object.values(navMap).forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
      const link = navMap[e.target.id];
      if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));
}

/* ---------- Copy email to clipboard, with a screen-reader-friendly confirmation ---------- */
const copyBtn = document.getElementById('copyEmail');
const toast = document.getElementById('copyToast');
if (copyBtn) {
  copyBtn.hidden = false;
  const label = copyBtn.querySelector('.copy-label');
  const idleText = label.textContent;
  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
    } catch (err) {
      /* Fallback for older browsers */
      const tmp = document.createElement('textarea');
      tmp.value = email; document.body.appendChild(tmp); tmp.select();
      document.execCommand('copy'); document.body.removeChild(tmp);
    }
    copyBtn.classList.add('copied');
    label.textContent = copyBtn.dataset.copied;
    toast.textContent = toast.dataset.message;
    toast.classList.add('show');
    setTimeout(() => { copyBtn.classList.remove('copied'); label.textContent = idleText; }, 2000);
    setTimeout(() => { toast.classList.remove('show'); toast.textContent = ''; }, 2400);
  });
}

/* ---------- Publications: filter by type, and show the first items of "All" ---------- */
const pubList = document.getElementById('pubList');
const pubToggle = document.getElementById('pubToggle');
const pubFilters = document.getElementById('pubFilters');
const pubCount = document.getElementById('pubCount');
if (pubList) {
  const cards = Array.from(pubList.querySelectorAll('.pub-card'));
  const initialVisible = parseInt(pubList.dataset.initial || '10', 10);
  let filter = 'all';
  let expanded = false;

  function render(){
    const matching = cards.filter(c => filter === 'all' || c.dataset.type === filter);
    const collapse = filter === 'all' && !expanded && matching.length > initialVisible;
    cards.forEach(c => { c.hidden = !matching.includes(c); c.classList.remove('pub-hidden'); });
    if (collapse) matching.slice(initialVisible).forEach(c => c.classList.add('pub-hidden'));
    const shown = collapse ? initialVisible : matching.length;
    if (pubCount) pubCount.textContent = pubCount.dataset.template.replace('{shown}', shown).replace('{total}', matching.length);
    if (pubToggle) {
      pubToggle.hidden = filter !== 'all' || matching.length <= initialVisible;
      pubToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      pubToggle.querySelector('.toggle-label').textContent = expanded ? pubToggle.dataset.less : pubToggle.dataset.more;
    }
  }

  if (pubFilters) {
    pubFilters.hidden = false;
    pubFilters.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        pubFilters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        render();
      });
    });
  }
  if (pubToggle) {
    pubToggle.addEventListener('click', () => {
      expanded = !expanded;
      render();
      if (!expanded) document.getElementById('publications').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* Links such as "Key publication" point to a card that may be collapsed or filtered out:
     show the full list first so the browser can scroll to it */
  function revealCard(id){
    const card = id && document.getElementById(id);
    if (!card || !pubList.contains(card) || (!card.hidden && !card.classList.contains('pub-hidden'))) return;
    filter = 'all'; expanded = true;
    if (pubFilters) pubFilters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === 'all' ? 'true' : 'false'));
    render();
  }
  document.querySelectorAll('a[href^="#pub-"]').forEach(a =>
    a.addEventListener('click', () => revealCard(a.getAttribute('href').slice(1)))
  );
  render();
  if (location.hash.startsWith('#pub-')) {
    revealCard(location.hash.slice(1));
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
}
