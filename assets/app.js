// Voa Daqui · versão pública (GitHub Pages)
// Lê data/data.json, gerado três vezes por dia a partir do Kiwi.com (ver UPDATE.md).

// ---------- theme ----------
const THEME_KEY = 'voa-daqui-theme';
function applyTheme(t){ if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e){}
$('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark'; applyTheme(nx);
  try { localStorage.setItem(THEME_KEY, nx); } catch (e){}
});
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e){} }
};

// ---------- small ui helpers ----------
const icon = (n, cls = 'ic') => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
let toastT = 0;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.hidden = true, 260); }, 2400); }
let openSheetEl = null, lastFocus = null;
// O botão "voltar" do telemóvel fecha a janela aberta (e volta dos resultados para o início) em vez de sair do site.
const pushNav = (state, url) => { try { history.pushState(state, '', url || location.pathname + location.search); } catch (e){} };
function openSheet(id, url){
  const s = $(id); lastFocus = document.activeElement; s.hidden = false; openSheetEl = s; document.body.classList.add('locked');
  pushNav({sheet: id}, url);
  const f = s.querySelector('button, a, input, select'); if (f) f.focus({preventScroll: true});
}
function hideSheet(){
  if (!openSheetEl) return; openSheetEl.hidden = true; if (openSheetEl.id === 'filters') updateFiltSum();
  openSheetEl = null; document.body.classList.remove('locked'); if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll: true});
}
function closeSheet(){
  if (!openSheetEl) return;
  if (history.state && history.state.sheet) history.back(); else hideSheet();
}
window.addEventListener('popstate', e => {
  const st = e.state || {};
  if (openSheetEl){ hideSheet(); return; }
  if (!$('viewList').hidden && st.view !== 'list'){ showView('search', true); return; }
  if (!$('summary').hidden && !st.results) goHome();
});
document.addEventListener('click', e => { if (openSheetEl && e.target.closest('[data-close]') && openSheetEl.contains(e.target)) closeSheet(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Tab' && openSheetEl){   // o foco fica dentro da janela aberta
    const f = [...openSheetEl.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, [tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!openSheetEl.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
});

// ---------- views ----------
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
function showView(v, fromPop){
  if (!fromPop && v === 'list' && $('viewList').hidden) pushNav({view: 'list'});
  if (!fromPop && v === 'search' && history.state && history.state.view === 'list'){ history.back(); return; }
  document.querySelectorAll('[data-view]').forEach(b => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('viewSearch').hidden = v !== 'search'; $('viewList').hidden = v !== 'list';
  window.scrollTo({top: 0});
}
document.addEventListener('click', e => { const g = e.target.closest('[data-goview]'); if (g) showView(g.dataset.goview); });

// ---------- dates ----------
const pad2 = pad;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoLocal = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoDay = s => (s || '').slice(0, 10);
const atNoon = s => new Date(isoDay(s) + 'T12:00:00');
const tomorrow = () => { const t = addDays(new Date(), 1); t.setHours(12, 0, 0, 0); return t; };
const fmtDay = d => `${d.getDate()} ${MO[d.getMonth()]}`;
const fmtShort = iso => { const d = new Date(iso); return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`; };
const fmtHM = iso => iso.slice(11, 16);
const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? `${h}h${m ? pad2(m) : ''}` : `${m} min`; };
(() => { const t = new Date(); $('d1').value = isoLocal(addDays(t, 7)); $('d2').value = isoLocal(addDays(t, 37)); $('d1').min = isoLocal(t); })();

// ---------- form ----------
let mode = 'explore';
const sel = {to:'anywhere', when:'all', trip:'all', from:'both'};
const pax = {adults:1, kids:[], rooms:1, roomsTouched:false};
const MODEHELP = {
  explore: 'Descobre os destinos mais baratos, com os preços de hoje.',
  budget: 'Diz quanto queres gastar em voos para o grupo todo e vê para onde dá para ir.',
  pack: 'Voo e alojamento juntos, com o total para o grupo e os quartos que escolheres.',
  live: 'Qualquer destino, qualquer data: abre a pesquisa já feita no Kiwi.com e no lastminute.com, com os preços ao minuto.'
};
function setMode(m){
  mode = m;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  $('modehelp').textContent = MODEHELP[m];
  $('fBudget').hidden = m !== 'budget';
  $('fFields').hidden = m === 'live'; $('fLive').hidden = m !== 'live'; $('filtersBtn').hidden = m === 'live';
  if (!$('go').disabled) $('goTxt').textContent = m === 'live' ? 'Pesquisar voos' : 'Procurar voos';
}
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('.chips[data-group]').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setChip(g.dataset.group, b.dataset.v); }));
function setChip(group, v){
  sel[group] = v;
  document.querySelectorAll(`.chips[data-group="${group}"] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  if (group === 'to'){ $('fCity').hidden = v !== 'city'; if (v === 'city') $('city').focus(); }
  if (group === 'when') $('customDates').hidden = v !== 'custom';
}
const opts = () => ({direct: $('direct').checked, noDawn: $('noDawn').checked, weekends: $('weekends').checked, maxDur: +$('maxDur').value});
function updateFiltSum(){
  const o = opts(), n = o.direct + o.noDawn + o.weekends + (o.maxDur > 0);
  $('filtSum').textContent = ['Só mochila', o.direct ? 'diretos' : '', o.weekends ? 'fins de semana' : ''].filter(Boolean).join(' · ');
  $('filtN').hidden = !n; $('filtN').textContent = n;
}
$('filtersBtn').addEventListener('click', () => openSheet('filters'));
$('fReset').addEventListener('click', () => { for (const k of ['direct', 'noDawn', 'weekends']) $(k).checked = false; $('maxDur').value = '0'; updateFiltSum(); });
document.querySelectorAll('#filters input, #filters select').forEach(x => x.addEventListener('change', updateFiltSum));
$('paxBtn').addEventListener('click', () => { const o = $('paxPanel').hidden; $('paxPanel').hidden = !o; $('paxBtn').setAttribute('aria-expanded', String(o)); });
document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
  const d = +b.dataset.d, k = b.dataset.step;
  if (k === 'adults') pax.adults = Math.min(9, Math.max(1, pax.adults + d));
  else if (k === 'rooms'){ pax.rooms = Math.min(9, Math.max(1, pax.rooms + d)); pax.roomsTouched = true; }
  else if (d > 0 && pax.kids.length < 8) pax.kids.push(6);
  else if (d < 0) pax.kids.pop();
  if (!pax.roomsTouched) pax.rooms = Math.max(1, Math.ceil(pax.adults / 2));
  drawPax(); paxChanged();
}));
$('ages').addEventListener('change', e => { const s = e.target.closest('select'); if (s){ pax.kids[+s.dataset.k] = +s.value; drawPax(false); paxChanged(); } });
function paxText(){
  const parts = [`${pax.adults} adulto${pax.adults > 1 ? 's' : ''}`];
  if (pax.kids.length) parts.push(`${pax.kids.length} criança${pax.kids.length > 1 ? 's' : ''}`);
  parts.push(`${pax.rooms} quarto${pax.rooms > 1 ? 's' : ''}`);
  return parts.join(' · ');
}
function drawPax(rebuild = true){
  $('adultsOut').textContent = pax.adults; $('kidsOut').textContent = pax.kids.length; $('roomsOut').textContent = pax.rooms;
  const dis = (s, d, v) => { document.querySelector(`[data-step="${s}"][data-d="${d}"]`).disabled = v; };
  dis('adults', -1, pax.adults <= 1); dis('adults', 1, pax.adults >= 9); dis('kids', -1, !pax.kids.length); dis('kids', 1, pax.kids.length >= 8); dis('rooms', -1, pax.rooms <= 1); dis('rooms', 1, pax.rooms >= 9);
  if (rebuild) $('ages').innerHTML = pax.kids.map((a, k) => `<label>Idade da criança ${k + 1}<select data-k="${k}">${Array.from({length:12}, (_, y) => `<option value="${y}" ${y === a ? 'selected' : ''}>${y === 0 ? 'menos de 1 ano' : y + (y === 1 ? ' ano' : ' anos')}</option>`).join('')}</select></label>`).join('');
  $('paxSum').textContent = paxText();
}
function group(){
  const infants = pax.kids.filter(a => a < 2).length, children = pax.kids.length - infants;
  return {adults: pax.adults, children, infants, ages: pax.kids.slice(), total: pax.adults + pax.kids.length, payers: pax.adults + children, rooms: pax.rooms};
}
const paxLabel = P => `${P.total} pessoa${P.total > 1 ? 's' : ''}`;
const FORM_KEY = 'voa-daqui-site-form';
const formSnapshot = () => ({live: {from: $('lFrom').value, to: $('lTo').value, one: $('lOne').checked}, mode, sel: Object.assign({}, sel), pax: {adults: pax.adults, kids: pax.kids.slice(), rooms: pax.rooms, roomsTouched: pax.roomsTouched}, city: $('city').value, budget: $('budget').value, opts: opts()});
function applyForm(s){
  if (!s) return;
  if (s.pax){ pax.adults = s.pax.adults || 1; pax.kids = (s.pax.kids || []).slice(); pax.rooms = s.pax.rooms || 1; pax.roomsTouched = !!s.pax.roomsTouched; }
  for (const g of ['to', 'when', 'trip', 'from']) if (s.sel && s.sel[g] != null && document.querySelector(`.chips[data-group="${g}"] [data-v="${s.sel[g]}"]`)) setChip(g, s.sel[g]);
  $('city').value = s.city || ''; $('budget').value = s.budget || '';
  if (s.opts){ for (const k of ['direct', 'noDawn', 'weekends']) $(k).checked = !!s.opts[k]; $('maxDur').value = String(s.opts.maxDur || 0); }
  if (s.live){ $('lFrom').value = s.live.from || 'Lisboa (LIS)'; $('lTo').value = s.live.to || ''; $('lOne').checked = !!s.live.one; $('lD2').disabled = !!s.live.one; }
  setMode(MODEHELP[s.mode] ? s.mode : 'explore');
}
const rememberForm = () => store.set(FORM_KEY, formSnapshot());
applyForm(store.get(FORM_KEY, null));
setMode(mode); drawPax(); updateFiltSum();

// ---------- data ----------
let DATA = null, ALL = [];
// aeroporto -> código da cidade, para os filtros por tipo de destino
const CITY_CODE = {STN:'LON', LTN:'LON', LGW:'LON', LHR:'LON', SEN:'LON', BVA:'PAR', ORY:'PAR', CDG:'PAR', BGY:'MIL', MXP:'MIL', LIN:'MIL', FCO:'ROM', CIA:'ROM', HHN:'FRA', NRN:'DUS', SXF:'BER', BER:'BER', EIN:'AMS', CRL:'BRU', GRO:'BCN', REU:'BCN'};
function toIt(x){
  const cars = x.carrier.split(' + '), seg = (from, to, car, fromCity, toCity, fromC, toC) => ({from, to, carrier: car, carrierName: car, fromCity, toCity, fromCountry: fromC, toCountry: toC});
  const oc = {LIS:'Lisbon', OPO:'Porto', FAO:'Faro'}[x.o];
  return {price: x.price, bookingUrl: x.url, baggage: {personalItem: 1, cabinBag: 0, checkedBag: 0}, key: x.key, cmp: x.cmp || {}, hotel: x.hotel || null,
    outbound: {from: x.o, to: x.to, departureTime: x.out.dep + ':00', arrivalTime: x.out.arr + ':00', durationSeconds: (x.out.min || 0) * 60, stops: x.out.stops, route: [x.o, x.to], segments: [seg(x.o, x.to, cars[0], oc, x.city, 'Portugal', x.country)]},
    inbound: {from: x.to, to: x.o, departureTime: x.in.dep + ':00', arrivalTime: x.in.arr + ':00', durationSeconds: (x.in.min || 0) * 60, stops: x.in.stops, route: [x.to, x.o], segments: [seg(x.to, x.o, cars[1] || cars[0], x.city, oc, x.country, 'Portugal')]}};
}

// ---------- fare helpers ----------
const lastSeg = it => (it.outbound.segments || []).slice(-1)[0] || {};
const cityOf = it => pt(lastSeg(it).toCity || it.outbound.to).replace(/,.*$/, '');
const countryEn = it => lastSeg(it).toCountry || '';
const countryOf = it => { const c = countryEn(it); return COUNTRY[c] ?? c; };
const nightsOf = it => it.inbound ? Math.max(1, Math.round((atNoon(it.inbound.departureTime) - atNoon(it.outbound.departureTime)) / 864e5)) : 0;
// "Sem faltar ao trabalho": ida à sexta depois das 18h (ou ao sábado), volta ao sábado ou domingo e chega no mesmo dia
const isWk = it => { const a = new Date(it.outbound.departureTime), b = new Date(it.inbound.departureTime), c = new Date(it.inbound.arrivalTime);
  return ((a.getDay() === 5 && a.getHours() >= 18) || a.getDay() === 6) && [6, 0].includes(b.getDay()) && c.toDateString() === b.toDateString() && (b - a) < 3 * 864e5; };
const totalDur = it => (it.outbound.durationSeconds || 0) + (it.inbound ? it.inbound.durationSeconds || 0 : 0);
const isDirect = it => it.outbound.stops === 0 && (!it.inbound || it.inbound.stops === 0);
const airlinesOf = it => [...new Set([...it.outbound.segments, ...it.inbound.segments].map(s => s.carrierName))].join(', ');
// preço mais baixo entre os sites (Kiwi, lastminute com link exato, eDreams)
// No computador o lastminute junta uma "taxa de agência" (visto: 10,45 € por pessoa); no telemóvel não.
const DESKTOP = (() => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e){ return false; } })();
const LM_FEE = DESKTOP ? 10.5 : 0;
const lmPrice = c => c.lm ? Math.round((c.lm.p + LM_FEE) * 100) / 100 : null;
// só conta como "mais barato" noutro site se for o mesmo voo (mesmas horas de ida e volta)
const sameFlight = (it, x) => x && x.out === fmtHM(it.outbound.departureTime) && x.in === fmtHM(it.inbound.departureTime);
function bestOf(it, P){
  const c = it.cmp || {}, L = links(it, P || group());
  const r = [{p: it.price, site: 'kiwi', name: 'Kiwi.com', url: L.kiwi}];
  if (sameFlight(it, c.lm)) r.push({p: lmPrice(c), site: 'lm', name: 'lastminute', url: L.lm});
  if (sameFlight(it, c.ed)) r.push({p: c.ed.p, site: 'ed', name: 'eDreams', url: L.ed});
  return r.reduce((a, b) => b.p < a.p - 0.005 ? b : a);
}
const groupPrice = (it, P) => bestOf(it, P).p * Math.max(1, P.payers);
// o hotel foi visto para a mesma rota; se as datas do voo mudaram, estima pelo preço por noite
const hotelP2 = it => { const H = it.hotel; if (!H) return 0; return H.pn ? Math.round(H.pn * nightsOf(it) * 100) / 100 : H.p2; };
const hotelSameDates = it => !it.hotel || !it.hotel.ci || (it.hotel.ci === isoDay(it.outbound.departureTime) && it.hotel.co === isoDay(it.inbound.departureTime));
function hotelUrl(it, P){
  try { const u = new URL(it.hotel.url); u.searchParams.delete('aid');
    u.searchParams.set('checkin', isoDay(it.outbound.departureTime)); u.searchParams.set('checkout', isoDay(it.inbound.departureTime));
    u.searchParams.set('group_adults', P.adults); u.searchParams.set('no_rooms', P.rooms); u.searchParams.set('group_children', P.ages.length);
    u.searchParams.delete('age'); P.ages.forEach(a => u.searchParams.append('age', a)); return u.toString(); } catch (e){ return it.hotel.url; }
}
const hotelPrice = (it, P) => it.hotel ? hotelP2(it) * Math.max(1, P.rooms) : 0;
const packPrice = (it, P) => groupPrice(it, P) + hotelPrice(it, P);
const priceFor = (it, P) => ctx && ctx.mode === 'pack' ? packPrice(it, P) : groupPrice(it, P);

// ---------- search ----------
let current = [], ctx = null, sortBy = 'price';
function dateRange(){
  const t = tomorrow();
  if (sel.when === '2w') return [t, addDays(t, 13)];
  if (sel.when === 'next'){ const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() + 1, 1, 12), new Date(n.getFullYear(), n.getMonth() + 2, 0, 12)]; }
  if (sel.when === 'custom'){
    const a = new Date($('d1').value + 'T12:00:00'), b = new Date($('d2').value + 'T12:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return a <= b ? [a, b] : [b, a];
  }
  return [t, addDays(t, 60)];
}
const DEST_NAME = {anywhere:'Qualquer lugar', beach:'Praia', cities:'Cidades', nature:'Natureza', winter:'Sol no inverno', abroad:'Fora de Portugal'};
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function matchDest(it){
  const code = it.outbound.to, cc = CITY_CODE[code] || code;
  if (sel.to === 'anywhere') return true;
  if (sel.to === 'abroad') return countryEn(it) !== 'Portugal';
  if (sel.to === 'city'){ const q = norm($('city').value); return !q || norm(cityOf(it)).includes(q) || norm(lastSeg(it).toCity).includes(q); }
  const list = (TYPES[sel.to] || '').split(',');
  return list.includes(code) || list.includes(cc);
}
const summaryText = () => `${sel.from === 'both' ? 'De Lisboa, Porto e Faro' : sel.from === 'OPO' ? 'Do Porto' : 'De ' + ORIGIN[sel.from]} · ${paxText()}`;
const collapse = (title, sub) => { if (!(history.state && history.state.results)) pushNav({results: 1}); $('form').hidden = true; $('band').hidden = true; $('dealBox').hidden = true; $('pontes').hidden = true; $('fds').hidden = true; $('summary').hidden = false; $('sumT').textContent = title; $('sumS').textContent = sub; window.scrollTo({top: 0}); };
function goHome(){ $('form').hidden = false; $('band').hidden = false; $('summary').hidden = true; renderDeal(); renderFds(); renderPontes(); if (!ctx || !ctx.home) showDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }
$('edit').addEventListener('click', () => { if (history.state && history.state.results) history.back(); else goHome(); });
function showErr(msg){ $('out').innerHTML = `<div class="state err"><b>${esc(msg)}</b></div>`; }
$('go').addEventListener('click', search);
function search(){
  if (!DATA) return;
  if (mode === 'live') return liveSearch();
  const P = group(), o = opts(), range = dateRange();
  if (sel.to === 'city' && !$('city').value.trim()) return showErr('Escreve a cidade de destino.');
  if (!range) return showErr('Escolhe as duas datas.');
  const budget = mode === 'budget' ? +$('budget').value : 0;
  if (mode === 'budget' && !(budget > 0)) return showErr('Escreve quanto queres gastar em voos.');
  rememberForm();
  ctx = {P, o, mode, budget, label: ''};
  const lo = isoLocal(range[0]), hi = isoLocal(range[1]);
  let list = ALL.filter(it => {
    const dep = isoDay(it.outbound.departureTime), n = nightsOf(it);
    if (sel.from !== 'both' && it.outbound.from !== sel.from) return false;
    if (dep < lo || dep > hi) return false;
    if (sel.trip === 'wk' ? !isWk(it) : sel.trip !== 'all' && (sel.trip === '4' ? n < 4 : n !== +sel.trip)) return false;
    if (!matchDest(it)) return false;
    if (o.direct && !isDirect(it)) return false;
    if (o.noDawn && (+fmtHM(it.outbound.departureTime).slice(0, 2) < 7 || +fmtHM(it.inbound.departureTime).slice(0, 2) < 7)) return false;
    if (o.weekends){ const a = new Date(it.outbound.departureTime).getDay(), b = new Date(it.inbound.departureTime).getDay(); if (![4, 5].includes(a) || ![0, 1].includes(b)) return false; }
    if (o.maxDur && Math.max(it.outbound.durationSeconds, it.inbound.durationSeconds) > o.maxDur * 3600) return false;
    if (budget && groupPrice(it, P) > budget) return false;
    if (mode === 'pack' && !it.hotel) return false;
    return true;
  });
  if (sel.from === 'both'){ const best = new Map(); for (const it of list){ const k = cityOf(it); if (!best.has(k) || priceFor(best.get(k), P) > priceFor(it, P)) best.set(k, it); } list = [...best.values()]; }
  current = list;
  const destName = sel.to === 'city' ? $('city').value.trim() : DEST_NAME[sel.to];
  ctx.label = destName;
  collapse(mode === 'pack' ? `Voo + hotel · ${destName}` : mode === 'budget' ? `${eur0(budget)} · ${destName}` : `${destName} · ${fmtDay(range[0])} a ${fmtDay(range[1])}`, summaryText());
  const soon = sel.when === '2w' && current.length < 4 ? `<div class="soon"><span>Para as próximas 2 semanas temos poucos voos guardados: o site guarda sobretudo os mais baratos das próximas 8 semanas. Pesquisa qualquer destino com datas à tua escolha.</span><button type="button" class="btn sm primary" data-golive>Pesquisar outras datas</button></div>` : '';
  if (!current.length){
    $('out').innerHTML = soon + `<div class="state"><b>${mode === 'pack' ? 'Ainda não há voo + hotel com estes filtros.' : budget ? `Nenhum voo cabe em ${eur0(budget)} para ${paxLabel(P)}.` : 'Sem voos com estes filtros.'}</b><span>Hoje o site tem os ${ALL.length} voos mais baratos de Lisboa, Porto e Faro. ${mode === 'pack' ? `Os preços de alojamento são vistos de manhã para os ${ALL.filter(x => x.hotel).length} destinos mais baratos. Experimenta "Qualquer lugar" ou o modo Explorar.` : 'Experimenta "Qualquer lugar", "Próximas 8 semanas" ou tira algum filtro.'}</span></div>`;
    return;
  }
  renderResults();
  if (soon) $('out').insertAdjacentHTML('afterbegin', soon);
}
document.addEventListener('click', e => { if (!e.target.closest('[data-golive]')) return;
  const t = tomorrow(); $('lD1').value = isoLocal(t); $('lD2').value = isoLocal(addDays(t, 3)); $('lOne').checked = false; $('lD2').disabled = false;
  if (sel.from !== 'both') $('lFrom').value = `${ORIGIN[sel.from]} (${sel.from})`;
  setMode('live'); goHome(); setTimeout(() => { $('lTo').focus(); $('form').scrollIntoView({block: 'center'}); }, 50);
});
function sortIdx(idx){
  const pf = i => priceFor(current[i], ctx.P);
  const by = {price: (a, b) => pf(a) - pf(b), dur: (a, b) => totalDur(current[a]) - totalDur(current[b]) || pf(a) - pf(b), date: (a, b) => current[a].outbound.departureTime.localeCompare(current[b].outbound.departureTime)}[sortBy];
  return idx.slice().sort(by);
}
function sortBar(){
  const b = (k, l) => `<button type="button" data-v="${k}" aria-pressed="${sortBy === k}">${l}</button>`;
  return `<div class="chips" data-sort>${b('price', 'Mais barato')}${b('dur', 'Mais rápido')}${b('date', 'Mais cedo')}</div>`;
}
function renderResults(){
  const P = ctx.P, idx = sortIdx(current.map((_, i) => i)), u = new Date(DATA.updated);
  const min = Math.min(...current.map(it => priceFor(it, P)));
  $('out').innerHTML = `<div class="reshead"><div><h2>${ctx.ponte ? `${current.length} voos para ${ctx.ponte.title.startsWith('Ponte') ? 'a' : 'o'} ${esc(ctx.ponte.title.charAt(0).toLowerCase() + ctx.ponte.title.slice(1))}, desde ${eur0(min)}` : ctx.home ? `${current.length} destinos a partir de ${eur0(min)}` : ctx.mode === 'pack' ? `${current.length} viage${current.length === 1 ? 'm' : 'ns'} com voo + hotel desde ${eur0(min)}` : ctx.mode === 'budget' ? `${current.length} viage${current.length === 1 ? 'm cabe' : 'ns cabem'} em ${eur0(ctx.budget)}` : `${current.length} destino${current.length === 1 ? '' : 's'} desde ${eur0(min)}`}</h2><div class="sub">Preços vistos ${new Date().toDateString() === u.toDateString() ? 'hoje' : `a ${fmtDay(u)}`} às ${pad2(u.getHours())}:${pad2(u.getMinutes())} · ${esc(paxText())}</div></div></div>
    ${sortBar()}
    ${ctx.mode === 'pack' ? `<p class="note">Total para ${paxLabel(P)}: voo no site mais barato + alojamento com nota 7 ou mais no Booking, ${P.rooms} quarto${P.rooms > 1 ? 's' : ''}. O alojamento é estimado a partir do preço para 2 pessoas num quarto.</p>` : ''}
    ${P.total > 1 && ctx.mode !== 'pack' ? `<p class="note">Total estimado para ${paxLabel(P)}. Os lugares mais baratos costumam ser poucos: confirma se há para todos antes de pagar.</p>` : ''}
    <div class="grid">${idx.map((i, k) => card(i, k === 0 ? {feat: true, badge: sortBy === 'price' ? 'O mais barato' : sortBy === 'dur' ? 'O mais rápido' : 'O mais cedo'} : {})).join('')}</div>`;
}
function cheaperElsewhere(it){
  const b = bestOf(it, ctx && ctx.P);
  return b.site !== 'kiwi' && b.p < it.price - 0.5 ? `<span class="fact ok">Mais barato no ${esc(b.name)}</span>` : '';
}
function card(i, x = {}){
  const it = current[i], P = ctx.P, n = nightsOf(it);
  const b = bestOf(it, P), pack = ctx.mode === 'pack' && it.hotel;
  const total = pack ? packPrice(it, P) : groupPrice(it, P);
  const perTxt = pack ? `voo + hotel, ${paxLabel(P)}` : P.payers > 1 ? `${eur0(b.p)} por pessoa` : 'ida e volta';
  const facts = [`<span class="fact">${esc(fmtShort(it.outbound.departureTime))} → ${esc(fmtShort(it.inbound.departureTime))}</span>`,
    isDirect(it) ? '<span class="fact ok">Direto</span>' : '<span class="fact dim">Com escala</span>', cheaperElsewhere(it)].join('');
  const saved = listUrls().has(it.bookingUrl);
  return `<article class="dcard ${x.feat ? 'feat' : ''}" data-open="${i}">
    <div class="art">${art(it.outbound.to, countryEn(it), x.feat ? 260 : 200)}
      ${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ''}
      <button type="button" class="heart ${saved ? 'on' : ''}" data-act="save" data-i="${i}" aria-label="${saved ? 'Já está na lista' : 'Guardar na lista'}" aria-pressed="${saved}">${icon('heart')}</button>
    </div>
    <div class="cbody">
      <div class="ctop"><div class="cname"><h3>${esc(cityOf(it))}</h3><span>${esc(countryOf(it))}${countryOf(it) ? ', ' : ''}${n} noite${n > 1 ? 's' : ''}, ${esc(deO(it.outbound.from))}</span></div>
        <div class="price"><b>${eur0(total)}</b><small>${esc(perTxt)}</small></div></div>
      ${pack ? costBar(groupPrice(it, P), hotelPrice(it, P), it.hotel) : ''}
      <div class="facts">${facts}</div>
      <div class="cfoot">${esc(airlinesOf(it))}, ${fmtDur(totalDur(it))} de voo<button type="button" class="more" data-open="${i}" aria-label="Ver viagem para ${esc(cityOf(it))}, ${eur0(total)}">Ver viagem</button></div>
    </div></article>`;
}

const costBar = (f, h, H) => `<div class="costbar" aria-hidden="true"><i style="width:${Math.round(f / (f + h) * 100)}%"></i><i style="width:${Math.round(h / (f + h) * 100)}%"></i></div>
      <div class="costleg"><span>Voos <b>${eur0(f)}</b></span><span>${esc(H.name)} <b>${eur0(h)}</b> · ${String(H.rating).replace('.', ',')}</span></div>`;

// ---------- trip sheet ----------
let SH = null, sheetTab = 'flight';
function legBlock(k, leg){
  const via = leg.stops === 0 ? 'direto' : `${leg.stops} escala${leg.stops > 1 ? 's' : ''}`;
  return `<div class="legk">${k} · ${esc(fmtShort(leg.departureTime))}</div>
    <div class="leg"><div><div class="t">${fmtHM(leg.departureTime)}</div><div class="a">${esc(leg.from)}</div></div>
    <div class="line"><i>${fmtDur(leg.durationSeconds)}</i></div>
    <div style="text-align:right"><div class="t">${fmtHM(leg.arrivalTime)}</div><div class="a">${esc(leg.to)}</div></div>
    <div class="meta">${esc(leg.segments[0].carrierName)} · ${esc(via)}</div></div>`;
}
const openTrip = i => current[i] && openTripFor(current[i], ctx.P);
function openTripFor(it, P){
  SH = {it, P}; sheetTab = 'flight';
  const n = nightsOf(it), b = bestOf(it, P), total = groupPrice(it, P), saved = listUrls().has(it.bookingUrl);
  $('dBox').innerHTML = `<div class="sheethead">${art(it.outbound.to, countryEn(it), 230).replace('<svg ', '<svg class="bg" ')}<div class="shade"></div><span class="grab"></span>
      <button type="button" class="xbtn" data-close aria-label="Fechar">${icon('x')}</button>
      <div class="place"><div><h3 id="dTitle">${esc(cityOf(it))}</h3><span>${esc(countryOf(it))}${countryOf(it) ? ' · ' : ''}${n} noite${n > 1 ? 's' : ''} · ${esc(deO(it.outbound.from))} · ${esc(paxLabel(P))}</span></div>
      <div class="pill"><b>${eur0(total)}</b><small>voo ida e volta${P.payers > 1 ? ` · ${eur0(b.p)}/pessoa` : ''}${it.hotel ? ` · com hotel ${eur0(total + hotelPrice(it, P))}` : ''}</small></div></div></div>
    <div class="tabs" role="tablist"><button type="button" role="tab" data-tab="flight" aria-selected="true">${icon('plane')}Voo</button><button type="button" role="tab" data-tab="stay" aria-selected="false">${icon('bed')}Estadia</button><button type="button" role="tab" data-tab="todo" aria-selected="false">${icon('ticket')}O que fazer</button></div>
    <div class="sheetbody" id="dBody"></div>
    <div class="actionbar">
      <button type="button" class="btn ${saved ? 'on' : ''}" data-sact="save" aria-label="Guardar na lista" aria-pressed="${saved}">${icon('heart')}</button>
      <button type="button" class="btn" data-sact="share" aria-label="Partilhar">${icon('share')}</button>
      <a class="btn primary" href="${esc(b.url)}" target="_blank" rel="noopener" data-out="${b.site}">${icon('plane')}Reservar${b.site !== 'kiwi' ? ' no ' + esc(b.name) : ' voo'} · ${eur0(b.p)}</a>
    </div>`;
  openSheet('detail', '#viagem=' + encodeURIComponent(it.key || ''));
  renderTab();
}
function setTab(t){ sheetTab = t; $('dBox').querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t))); renderTab(); }
const linkRow = (name, sub, url, label, tag) => `<div class="hrow"><div><b>${esc(name)}${tag ? `<i class="src ${tag[0]}">${esc(tag[1])}</i>` : ''}</b><span>${esc(sub)}</span></div><div class="hp"><a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a></div></div>`;
function links(it, P){
  const o = it.outbound.from, d = it.outbound.to, a = isoDay(it.outbound.departureTime), b = isoDay(it.inbound.departureTime);
  const b2 = s => s.slice(8, 10), my = s => s.slice(5, 7) + s.slice(0, 4);
  const yymmdd = s => s.slice(2).replace(/-/g, ''), city = cityOf(it), cityEn = lastSeg(it).toCity.replace(/,.*$/, '');
  const kids = P.ages.length ? '&' + P.ages.map(x => `age=${x}`).join('&') : '';
  return {
    kiwi: P.total > 1 ? aff('kiwi', kiwiSearch(o, d, a, b, P)) : it.bookingUrl,
    lm: aff('lm', lmSearch(o, d, a, b, P)),
    ed: `https://www.edreams.pt/travel/?deeplink=/results/ret=${b};infants=${P.infants};children=${P.children};adults=${P.adults};type=R;class=TOURIST;from.iata=${o};to.iata=${d};dep=${a};collectionmethod=16`,
    sky: `https://www.skyscanner.pt/transporte/voos/${o.toLowerCase()}/${(CITY_CODE[d] || d).toLowerCase()}/${yymmdd(a)}/${yymmdd(b)}/?adultsv2=${P.adults}${P.ages.length ? '&childrenv2=' + P.ages.join('|') : ''}`,
    gfl: `https://www.google.com/travel/flights?hl=pt-PT&curr=EUR&q=${encodeURIComponent(`Voos de ${o} para ${d} em ${a} regresso ${b}`)}`,
    booking: `https://www.booking.com/searchresults.pt-pt.html?ss=${encodeURIComponent(cityEn)}&checkin=${a}&checkout=${b}&group_adults=${P.adults}&group_children=${P.ages.length}${kids}&no_rooms=${P.rooms}&selected_currency=EUR`,
    airbnb: `https://www.airbnb.pt/s/${encodeURIComponent(cityEn)}/homes?checkin=${a}&checkout=${b}&adults=${P.adults}&children=${P.children}&infants=${P.infants}`,
    gyg: `https://www.getyourguide.pt/s/?q=${encodeURIComponent(cityEn)}&date_from=${a}&date_to=${b}`,
    events: `https://www.google.com/search?q=${encodeURIComponent(`eventos concertos espetáculos ${city} ${fmtDay(atNoon(a))} a ${fmtDay(atNoon(b))} ${a.slice(0, 4)}`)}`
  };
}
function compareHtml(it, P, L){
  const c = it.cmp || {}, oh = fmtHM(it.outbound.departureTime), ih = fmtHM(it.inbound.departureTime);
  const rows = [{name: 'Kiwi.com', p: it.price, url: L.kiwi}];
  if (c.lm) rows.push({name: 'lastminute.com', p: lmPrice(c), fee: LM_FEE, url: L.lm, other: c.lm.out !== oh || c.lm.in !== ih ? c.lm : null});
  if (c.ed) rows.push({name: 'eDreams', p: c.ed.p, prime: c.ed.prime, url: L.ed, other: c.ed.out !== oh || c.ed.in !== ih ? c.ed : null});
  const min = Math.min(...rows.map(r => r.p));
  rows.forEach(r => r.top = rows.length > 1 && r.p === min);
  const priced = rows.map(r => `<div class="crow ${r.top ? 'top' : ''}"><span>${esc(r.name)}${r.top ? '<em>mais barato</em>' : ''}</span><span class="cp">${eur(r.p)}${r.prime ? `<small>${eur0(r.prime)} para membros Prime pagos</small>` : ''}${r.fee ? `<small>inclui ≈10 € de taxa de agência no computador; no telemóvel não há</small>` : ''}${r.other ? `<small>voos das ${esc(r.other.out)} e ${esc(r.other.in)}</small>` : ''}${P.payers > 1 ? `<small>por pessoa · ≈ ${eur0(r.p * P.payers)} total</small>` : ''}</span><a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">Abrir</a></div>`).join('');
  const dir = directLink(it, P);
  const links = (dir ? `<div class="crow direct"><span>${esc(dir.name)}<em class="neutral">site oficial</em></span><span class="muted">sem taxas de agência</span><a class="btn sm" href="${esc(dir.url)}" target="_blank" rel="noopener">Abrir</a></div>` : '') + [!c.ed && ['eDreams', L.ed]].filter(Boolean)
    .map(([n, u]) => `<div class="crow"><span>${esc(n)}</span><span class="muted">abre com estas datas</span><a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">Abrir</a></div>`).join('')
    + `<span class="note">Ver também no <a href="${esc(L.sky)}" target="_blank" rel="noopener">Skyscanner</a> ou no <a href="${esc(L.gfl)}" target="_blank" rel="noopener">Google Voos</a>.</span>`;
  const seen = rows.length > 1 && DATA ? ` Preços vistos hoje às ${pad2(new Date(DATA.updated).getHours())}:${pad2(new Date(DATA.updated).getMinutes())}.` : '';
  return `<span class="note">Mesmas datas, por pessoa, só com mochila.${seen} Os outros sites abrem já com os aeroportos, as datas e ${paxLabel(P)}.</span>${priced}${links}
    <span class="note">O eDreams e o lastminute.com mostram o preço sem malas; acrescenta-as lá. Confirma horários e malas antes de pagar.</span>`;
}
function hotelHtml(it, P){
  const H = it.hotel, n = nightsOf(it), f = groupPrice(it, P), h = hotelPrice(it, P);
  return `<div class="hrow"><div><b>${esc(H.name)}<i class="src bk">Booking</i></b><span>${esc(H.type)} · nota ${String(H.rating).replace('.', ',')} · ${hotelSameDates(it) ? '' : '≈ '}${eur0(hotelP2(it))} por ${n} noite${n > 1 ? 's' : ''}, 2 pessoas num quarto</span></div><div class="hp"><a class="btn sm primary" href="${esc(hotelUrl(it, P))}" target="_blank" rel="noopener" data-out="booking">Ver</a></div></div>
    <div class="sec" style="gap:8px"><b>Voo + hotel para ${paxLabel(P)}: ${eur0(f + h)}</b>${costBar(f, h, H)}<span class="costnote">${P.rooms} quarto${P.rooms > 1 ? 's' : ''} × ${eur0(hotelP2(it))}. O mais barato com nota 7 ou mais, visto de manhã${hotelSameDates(it) ? '' : ' para outras datas nesta cidade, por isso o preço é uma estimativa por noite'}. ${P.total > P.rooms * 2 ? 'Com mais de 2 pessoas por quarto o preço pode subir.' : 'Confirma no Booking antes de reservar.'}</span></div>`;
}
function renderTab(){
  const body = $('dBody'); if (!SH || !body) return;
  const it = SH.it, P = SH.P, L = links(it, P), n = nightsOf(it);
  if (sheetTab === 'flight'){
    body.innerHTML = `<div class="sec"><h4>${icon('plane')}Horários</h4>${legBlock('Ida', it.outbound)}${legBlock('Volta', it.inbound)}
        <div class="facts">${isDirect(it) ? '<span class="fact ok">Direto</span>' : ''}<span class="fact dim">Só mochila pequena incluída</span></div></div>
      <div class="sec"><h4>${icon('swap')}Comparar com outros sites</h4>
        ${compareHtml(it, P, L)}</div>
      ${CFG.airhelp ? `<div class="sec"><h4>${icon('plane')}Se o voo atrasar ou for cancelado</h4>
        ${linkRow('Podes ter direito a até 600 € por pessoa', 'Pelas regras europeias, se chegares com mais de 3 horas de atraso, ou se o voo for cancelado em cima da hora. Podes pedir diretamente à companhia, de graça, ou deixar a AirHelp tratar de tudo (cobra uma parte só se ganhares).', CFG.airhelp, 'Ver na AirHelp', null)}</div>` : ''}`;
  } else if (sheetTab === 'stay'){
    body.innerHTML = `<div class="sec"><h4>${icon('bed')}Alojamento</h4>
        <span class="note">${n} noite${n > 1 ? 's' : ''} · ${fmtShort(it.outbound.departureTime)} a ${fmtShort(it.inbound.departureTime)} · ${paxLabel(P)}, ${P.rooms} quarto${P.rooms > 1 ? 's' : ''}. Os sites abrem já com estas datas.</span>
        ${it.hotel ? hotelHtml(it, P) : ''}
        ${linkRow(`Hotéis em ${cityOf(it)}`, 'Hotéis, apartamentos e guest houses, com cancelamento grátis em muitos', L.booking, 'Ver no Booking', ['bk', 'Booking'])}
        ${linkRow(`Casas em ${cityOf(it)}`, 'Apartamentos inteiros, bons para grupos e famílias', L.airbnb, 'Ver no Airbnb', ['lm', 'Airbnb'])}</div>`;
  } else {
    const d1 = atNoon(it.outbound.arrivalTime || it.outbound.departureTime), d2 = atNoon(it.inbound.departureTime);
    body.innerHTML = `<div class="sec"><h4>${icon('ticket')}Espetáculos, visitas e eventos</h4>
        ${linkRow(`Visitas e atividades em ${cityOf(it)}`, `${fmtDay(d1)} a ${fmtDay(d2)} · bilhetes com cancelamento grátis em muitas`, L.gyg, 'Ver', ['fv', 'GetYourGuide'])}
        ${linkRow(`Concertos e eventos`, `O que há em ${cityOf(it)} entre ${fmtDay(d1)} e ${fmtDay(d2)}`, L.events, 'Procurar', null)}</div>
      <div class="sec"><h4>${icon('ball')}Futebol</h4><div id="pFoot">${footballHtml(it, d1, d2).replace(/class="hbook"/g, 'class="btn sm"')}</div></div>`;
  }
}
$('dBox').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t){ setTab(t.dataset.tab); return; }
  const s = e.target.closest('[data-sact]'); if (!s || !SH) return;
  if (s.dataset.sact === 'save'){ saveIt(SH.it, SH.P, s); return; }
  shareTrip(SH.it, SH.P);
});
async function shareTrip(it, P){
  const n = nightsOf(it), url = `${location.origin}${location.pathname}#viagem=${encodeURIComponent(it.key || '')}`, text = `${cityOf(it)} ${deO(it.outbound.from)}, ${fmtShort(it.outbound.departureTime)} a ${fmtShort(it.inbound.departureTime)} (${n} noites): desde ${eur0(bestOf(it, P).p)} por pessoa, ida e volta.`;
  try {
    if (navigator.share){ await navigator.share({title: 'Voa Daqui', text, url}); return; }
    await navigator.clipboard.writeText(`${text}\n${url}`); toast('Link copiado. Cola numa mensagem para partilhar.');
  } catch (e){}
}

// ---------- list (this device) ----------
const LIST_KEY = 'voa-daqui-site-lista';
let list = store.get(LIST_KEY, []);
const listUrls = () => new Set(list.map(x => x.url));
function saveIt(it, P, btn){
  if (listUrls().has(it.bookingUrl)){ list = list.filter(x => x.url !== it.bookingUrl); toast(`${cityOf(it)} saiu da lista.`); }
  else {
    const n = nightsOf(it);
    list.unshift({city: cityOf(it), country: countryOf(it), countryEn: countryEn(it), code: it.outbound.to, from: it.outbound.from, dep: isoDay(it.outbound.departureTime), price: bestOf(it, P).p, pax: P.total, payers: P.payers,
      dates: `${fmtShort(it.outbound.departureTime)} → ${fmtShort(it.inbound.departureTime)} · ${n} noite${n > 1 ? 's' : ''}`, url: it.bookingUrl, addedAt: new Date().toISOString()});
    toast(`${cityOf(it)} guardado na lista.`);
  }
  store.set(LIST_KEY, list);
  const on = listUrls().has(it.bookingUrl);
  if (btn){ btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); }
  document.querySelectorAll('.heart[data-i]').forEach(h => { const x = current[+h.dataset.i]; if (x && x.bookingUrl === it.bookingUrl){ h.classList.toggle('on', on); h.setAttribute('aria-pressed', String(on)); } });
  drawList();
}
function drawList(){
  document.querySelectorAll('[data-listn]').forEach(n => { n.hidden = !list.length; n.textContent = list.length || ''; });
  if (!list.length){ $('list').innerHTML = `<div class="empty"><b>A lista está vazia</b><span>Toca no coração dos destinos de que gostares. Depois partilha a lista com quem vai contigo.</span><button type="button" class="btn" data-goview="search">${icon('search')}Explorar destinos</button></div>`; return; }
  const live = new Set(ALL.map(it => it.bookingUrl));
  $('list').innerHTML = `<div><button type="button" class="btn" id="shareList">${icon('share')}Partilhar a lista</button></div>` + list.map((x, k) => `<div class="item"><div class="thumb">${art(x.code || x.city, x.countryEn || '', 200)}</div><div class="ib">
      <div class="top"><div><div class="t">${esc(x.city)}${x.country ? ` <span class="muted" style="font-weight:500">· ${esc(x.country)}</span>` : ''}</div><div class="s">${esc(x.dates)} · ${esc(deO(x.from))}${x.dep && x.dep < isoLocal(new Date()) ? '' : DATA && !live.has(x.url) ? ' · já não está entre os mais baratos de hoje' : ''}</div>${x.dep && x.dep < isoLocal(new Date()) ? '<span class="fact past">Esta viagem já passou</span>' : ''}</div>
      <div class="pr"><b>${eur0(x.price)}</b><br><span class="s">por pessoa</span></div></div>
      <div class="row2"><span class="s">guardado a ${fmtDay(new Date(x.addedAt))}</span><span class="btns"><a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">Ver voo</a><button type="button" class="btn sm" data-li="del" data-k="${k}" style="color:var(--warn)">Remover</button></span></div>
    </div></div>`).join('');
}
$('list').addEventListener('click', async e => {
  if (e.target.closest('#shareList')){
    const text = 'A nossa lista de viagens (Voa Daqui):\n' + list.map(x => `• ${x.city} ${deO(x.from)}, ${x.dates}: ${eur0(x.price)}/pessoa ${x.url}`).join('\n');
    try { if (navigator.share){ await navigator.share({title: 'Lista Voa Daqui', text}); return; } await navigator.clipboard.writeText(text); toast('Lista copiada. Cola numa mensagem para partilhar.'); } catch (err){}
    return;
  }
  const b = e.target.closest('[data-li="del"]'); if (!b) return;
  if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Confirmar'; setTimeout(() => { if (b.isConnected){ b.dataset.armed = ''; b.textContent = 'Remover'; } }, 4000); return; }
  list.splice(+b.dataset.k, 1); store.set(LIST_KEY, list); drawList();
  document.querySelectorAll('.heart[data-i]').forEach(h => { const x = current[+h.dataset.i]; const on = !!(x && listUrls().has(x.bookingUrl)); h.classList.toggle('on', on); h.setAttribute('aria-pressed', String(on)); });
});

// ---------- deal of the day ----------
function dealChart(c){
  const pts = c.hist.map(h => ({label: fmtDay(atNoon(h.d)), v: h.p, lb: h.lb})).concat([{label: 'hoje', v: c.item.price, deal: true}]);
  const W = 340, H = 120, pl = 6, pr = 6, ptp = 18, pb = 22, n = pts.length, bw = (W - pl - pr) / n, fs = n > 9 ? 8.5 : 10.5;
  const hi = Math.max(...pts.map(p => p.v), c.base) * 1.08, y = v => ptp + (H - ptp - pb) * (1 - v / hi);
  let g = '';
  pts.forEach((b, k) => {
    const x = pl + k * bw + bw * 0.18, w = bw * 0.64, top = y(b.v);
    g += `<rect x="${x}" y="${top}" width="${w}" height="${H - pb - top}" rx="5" fill="${b.deal ? 'var(--brand)' : 'var(--line)'}" ${b.lb ? 'fill-opacity=".55" stroke="var(--muted)" stroke-dasharray="3 3"' : ''}/>`;
    g += `<text x="${x + w / 2}" y="${top - 5}" text-anchor="middle" font-size="${fs}" font-weight="${b.deal ? 800 : 600}" fill="var(--ink)" font-family="var(--mono)">${b.lb ? '>' : ''}${Math.round(b.v)}€</text>`;
    g += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" font-size="${fs - .5}" fill="var(--muted)">${esc(b.label)}</text>`;
  });
  const by = y(c.base);
  g += `<line x1="${pl}" x2="${W - pr}" y1="${by}" y2="${by}" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  return `<div class="dlegend"><span><i class="sw deal"></i>preço mais baixo visto em cada dia</span><span><i class="sw line"></i>normal ${c.base} €</span></div><svg class="dchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Preço de hoje ${c.item.price} € contra o normal de ${c.base} €">${g}</svg>`;
}
const dealTitle = c => `${ORIGIN[c.item.o]} → ${pt(c.item.city).replace(/,.*$/, '')}`;
function renderDeal(){
  const box = $('dealBox'), folded = $('form').hidden;
  if (!DATA || folded){ box.hidden = true; return; }
  const c = DATA.deal;
  const minis = (DATA.others || []).map((o, k) => `<button type="button" class="mini" data-deal="o${k}"><b>${eur0(o.item.price)}</b> ${esc(dealTitle(o))}<em>−${Math.round(o.off * 100)}%</em></button>`).join('');
  box.hidden = false;
  if (!c){
    box.className = 'deal quiet';
    if (DATA.days < DATA.needDays){
      const left = DATA.needDays - DATA.days;
      box.innerHTML = `<div class="dload"><b>${icon('clock')} A Pechincha do dia está a aprender os preços</b><span>Para saber o que está "muito mais barato que o normal", o site guarda os preços de cada dia. A primeira pechincha aparece ${left === 1 ? 'amanhã' : `daqui a ${left} dias`}.</span><div class="bar"><i style="width:${Math.max(4, Math.round(DATA.days / DATA.needDays * 100))}%"></i></div></div>`;
    } else {
      const t = DATA.top;
      box.innerHTML = `<div class="dload"><b>${icon('search')} Hoje não há pechinchas fora do normal</b><span>${t ? `A maior descida é ${esc(dealTitle(t))} a ${eur0(t.item.price)}, ${Math.round(t.off * 100)}% abaixo do habitual: barato, mas não excecional.` : 'Os preços de hoje estão dentro do habitual.'}</span>${minis ? `<div class="minis">${minis}</div>` : ''}</div>`;
    }
    return;
  }
  const it = toIt(c.item), n = nightsOf(it), P = group();
  box.className = 'deal';
  box.innerHTML = `<div class="dart" data-deal="best" role="button" tabindex="0" aria-label="Ver pechincha ${esc(dealTitle(c))} a ${eur0(c.item.price)}">${art(it.outbound.to, countryEn(it), 220).replace('<svg ', '<svg class="bg" ')}<div class="shade"></div>
      <span class="tag">${icon('ticket')}Pechincha do dia</span><span class="off">−${Math.round(c.off * 100)}%</span>
      <div class="place"><div><b>${esc(cityOf(it))}</b><span>${esc(deO(c.item.o))} · ${esc(fmtShort(it.outbound.departureTime))} → ${esc(fmtShort(it.inbound.departureTime))} · ${n} noite${n > 1 ? 's' : ''}</span></div>
      <div class="was"><s>normal ${c.base} €</s><b>${eur0(c.item.price)}</b><small>${bestOf(it, P).p < c.item.price - 0.5 ? `${eur0(bestOf(it, P).p)} no ${esc(bestOf(it, P).name)}` : 'ida e volta, por pessoa'}</small></div></div></div>
    <div class="dbody">
      <div class="why">${c.lb ? 'Pelo menos ' : ''}<b>${Math.round(c.off * 100)}% abaixo</b> do preço habitual para ${esc(cityOf(it))} ${esc(deO(c.item.o))}, comparando com os últimos ${c.hist.length} dias. Voo ${isDirect(it) ? 'direto' : 'com escala'}, ${esc(airlinesOf(it))}.</div>
      ${dealChart(c)}
      <div class="dpax"><span class="lbl">Quantos vão?</span>
        <span class="stp"><button type="button" data-dpax="a-" aria-label="Menos um adulto"${pax.adults <= 1 ? ' disabled' : ''}>−</button><b>${pax.adults}</b> adulto${pax.adults > 1 ? 's' : ''}<button type="button" data-dpax="a+" aria-label="Mais um adulto"${pax.adults >= 9 ? ' disabled' : ''}>+</button></span>
        <span class="stp"><button type="button" data-dpax="k-" aria-label="Menos uma criança"${!pax.kids.length ? ' disabled' : ''}>−</button><b>${pax.kids.length}</b> criança${pax.kids.length === 1 ? '' : 's'}<button type="button" data-dpax="k+" aria-label="Mais uma criança"${pax.kids.length >= 8 ? ' disabled' : ''}>+</button></span>
      </div>
      ${P.total > 1 ? `<div class="gres warn">Para ${paxLabel(P)}: cerca de <b>${eur0(groupPrice(it, P))} no total</b>${bestOf(it, P).site !== 'kiwi' ? ` no ${esc(bestOf(it, P).name)}` : ''}${it.hotel ? `, ou ${eur0(packPrice(it, P))} com hotel` : ''}. Os lugares mais baratos costumam ser poucos: confirma se há para todos.</div>` : ''}
      ${minis ? `<div><div class="lbl" style="margin-bottom:6px">Outras descidas fortes · por pessoa</div><div class="minis">${minis}</div></div>` : ''}
      <div class="dfoot"><span class="note">Estas ofertas costumam desaparecer em poucas horas.</span><span class="btns"><button type="button" class="btn sm primary" data-deal="best">Ver viagem</button></span></div>
    </div>`;
}
function paxChanged(){ if (DATA && DATA.deal && !$('dealBox').hidden) renderDeal(); if (DATA && ctx && ctx.home) showDefault(); }
$('dealBox').addEventListener('click', e => {
  const s = e.target.closest('[data-dpax]');
  if (s){
    const k = s.dataset.dpax;
    if (k === 'a+') pax.adults = Math.min(9, pax.adults + 1); else if (k === 'a-') pax.adults = Math.max(1, pax.adults - 1);
    else if (k === 'k+' && pax.kids.length < 8) pax.kids.push(6); else if (k === 'k-') pax.kids.pop();
    if (!pax.roomsTouched) pax.rooms = Math.max(1, Math.ceil(pax.adults / 2));
    drawPax(); rememberForm(); renderDeal(); return;
  }
  const b = e.target.closest('[data-deal]'); if (!b || !DATA) return;
  const k = b.dataset.deal, c = k === 'best' ? DATA.deal : (DATA.others || [])[+k.slice(1)];
  if (c) openTripFor(toIt(c.item), group());
});
$('dealBox').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dart') && DATA && DATA.deal){ e.preventDefault(); openTripFor(toIt(DATA.deal.item), group()); } });

// ---------- comprar direto na companhia (sem taxas de agência, não dá comissão) ----------
const AIRLINE_HOME = {'TAP Portugal': 'https://www.flytap.com/pt-pt', 'Vueling': 'https://www.vueling.com/pt', 'Wizz Air': 'https://wizzair.com/pt-pt', 'Wizz Air Malta': 'https://wizzair.com/pt-pt',
  'Transavia': 'https://www.transavia.com', 'Transavia France': 'https://www.transavia.com', 'Volotea': 'https://www.volotea.com/pt', 'Iberia Airlines': 'https://www.iberia.com/pt', 'Air Europa': 'https://www.aireuropa.com/pt/pt/home',
  'Jet2': 'https://www.jet2.com', 'Aer Lingus': 'https://www.aerlingus.com', 'Eurowings': 'https://www.eurowings.com/pt.html', 'Swiss International Air Lines': 'https://www.swiss.com/pt/pt', 'KLM Royal Dutch Airlines': 'https://www.klm.pt'};
function directLink(it, P){
  const cars = [...new Set([...it.outbound.segments, ...it.inbound.segments].map(x => x.carrierName))];
  if (cars.length !== 1) return null;
  const c = cars[0], o = it.outbound.from, d = it.outbound.to, a = isoDay(it.outbound.departureTime), b = isoDay(it.inbound.departureTime);
  if (c === 'Ryanair') return {name: 'Ryanair', url: `https://www.ryanair.com/pt/pt/trip/flights/select?adults=${P.adults}&teens=0&children=${P.children}&infants=${P.infants}&dateOut=${a}&dateIn=${b}&isConnectedFlight=false&discount=0&promoCode=&isReturn=true&originIata=${o}&destinationIata=${d}`};
  if (c === 'easyJet') return {name: 'easyJet', url: `https://www.easyjet.com/pt/buy/flights?isOneWay=off&dep=${o}&dest=${d}&dd=${a}&rd=${b}&apax=${P.adults}&cpax=${P.children}&ipax=${P.infants}`};
  return AIRLINE_HOME[c] ? {name: c, url: AIRLINE_HOME[c]} : null;
}

// ---------- pesquisa livre (Kiwi.com e lastminute.com) ----------
const CFG = window.VOA_CONFIG || {};
// links de afiliado: ficam ativos quando houver códigos em assets/config.js
function aff(site, url){
  if (site === 'kiwi' && CFG.kiwiAffil) return url + '&affilid=' + encodeURIComponent(CFG.kiwiAffil);
  if (site === 'lm' && CFG.awinId && CFG.awinLastminute) return `https://www.awin1.com/cread.php?awinmid=${CFG.awinLastminute}&awinaffid=${CFG.awinId}&ued=${encodeURIComponent(url)}`;
  return url;
}
const ymd = s => s.replace(/-/g, ''), dmy = s => s.split('-').reverse().join('-');
function lmSearch(o, d, a, b, P){
  return `https://www.lastminute.ie/s/flights/search/v2/results?itinerary.path[0].departure=${o}&itinerary.path[0].arrival=${d}&itinerary.path[0].date=${ymd(a)}` +
    (b ? `&itinerary.path[1].departure=${d}&itinerary.path[1].arrival=${o}&itinerary.path[1].date=${ymd(b)}&itinerary.type=ROUND_TRIP` : '&itinerary.type=ONE_WAY') +
    `&passengers.adults=${P.adults}${P.ages.length ? '&passengers.childrenAges=' + P.ages.join(',') : ''}&flexDateDays=0&currency=EUR&businessProfile=LASTMINUTEIE`;
}
const kiwiSearch = (o, d, a, b, P) => `https://www.kiwi.com/deep?origin=${o}&destination=${d}&departure=${dmy(a)}${b ? '&return=' + dmy(b) : ''}&adults=${P.adults}&children=${P.children}&infants=${P.infants}&currency=EUR&lang=pt`;
const AP = new Map(AIRPORTS.map(x => [x[0], x]));
$('apList').innerHTML = AIRPORTS.map(([c, n, k]) => `<option value="${esc(n)} (${c})">${esc(k)}</option>`).join('');
function apCode(v){
  v = (v || '').trim(); let m = /\(([A-Za-z]{3})\)\s*$/.exec(v) || /^([A-Za-z]{3})$/.exec(v);
  if (m) return m[1].toUpperCase();
  const q = norm(v); if (q.length < 3) return null;
  const hit = AIRPORTS.find(x => norm(x[1]) === q) || AIRPORTS.find(x => norm(x[1]).startsWith(q));
  return hit ? hit[0] : null;
}
const apName = c => AP.has(c) ? AP.get(c)[1].replace(/ \(.*\)$/, '') : c;
(() => { const t = new Date(); $('lD1').min = $('lD2').min = isoLocal(t); $('lD1').value = isoLocal(addDays(t, 14)); $('lD2').value = isoLocal(addDays(t, 17)); })();
$('lOne').addEventListener('change', () => { $('lD2').disabled = $('lOne').checked; });
$('lSwap').addEventListener('click', () => { const a = $('lFrom').value; $('lFrom').value = $('lTo').value; $('lTo').value = a; });
function liveSearch(){
  const P = group(), o = apCode($('lFrom').value), d = apCode($('lTo').value), a = $('lD1').value, one = $('lOne').checked, b = one ? '' : $('lD2').value;
  if (!o) return showErr('Escolhe a cidade de partida na lista.');
  if (!d) return showErr('Escolhe o destino na lista (ex.: Sevilha, Londres, Nova Iorque).');
  if (o === d) return showErr('A partida e o destino são iguais.');
  if (!a) return showErr('Escolhe a data de ida.');
  if (!one && (!b || b < a)) return showErr('A volta tem de ser depois da ida.');
  rememberForm();
  const kiwi = aff('kiwi', kiwiSearch(o, d, a, b, P)), lm = aff('lm', lmSearch(o, d, a, b, P));
  const sky = `https://www.skyscanner.pt/transporte/voos/${o.toLowerCase()}/${d.toLowerCase()}/${a.slice(2).replace(/-/g, '')}/${b ? b.slice(2).replace(/-/g, '') + '/' : ''}?adultsv2=${P.adults}${P.ages.length ? '&childrenv2=' + P.ages.join('|') : ''}`;
  const gfl = `https://www.google.com/travel/flights?hl=pt-PT&curr=EUR&q=${encodeURIComponent(`Voos de ${o} para ${d} em ${a}${b ? ' regresso ' + b : ' só ida'}`)}`;
  const when = `${fmtShort(a + 'T12:00')}${b ? ' a ' + fmtShort(b + 'T12:00') : ', só ida'}`;
  // o que já vimos hoje para esta rota (montra e pontes)
  const same = x => x.o === o && (x.to === d || CITY_CODE[x.to] === d);
  const seen = DATA.items.filter(same).concat(...(DATA.pontes || []).map(p => p.items.filter(same))).sort((x, y) => bestOf(toIt(x), P).p - bestOf(toIt(y), P).p)[0];
  ctx = {P, o: opts(), mode: 'live', budget: 0, label: ''};
  current = seen ? [toIt(seen)] : [];
  collapse(`${apName(o)} → ${apName(d)}`, `${when} · ${paxText()}`);
  $('out').innerHTML = `<section class="livebox">
      <div class="lhead"><h2>${esc(apName(o))} → ${esc(apName(d))}</h2><p>${esc(when)}, ${esc(paxLabel(P))}. Escolhe onde ver os preços ao minuto:</p></div>
      <div class="lbtns">
        <a class="lbtn" href="${esc(kiwi)}" target="_blank" rel="noopener"><b>Ver no Kiwi.com</b><span>Junta companhias diferentes na ida e na volta e encontra combinações low-cost.</span><i>Abrir pesquisa</i></a>
        <a class="lbtn" href="${esc(lm)}" target="_blank" rel="noopener"><b>Ver no lastminute.com</b><span>${DESKTOP ? 'No computador junta uma taxa de agência (≈10 € por pessoa); no telemóvel costuma sair mais barato.' : 'No telemóvel não cobra taxa de agência. Tem também voo + hotel.'}</span><i>Abrir pesquisa</i></a>
      </div>
      <p class="note">Abre noutro separador, já com os aeroportos, as datas e ${esc(paxLabel(P))}. Também podes comparar no <a href="${esc(sky)}" target="_blank" rel="noopener">Skyscanner</a> ou no <a href="${esc(gfl)}" target="_blank" rel="noopener">Google Voos</a>.</p>
      ${seen ? `<div class="lseen"><span>Hoje vimos ${esc(cityOf(current[0]))} ${esc(deO(o))} desde <b>${eur0(bestOf(current[0], P).p)}</b> por pessoa, ${esc(fmtShort(current[0].outbound.departureTime))} a ${esc(fmtShort(current[0].inbound.departureTime))}.</span><button type="button" class="btn sm" data-open="0">Ver essa viagem</button></div>` : ''}
    </section>`;
}

// ---------- fins de semana sem faltar ao trabalho ----------
const wkList = () => ALL.filter(isWk);
const friOf = it => { const d = atNoon(it.outbound.departureTime); if (d.getDay() === 6) d.setDate(d.getDate() - 1); return isoLocal(d); };
function renderFds(){
  const box = $('fds'), L = DATA ? wkList() : [];
  if (L.length < 3 || $('form').hidden){ box.hidden = true; return; }
  const by = new Map();
  for (const it of L){ const k = friOf(it); if (!by.has(k)) by.set(k, []); by.get(k).push(it); }
  const minOf = k => Math.min(...by.get(k).map(it => bestOf(it).p));
  const weeks = [...by.keys()].sort((a, b) => minOf(a) - minOf(b)).slice(0, 4).sort();   // os 4 fins de semana mais baratos, por data
  const card = k => { const its = by.get(k).sort((a, b) => bestOf(a).p - bestOf(b).p), seen = new Set();
    const top = its.filter(it => { const c = cityOf(it); if (seen.has(c)) return false; seen.add(c); return true; }).slice(0, 3);
    const f = atNoon(k + 'T12:00'), su = new Date(f); su.setDate(f.getDate() + 2);
    return `<article class="ponte"><header><h3>Sexta ${f.getDate()} a domingo ${su.getDate()}</h3><span>${esc(MONTHS[f.getMonth()])}${su.getMonth() !== f.getMonth() ? ' / ' + esc(MONTHS[su.getMonth()]) : ''}</span><em>Sem tirar férias</em></header>
      <ol>${top.map(it => `<li><button type="button" data-wk="${esc(it.key)}"><span><b>${esc(cityOf(it))}</b><small>${esc(deO(it.outbound.from))}, sai ${WDL[new Date(it.outbound.departureTime).getDay()].replace('-feira', '')} às ${fmtHM(it.outbound.departureTime)}</small></span><i>${eur0(bestOf(it).p)}</i></button></li>`).join('')}</ol>
      ${its.length > 3 ? `<button type="button" class="btn sm" data-wkall="${k}">Ver os ${its.length} voos</button>` : ''}</article>`; };
  box.hidden = false;
  box.innerHTML = `<div class="sechead"><h2>Fins de semana sem faltar ao trabalho</h2><p>Sais à sexta depois das 18h e voltas no domingo. Não gastas nenhum dia de férias.</p></div>
    <div class="pgrid">${weeks.map(card).join('')}</div>`;
}
$('fds').addEventListener('click', e => {
  const b = e.target.closest('[data-wk]'), a = e.target.closest('[data-wkall]');
  if (b){ const it = ALL.find(x => x.key === b.dataset.wk); if (it) openTripFor(it, group()); return; }
  if (a) openFds(a.dataset.wkall);
});
function openFds(fri){
  const P = group();
  current = wkList().filter(it => (!fri || friOf(it) === fri) && (sel.from === 'both' || it.outbound.from === sel.from));
  const best = new Map(); for (const it of current){ const k = it.outbound.from + cityOf(it); if (!best.has(k) || bestOf(best.get(k)).p > bestOf(it).p) best.set(k, it); }
  current = [...best.values()];
  const f = fri && atNoon(fri + 'T12:00'), title = fri ? `Fim de semana de ${f.getDate()} de ${MONTHS[f.getMonth()]}` : 'Fins de semana sem faltar ao trabalho';
  ctx = {P, o: opts(), mode: 'explore', budget: 0, label: title, wk: {title}};
  sortBy = 'price';
  collapse(title, `Sexta depois das 18h a domingo · ${summaryText()}`);
  if (!current.length){ $('out').innerHTML = '<div class="state"><b>Sem voos desta origem para este fim de semana.</b><span>Escolhe "Todos" em "De onde".</span></div>'; return; }
  renderResults();
}

// ---------- pontes e feriados ----------
const WDL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const ponteTitle = p => p.bridge ? `Ponte do ${p.name}` : p.name === 'Páscoa' ? 'Fim de semana da Páscoa' : `Fim de semana de ${p.name}`;
const ponteDates = p => `${fmtShort(p.start + 'T12:00')} a ${fmtShort(p.end + 'T12:00')}`;
function renderPontes(){
  const box = $('pontes'), L = (DATA && DATA.pontes) || [];
  if (!L.length || $('form').hidden){ box.hidden = true; return; }
  box.hidden = false;
  const now = L.filter(p => p.items && p.items.length), later = L.filter(p => !p.items || !p.items.length);
  const card = p => { const seen = new Set(), top = p.items.filter(x => { const c = pt(x.city).replace(/,.*$/, ''); if (seen.has(c)) return false; seen.add(c); return true; }).slice(0, 3);
    return `<article class="ponte"><header><h3>${esc(ponteTitle(p))}</h3><span>${esc(ponteDates(p))}, ${p.days} dias</span>${p.bridge ? `<em>Tira ${WDL[atNoon(p.bridge).getDay()]} ${atNoon(p.bridge).getDate()} de férias</em>` : '<em>Sem tirar férias</em>'}</header>
      <ol>${top.map(x => `<li><button type="button" data-pt="${esc(p.id)}" data-pk="${esc(x.key)}"><span><b>${esc(pt(x.city).replace(/,.*$/, ''))}</b><small>${esc(deO(x.o))}</small></span><i>${eur0(x.price)}</i></button></li>`).join('')}</ol>
      <button type="button" class="btn sm" data-pall="${esc(p.id)}">Ver os ${p.items.length} voos</button></article>`; };
  box.innerHTML = `<div class="sechead"><h2>Pontes e feriados</h2><p>Fins de semana prolongados com voos procurados para as datas certas: ida na véspera ou no primeiro dia, volta no último.</p></div>
    <div class="pgrid">${now.map(card).join('')}</div>
    ${later.length ? `<div class="plater"><span>A seguir</span>${later.map(p => `<span class="pchip"><b>${esc(ponteTitle(p))}</b>${esc(ponteDates(p))}</span>`).join('')}<small>Os voos aparecem 8 semanas antes.</small></div>` : ''}`;
}
$('pontes').addEventListener('click', e => {
  const b = e.target.closest('[data-pt]'), a = e.target.closest('[data-pall]');
  const P = group();
  if (b){ const p = DATA.pontes.find(x => x.id === b.dataset.pt), x = p && p.items.find(i => i.key === b.dataset.pk); if (x) openTripFor(toIt(x), P); return; }
  if (a) openPonte(a.dataset.pall);
});
function openPonte(id){
  const P = group(), p = (DATA.pontes || []).find(x => x.id === id); if (!p || !p.items || !p.items.length) return false;
  const title = ponteTitle(p);
  current = p.items.filter(x => sel.from === 'both' || x.o === sel.from).map(toIt);
  ctx = {P, o: opts(), mode: 'explore', budget: 0, label: title, ponte: {id: p.id, title}};
  sortBy = 'price';
  collapse(title, `${ponteDates(p)}, ${p.days} dias · ${summaryText()}`);
  if (!current.length){ $('out').innerHTML = '<div class="state"><b>Sem voos desta origem para esta ponte.</b><span>Escolhe "Todos" em "De onde".</span></div>'; return true; }
  renderResults(); return true;
}

// ---------- página inicial: todos os destinos ----------
function showDefault(){
  ctx = {P: group(), o: opts(), mode: 'explore', budget: 0, label: 'Qualquer lugar', home: true};
  const best = new Map();
  for (const it of ALL){ const k = cityOf(it); if (!best.has(k) || groupPrice(best.get(k), ctx.P) > groupPrice(it, ctx.P)) best.set(k, it); }
  current = [...best.values()]; sortBy = 'price'; renderResults();
}

// ---------- board: os mais baratos agora ----------
let BOARD = [];
function renderBoard(){
  const seen = new Set(); BOARD = [];
  const bp = x => bestOf(toIt(x), group()).p;
  for (const x of DATA.items.slice().sort((a, b) => bp(a) - bp(b))){
    const c = pt(x.city).replace(/,.*$/, ''); if (seen.has(c)) continue; seen.add(c); BOARD.push(x); if (BOARD.length === 8) break;
  }
  const u = new Date(DATA.updated);
  $('boardT').textContent = `Atualizado ${new Date().toDateString() === u.toDateString() ? 'hoje' : 'a ' + fmtDay(u)} às ${pad2(u.getHours())}:${pad2(u.getMinutes())}`;
  $('boardL').innerHTML = BOARD.map((x, k) => { const it = toIt(x), n = nightsOf(it);
    return `<li><button type="button" data-board="${k}"><span class="bt"><b>${esc(cityOf(it))}</b><small>${esc(deO(x.o))}, ${esc(fmtDay(atNoon(x.out.dep)))} a ${esc(fmtDay(atNoon(x.in.dep)))}, ${n} noite${n > 1 ? 's' : ''}</small></span><span class="bp">${eur0(bp(x))}</span></button></li>`; }).join('');
}
$('boardL').addEventListener('click', e => { const b = e.target.closest('[data-board]'); if (b && BOARD[+b.dataset.board]) openTripFor(toIt(BOARD[+b.dataset.board]), group()); });

// ---------- global clicks ----------
document.addEventListener('click', e => {
  const sortB = e.target.closest('[data-sort] button');
  if (sortB){ sortBy = sortB.dataset.v; renderResults(); return; }
  const b = e.target.closest('[data-act="save"]');
  if (b){ const it = current[+b.dataset.i]; if (it) saveIt(it, ctx.P, b); return; }
  const o = e.target.closest('[data-open]'); if (o && !openSheetEl) openTrip(+o.dataset.open);
});

// ---------- visitas (GoatCounter, sem cookies) ----------
// Para ligar: escrever o código da conta em assets/config.js (VOA_CONFIG.goatcounter).
const GC = (window.VOA_CONFIG || {}).goatcounter;
if (GC){ const sc = document.createElement('script'); sc.async = true; sc.dataset.goatcounter = `https://${GC}.goatcounter.com/count`; sc.src = '//gc.zgo.at/count.js'; document.head.appendChild(sc); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="http"]'); if (!a || !window.goatcounter || !window.goatcounter.count) return;
  let host = ''; try { host = new URL(a.href).hostname.replace(/^www\./, ''); } catch (x){}
  if (host && host !== location.hostname) window.goatcounter.count({path: 'saida/' + host, title: 'Saída para ' + host, event: true});
}, true);

// ---------- preços desatualizados ----------
function checkStale(){
  const age = (Date.now() - new Date(DATA.updated)) / 36e5, h = new Date().getHours();
  const stale = age > 13 || (age > 7.5 && h >= 8);   // atualizações às 7h, 13h e 19h; de noite não há
  $('stale').hidden = !stale;
  if (stale) $('stale').innerHTML = `<span><b>Preços de há ${age < 48 ? Math.round(age) + ' horas' : Math.round(age / 24) + ' dias'}.</b> As atualizações automáticas estão atrasadas, por isso os preços podem já ter mudado. Confirma sempre no site da reserva.</span>`;
}
// ---------- links diretos: #viagem=… e #ponte=… ----------
function openFromHash(){
  const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e){}
  if (h.startsWith('viagem=')){
    const k = h.slice(7), x = DATA.items.concat(DATA.weekend || []).find(i => i.key === k) || (DATA.pontes || []).flatMap(p => p.items || []).find(i => i.key === k);
    if (x) openTripFor(toIt(x), group()); else toast('Essa viagem já não está entre as mais baratas de hoje. Vê as de agora.');
  } else if (h.startsWith('ponte=')){ if (!openPonte(h.slice(6))) toast('Essa ponte já não tem voos guardados.'); }
}

// ---------- start ----------
drawList();
$('go').disabled = true; $('goTxt').textContent = 'A carregar os preços…';
fetch('data/data.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
  // tira voos que partem nas próximas 3 horas ou que já partiram (se as atualizações pararem)
  const cut = new Date(Date.now() + 3 * 36e5), keep = x => new Date(x.out.dep + ':00') > cut;
  j.items = j.items.filter(keep); j.weekend = (j.weekend || []).filter(keep); (j.pontes || []).forEach(p => { p.items = (p.items || []).filter(keep); });
  DATA = j; ALL = j.items.concat(j.weekend).map(toIt);
  $('go').disabled = false; $('goTxt').textContent = mode === 'live' ? 'Pesquisar voos' : 'Procurar voos';
  const u = new Date(j.updated);
  $('foot').textContent = `Preços por pessoa, ida e volta, só com mochila pequena, vistos ${new Date().toDateString() === u.toDateString() ? 'hoje' : `a ${fmtDay(u)}`} às ${pad2(u.getHours())}:${pad2(u.getMinutes())}. Atualizados três vezes por dia, às 7h, 13h e 19h. Mudam a toda a hora: confirma sempre o preço final antes de pagar. As imagens são ilustrações.`;
  renderDeal(); renderFds(); renderPontes(); renderBoard(); showDefault(); drawList(); checkStale(); openFromHash();
}).catch(() => { $('goTxt').textContent = 'Não foi possível carregar os preços'; showErr('Não foi possível carregar os voos. Tenta recarregar a página daqui a pouco.'); });
