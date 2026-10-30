// Voa Daqui · versão pública (GitHub Pages)
// Lê data/data.json, gerado todas as manhãs a partir do Kiwi.com (ver UPDATE.md).

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
function openSheet(id){
  const s = $(id); lastFocus = document.activeElement; s.hidden = false; openSheetEl = s; document.body.classList.add('locked');
  const f = s.querySelector('button, a, input, select'); if (f) f.focus({preventScroll: true});
}
function closeSheet(){
  if (!openSheetEl) return; openSheetEl.hidden = true; if (openSheetEl.id === 'filters') updateFiltSum();
  openSheetEl = null; document.body.classList.remove('locked'); if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll: true});
}
document.addEventListener('click', e => { if (openSheetEl && e.target.closest('[data-close]') && openSheetEl.contains(e.target)) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
$('hero').insertAdjacentHTML('afterbegin', art('LIS', 'Portugal', 220).replace('<svg ', '<svg class="bg" ').replace('</svg>', `<path d="M-10 160 Q140 40 420 70" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="5 6" fill="none"/><g transform="translate(300 72) rotate(-8)"><path d="M-14 0 L14 -1 L18 0 L14 1 L-14 0 Z M-2 0 L-8 -9 L-4 -9 L6 0 Z M-2 0 L-8 9 L-4 9 L6 0 Z M-13 0 L-17 -5 L-15 -5 L-10 0 Z" fill="#fff"/></g></svg>`));

// ---------- views ----------
document.querySelectorAll('.tabbar [data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
function showView(v){
  document.querySelectorAll('.tabbar [data-view]').forEach(b => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
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
  budget: 'Diz quanto queres gastar em voos para o grupo todo e vê para onde dá para ir.'
};
function setMode(m){
  mode = m;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  $('modehelp').textContent = MODEHELP[m];
  $('fBudget').hidden = m !== 'budget';
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
const formSnapshot = () => ({mode, sel: Object.assign({}, sel), pax: {adults: pax.adults, kids: pax.kids.slice(), rooms: pax.rooms, roomsTouched: pax.roomsTouched}, city: $('city').value, budget: $('budget').value, opts: opts()});
function applyForm(s){
  if (!s) return;
  if (s.pax){ pax.adults = s.pax.adults || 1; pax.kids = (s.pax.kids || []).slice(); pax.rooms = s.pax.rooms || 1; pax.roomsTouched = !!s.pax.roomsTouched; }
  for (const g of ['to', 'when', 'trip', 'from']) if (s.sel && s.sel[g] != null && document.querySelector(`.chips[data-group="${g}"] [data-v="${s.sel[g]}"]`)) setChip(g, s.sel[g]);
  $('city').value = s.city || ''; $('budget').value = s.budget || '';
  if (s.opts){ for (const k of ['direct', 'noDawn', 'weekends']) $(k).checked = !!s.opts[k]; $('maxDur').value = String(s.opts.maxDur || 0); }
  setMode(s.mode === 'budget' ? 'budget' : 'explore');
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
  return {price: x.price, bookingUrl: x.url, baggage: {personalItem: 1, cabinBag: 0, checkedBag: 0}, key: x.key, cmp: x.cmp || {},
    outbound: {from: x.o, to: x.to, departureTime: x.out.dep + ':00', arrivalTime: x.out.arr + ':00', durationSeconds: (x.out.min || 0) * 60, stops: x.out.stops, route: [x.o, x.to], segments: [seg(x.o, x.to, cars[0], oc, x.city, 'Portugal', x.country)]},
    inbound: {from: x.to, to: x.o, departureTime: x.in.dep + ':00', arrivalTime: x.in.arr + ':00', durationSeconds: (x.in.min || 0) * 60, stops: x.in.stops, route: [x.to, x.o], segments: [seg(x.to, x.o, cars[1] || cars[0], x.city, oc, x.country, 'Portugal')]}};
}

// ---------- fare helpers ----------
const lastSeg = it => (it.outbound.segments || []).slice(-1)[0] || {};
const cityOf = it => pt(lastSeg(it).toCity || it.outbound.to).replace(/,.*$/, '');
const countryEn = it => lastSeg(it).toCountry || '';
const countryOf = it => { const c = countryEn(it); return COUNTRY[c] ?? c; };
const nightsOf = it => it.inbound ? Math.max(1, Math.round((atNoon(it.inbound.departureTime) - atNoon(it.outbound.departureTime)) / 864e5)) : 0;
const totalDur = it => (it.outbound.durationSeconds || 0) + (it.inbound ? it.inbound.durationSeconds || 0 : 0);
const isDirect = it => it.outbound.stops === 0 && (!it.inbound || it.inbound.stops === 0);
const airlinesOf = it => [...new Set([...it.outbound.segments, ...it.inbound.segments].map(s => s.carrierName))].join(', ');
const groupPrice = (it, P) => it.price * Math.max(1, P.payers);

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
const collapse = (title, sub) => { $('form').hidden = true; $('hero').hidden = true; $('dealBox').hidden = true; $('summary').hidden = false; $('sumT').textContent = title; $('sumS').textContent = sub; window.scrollTo({top: 0}); };
$('edit').addEventListener('click', () => { $('form').hidden = false; $('summary').hidden = true; renderDeal(); window.scrollTo({top: 0, behavior: 'smooth'}); });
function showErr(msg){ $('out').innerHTML = `<div class="state err"><b>${esc(msg)}</b></div>`; }
$('go').addEventListener('click', search);
function search(){
  if (!DATA) return;
  const P = group(), o = opts(), range = dateRange();
  if (sel.to === 'city' && !$('city').value.trim()) return showErr('Escreve a cidade de destino.');
  if (!range) return showErr('Escolhe as duas datas.');
  const budget = mode === 'budget' ? +$('budget').value : 0;
  if (mode === 'budget' && !(budget > 0)) return showErr('Escreve quanto queres gastar em voos.');
  rememberForm();
  const lo = isoLocal(range[0]), hi = isoLocal(range[1]);
  let list = ALL.filter(it => {
    const dep = isoDay(it.outbound.departureTime), n = nightsOf(it);
    if (sel.from !== 'both' && it.outbound.from !== sel.from) return false;
    if (dep < lo || dep > hi) return false;
    if (sel.trip !== 'all' && n !== +sel.trip) return false;
    if (!matchDest(it)) return false;
    if (o.direct && !isDirect(it)) return false;
    if (o.noDawn && (+fmtHM(it.outbound.departureTime).slice(0, 2) < 7 || +fmtHM(it.inbound.departureTime).slice(0, 2) < 7)) return false;
    if (o.weekends){ const a = new Date(it.outbound.departureTime).getDay(), b = new Date(it.inbound.departureTime).getDay(); if (![4, 5].includes(a) || ![0, 1].includes(b)) return false; }
    if (o.maxDur && Math.max(it.outbound.durationSeconds, it.inbound.durationSeconds) > o.maxDur * 3600) return false;
    if (budget && groupPrice(it, P) > budget) return false;
    return true;
  });
  if (sel.from === 'both'){ const best = new Map(); for (const it of list){ const k = cityOf(it); if (!best.has(k) || best.get(k).price > it.price) best.set(k, it); } list = [...best.values()]; }
  current = list;
  const destName = sel.to === 'city' ? $('city').value.trim() : DEST_NAME[sel.to];
  ctx = {P, o, mode, budget, label: destName};
  collapse(mode === 'budget' ? `${eur0(budget)} · ${destName}` : `${destName} · ${fmtDay(range[0])} a ${fmtDay(range[1])}`, summaryText());
  if (!current.length){
    $('out').innerHTML = `<div class="state"><b>${budget ? `Nenhum voo cabe em ${eur0(budget)} para ${paxLabel(P)}.` : 'Sem voos com estes filtros.'}</b><span>Hoje o site tem os ${ALL.length} voos mais baratos de Lisboa, Porto e Faro. Experimenta "Qualquer lugar", "Próximas 8 semanas" ou tira algum filtro.</span></div>`;
    return;
  }
  renderResults();
}
function sortIdx(idx){
  const by = {price: (a, b) => current[a].price - current[b].price, dur: (a, b) => totalDur(current[a]) - totalDur(current[b]) || current[a].price - current[b].price, date: (a, b) => current[a].outbound.departureTime.localeCompare(current[b].outbound.departureTime)}[sortBy];
  return idx.slice().sort(by);
}
function sortBar(){
  const b = (k, l) => `<button type="button" data-v="${k}" aria-pressed="${sortBy === k}">${l}</button>`;
  return `<div class="chips" data-sort>${b('price', 'Mais barato')}${b('dur', 'Mais rápido')}${b('date', 'Mais cedo')}</div>`;
}
function renderResults(){
  const P = ctx.P, idx = sortIdx(current.map((_, i) => i)), u = new Date(DATA.updated);
  const min = Math.min(...current.map(it => groupPrice(it, P)));
  $('out').innerHTML = `<div class="reshead"><div><h2>${ctx.mode === 'budget' ? `${current.length} viage${current.length === 1 ? 'm cabe' : 'ns cabem'} em ${eur0(ctx.budget)}` : `${current.length} destino${current.length === 1 ? '' : 's'} desde ${eur0(min)}`}</h2><div class="sub">Preços vistos ${new Date().toDateString() === u.toDateString() ? 'hoje' : `a ${fmtDay(u)}`} às ${pad2(u.getHours())}:${pad2(u.getMinutes())} · ${esc(paxText())}</div></div></div>
    ${sortBar()}
    ${P.total > 1 ? `<p class="note">Total estimado para ${paxLabel(P)}. Os lugares mais baratos costumam ser poucos: confirma no Kiwi se há para todos.</p>` : ''}
    <div class="grid">${idx.map((i, k) => card(i, k === 0 ? {feat: true, badge: sortBy === 'price' ? 'O mais barato' : sortBy === 'dur' ? 'O mais rápido' : 'O mais cedo'} : {})).join('')}</div>`;
}
function cheaperElsewhere(it){
  const c = it.cmp || {}, best = [['lastminute', c.lm], ['eDreams', c.ed]].filter(([, v]) => v && v.p < it.price - 0.5).sort((a, b) => a[1].p - b[1].p)[0];
  return best ? `<span class="fact ok">${esc(best[0])}: ${eur0(best[1].p)}</span>` : '';
}
function card(i, x = {}){
  const it = current[i], P = ctx.P, n = nightsOf(it);
  const total = groupPrice(it, P);
  const perTxt = P.payers > 1 ? `${eur0(it.price)} por pessoa` : 'ida e volta';
  const facts = [`<span class="fact">${esc(fmtShort(it.outbound.departureTime))} → ${esc(fmtShort(it.inbound.departureTime))}</span>`,
    isDirect(it) ? '<span class="fact ok">Direto</span>' : '<span class="fact dim">Com escala</span>', '<span class="fact dim">Só mochila</span>', cheaperElsewhere(it)].join('');
  const saved = listUrls().has(it.bookingUrl);
  return `<article class="dcard ${x.feat ? 'feat' : ''}">
    <div class="art" data-open="${i}" role="button" tabindex="0" aria-label="Ver viagem para ${esc(cityOf(it))}, ${eur0(total)}">${art(it.outbound.to, countryEn(it), x.feat ? 260 : 200)}<div class="shade"></div>
      ${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ''}
      <button type="button" class="heart ${saved ? 'on' : ''}" data-act="save" data-i="${i}" aria-label="${saved ? 'Já está na lista' : 'Guardar na lista'}" aria-pressed="${saved}">${icon('heart')}</button>
      <div class="place"><b>${esc(cityOf(it))}</b><span>${esc(countryOf(it))}${countryOf(it) ? ' · ' : ''}${n} noite${n > 1 ? 's' : ''} · ${esc(deO(it.outbound.from))}</span></div>
      <div class="pill"><b>${eur0(total)}</b><small>${esc(perTxt)}</small></div>
    </div>
    <div class="cbody">
      <div class="facts">${facts}</div>
      <div class="cfoot"><span class="muted">${esc(airlinesOf(it))} · ${fmtDur(totalDur(it))} de voo</span><button type="button" class="btn sm primary" data-open="${i}">Ver viagem</button></div>
    </div></article>`;
}

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
  const n = nightsOf(it), total = groupPrice(it, P), saved = listUrls().has(it.bookingUrl);
  $('dBox').innerHTML = `<div class="sheethead">${art(it.outbound.to, countryEn(it), 230).replace('<svg ', '<svg class="bg" ')}<div class="shade"></div><span class="grab"></span>
      <button type="button" class="xbtn" data-close aria-label="Fechar">${icon('x')}</button>
      <div class="place"><div><h3 id="dTitle">${esc(cityOf(it))}</h3><span>${esc(countryOf(it))}${countryOf(it) ? ' · ' : ''}${n} noite${n > 1 ? 's' : ''} · ${esc(deO(it.outbound.from))} · ${esc(paxLabel(P))}</span></div>
      <div class="pill"><b>${eur0(total)}</b><small>voo ida e volta${P.payers > 1 ? ` · ${eur0(it.price)}/pessoa` : ''}</small></div></div></div>
    <div class="tabs" role="tablist"><button type="button" role="tab" data-tab="flight" aria-selected="true">${icon('plane')}Voo</button><button type="button" role="tab" data-tab="stay" aria-selected="false">${icon('bed')}Estadia</button><button type="button" role="tab" data-tab="todo" aria-selected="false">${icon('ticket')}O que fazer</button></div>
    <div class="sheetbody" id="dBody"></div>
    <div class="actionbar">
      <button type="button" class="btn ${saved ? 'on' : ''}" data-sact="save" aria-label="Guardar na lista" aria-pressed="${saved}">${icon('heart')}</button>
      <button type="button" class="btn" data-sact="share" aria-label="Partilhar">${icon('share')}</button>
      <a class="btn primary" href="${esc(it.bookingUrl)}" target="_blank" rel="noopener">${icon('plane')}Reservar voo · ${eur0(it.price)}${P.payers > 1 ? '/pessoa' : ''}</a>
    </div>`;
  openSheet('detail');
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
    lm: `https://www.lastminute.ie/msr/route/searching.do?departureAirport=${o}&arrivalAirport=${d}&outboundDay=${b2(a)}&outboundMonthYear=${my(a)}&returnDay=${b2(b)}&returnMonthYear=${my(b)}&adults=${P.adults}&childs=${P.children}&infants=${P.infants}&currency=EUR&url=search3.do&roundtrip=true`,
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
  const rows = [{name: 'Kiwi.com', p: it.price, url: it.bookingUrl}];
  if (c.lm) rows.push({name: 'lastminute.com', p: c.lm.p, url: L.lm, other: c.lm.out !== oh || c.lm.in !== ih ? c.lm : null});
  if (c.ed) rows.push({name: 'eDreams', p: c.ed.p, prime: c.ed.prime, url: L.ed, other: c.ed.out !== oh || c.ed.in !== ih ? c.ed : null});
  const min = Math.min(...rows.map(r => r.p));
  rows.forEach(r => r.top = rows.length > 1 && r.p === min);
  const priced = rows.map(r => `<div class="crow ${r.top ? 'top' : ''}"><span>${esc(r.name)}${r.top ? '<em>mais barato</em>' : ''}</span><span class="cp">${eur(r.p)}${r.prime ? `<small>${eur0(r.prime)} para membros Prime pagos</small>` : ''}${r.other ? `<small>voos das ${esc(r.other.out)} e ${esc(r.other.in)}</small>` : ''}${P.payers > 1 ? `<small>por pessoa · ≈ ${eur0(r.p * P.payers)} total</small>` : ''}</span><a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">Abrir</a></div>`).join('');
  const links = [!c.lm && ['lastminute.com', L.lm], !c.ed && ['eDreams', L.ed]].filter(Boolean)
    .map(([n, u]) => `<div class="crow"><span>${esc(n)}</span><span class="muted">abre com estas datas</span><a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">Abrir</a></div>`).join('')
    + `<span class="note">Ver também no <a href="${esc(L.sky)}" target="_blank" rel="noopener">Skyscanner</a> ou no <a href="${esc(L.gfl)}" target="_blank" rel="noopener">Google Voos</a>.</span>`;
  const seen = rows.length > 1 && DATA ? ` Preços vistos hoje às ${pad2(new Date(DATA.updated).getHours())}:${pad2(new Date(DATA.updated).getMinutes())}.` : '';
  return `<span class="note">Mesmas datas, por pessoa, só com mochila.${seen} Os outros sites abrem já com os aeroportos, as datas e ${paxLabel(P)}.</span>${priced}${links}
    <span class="note">O eDreams e o lastminute.com mostram o preço sem malas; acrescenta-as lá. Confirma horários e malas antes de pagar.</span>`;
}
function renderTab(){
  const body = $('dBody'); if (!SH || !body) return;
  const it = SH.it, P = SH.P, L = links(it, P), n = nightsOf(it);
  if (sheetTab === 'flight'){
    body.innerHTML = `<div class="sec"><h4>${icon('plane')}Horários</h4>${legBlock('Ida', it.outbound)}${legBlock('Volta', it.inbound)}
        <div class="facts">${isDirect(it) ? '<span class="fact ok">Direto</span>' : ''}<span class="fact dim">Só mochila pequena incluída</span></div></div>
      <div class="sec"><h4>${icon('swap')}Comparar com outros sites</h4>
        ${compareHtml(it, P, L)}</div>`;
  } else if (sheetTab === 'stay'){
    body.innerHTML = `<div class="sec"><h4>${icon('bed')}Alojamento</h4>
        <span class="note">${n} noite${n > 1 ? 's' : ''} · ${fmtShort(it.outbound.departureTime)} a ${fmtShort(it.inbound.departureTime)} · ${paxLabel(P)}, ${P.rooms} quarto${P.rooms > 1 ? 's' : ''}. Os sites abrem já com estas datas.</span>
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
  const n = nightsOf(it), text = `${cityOf(it)} ${deO(it.outbound.from)}, ${fmtShort(it.outbound.departureTime)} a ${fmtShort(it.inbound.departureTime)} (${n} noites): ${eur0(it.price)} por pessoa, ida e volta.`;
  try {
    if (navigator.share){ await navigator.share({title: 'Voa Daqui', text, url: it.bookingUrl}); return; }
    await navigator.clipboard.writeText(`${text}\n${it.bookingUrl}`); toast('Copiado. Cola numa mensagem para partilhar.');
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
    list.unshift({city: cityOf(it), country: countryOf(it), countryEn: countryEn(it), code: it.outbound.to, from: it.outbound.from, price: it.price, pax: P.total, payers: P.payers,
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
  $('listN').hidden = !list.length; $('listN').textContent = list.length || '';
  if (!list.length){ $('list').innerHTML = `<div class="empty"><b>A lista está vazia</b><span>Toca no coração dos destinos de que gostares. Depois partilha a lista com quem vai contigo.</span><button type="button" class="btn" data-goview="search">${icon('search')}Explorar destinos</button></div>`; return; }
  const live = new Set(ALL.map(it => it.bookingUrl));
  $('list').innerHTML = `<div><button type="button" class="btn" id="shareList">${icon('share')}Partilhar a lista</button></div>` + list.map((x, k) => `<div class="item"><div class="thumb">${art(x.code || x.city, x.countryEn || '', 200)}</div><div class="ib">
      <div class="top"><div><div class="t">${esc(x.city)}${x.country ? ` <span class="muted" style="font-weight:500">· ${esc(x.country)}</span>` : ''}</div><div class="s">${esc(x.dates)} · ${esc(deO(x.from))}${DATA && !live.has(x.url) ? ' · já não está entre os mais baratos de hoje' : ''}</div></div>
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
  if (!DATA || folded){ box.hidden = true; if (!folded) $('hero').hidden = false; return; }
  const c = DATA.deal;
  const minis = (DATA.others || []).map((o, k) => `<button type="button" class="mini" data-deal="o${k}"><b>${eur0(o.item.price)}</b> ${esc(dealTitle(o))}<em>−${Math.round(o.off * 100)}%</em></button>`).join('');
  box.hidden = false; $('hero').hidden = !!c;
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
      <div class="was"><s>normal ${c.base} €</s><b>${eur0(c.item.price)}</b><small>ida e volta, por pessoa</small></div></div></div>
    <div class="dbody">
      <div class="why">${c.lb ? 'Pelo menos ' : ''}<b>${Math.round(c.off * 100)}% abaixo</b> do preço habitual para ${esc(cityOf(it))} ${esc(deO(c.item.o))}, comparando com os últimos ${c.hist.length} dias. Voo ${isDirect(it) ? 'direto' : 'com escala'}, ${esc(airlinesOf(it))}.</div>
      ${dealChart(c)}
      <div class="dpax"><span class="lbl">Quantos vão?</span>
        <span class="stp"><button type="button" data-dpax="a-" aria-label="Menos um adulto"${pax.adults <= 1 ? ' disabled' : ''}>−</button><b>${pax.adults}</b> adulto${pax.adults > 1 ? 's' : ''}<button type="button" data-dpax="a+" aria-label="Mais um adulto"${pax.adults >= 9 ? ' disabled' : ''}>+</button></span>
        <span class="stp"><button type="button" data-dpax="k-" aria-label="Menos uma criança"${!pax.kids.length ? ' disabled' : ''}>−</button><b>${pax.kids.length}</b> criança${pax.kids.length === 1 ? '' : 's'}<button type="button" data-dpax="k+" aria-label="Mais uma criança"${pax.kids.length >= 8 ? ' disabled' : ''}>+</button></span>
      </div>
      ${P.total > 1 ? `<div class="gres warn">Para ${paxLabel(P)}: cerca de <b>${eur0(groupPrice(it, P))} no total</b>. Os lugares a ${eur0(c.item.price)} costumam ser poucos: confirma no Kiwi se há para todos.</div>` : ''}
      ${minis ? `<div><div class="lbl" style="margin-bottom:6px">Outras descidas fortes · por pessoa</div><div class="minis">${minis}</div></div>` : ''}
      <div class="dfoot"><span class="note">Estas ofertas costumam desaparecer em poucas horas.</span><span class="btns"><button type="button" class="btn sm primary" data-deal="best">Ver viagem</button></span></div>
    </div>`;
}
function paxChanged(){ if (DATA && DATA.deal && !$('dealBox').hidden) renderDeal(); }
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

// ---------- global clicks ----------
document.addEventListener('click', e => {
  const sortB = e.target.closest('[data-sort] button');
  if (sortB){ sortBy = sortB.dataset.v; renderResults(); return; }
  const b = e.target.closest('[data-act="save"]');
  if (b){ const it = current[+b.dataset.i]; if (it) saveIt(it, ctx.P, b); return; }
  const o = e.target.closest('[data-open]'); if (o && !openSheetEl) openTrip(+o.dataset.open);
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.art[data-open]')){ e.preventDefault(); openTrip(+e.target.dataset.open); } });

// ---------- start ----------
drawList();
$('go').disabled = true; $('goTxt').textContent = 'A carregar os preços…';
fetch('data/data.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
  DATA = j; ALL = j.items.map(toIt);
  $('go').disabled = false; $('goTxt').textContent = 'Procurar';
  const u = new Date(j.updated);
  $('foot').textContent = `Preços do Kiwi.com por pessoa, ida e volta, só com mochila pequena, vistos ${new Date().toDateString() === u.toDateString() ? 'hoje' : `a ${fmtDay(u)}`} às ${pad2(u.getHours())}:${pad2(u.getMinutes())}. Atualizados todas as manhãs. Mudam a toda a hora: confirma sempre o preço final antes de pagar. As imagens são ilustrações.`;
  renderDeal(); drawList();
}).catch(() => { $('goTxt').textContent = 'Não foi possível carregar os preços'; showErr('Não foi possível carregar os voos. Tenta recarregar a página daqui a pouco.'); });
