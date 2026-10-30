const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const eur0 = v => Math.round(v) + ' €';
const pad = n => String(n).padStart(2, '0');
const WD = ['dom','seg','ter','qua','qui','sex','sáb'], MO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ORIGIN = {LIS:'Lisboa', OPO:'Porto', FAO:'Faro'};
const deO = c => c === 'OPO' ? 'do Porto' : 'de ' + (ORIGIN[c] || c);
const COUNTRY = {Spain:'Espanha',France:'França',Italy:'Itália','United Kingdom':'Reino Unido',Germany:'Alemanha',Portugal:'Portugal',Ireland:'Irlanda',Netherlands:'Países Baixos',Belgium:'Bélgica',Switzerland:'Suíça',Austria:'Áustria',Poland:'Polónia','Czech Republic':'Chéquia',Czechia:'Chéquia',Hungary:'Hungria',Greece:'Grécia',Malta:'Malta',Morocco:'Marrocos',Tunisia:'Tunísia',Egypt:'Egito',Turkey:'Turquia','Türkiye':'Turquia',Denmark:'Dinamarca',Sweden:'Suécia',Norway:'Noruega',Finland:'Finlândia',Iceland:'Islândia',Croatia:'Croácia',Romania:'Roménia',Bulgaria:'Bulgária',Luxembourg:'Luxemburgo',Brazil:'Brasil','United States':'Estados Unidos',Canada:'Canadá',Mexico:'México','Cape Verde':'Cabo Verde','Cabo Verde':'Cabo Verde',Senegal:'Senegal',Angola:'Angola',Mozambique:'Moçambique','South Africa':'África do Sul',Japan:'Japão',China:'China',India:'Índia',Thailand:'Tailândia','United Arab Emirates':'Emirados Árabes Unidos',Qatar:'Catar',Argentina:'Argentina',Chile:'Chile',Colombia:'Colômbia',Peru:'Peru',Cyprus:'Chipre',Slovakia:'Eslováquia',Slovenia:'Eslovénia',Albania:'Albânia',Serbia:'Sérvia',Estonia:'Estónia',Latvia:'Letónia',Lithuania:'Lituânia',Algeria:'Argélia','Unknown Region':''};
const CITY = {Lisbon:'Lisboa',Seville:'Sevilha',Marrakesh:'Marraquexe',London:'Londres',Rome:'Roma',Milan:'Milão',Naples:'Nápoles',Venice:'Veneza',Florence:'Florença',Turin:'Turim',Bologna:'Bolonha',Geneva:'Genebra',Brussels:'Bruxelas',Berlin:'Berlim',Munich:'Munique',Hamburg:'Hamburgo',Cologne:'Colónia',Vienna:'Viena',Prague:'Praga',Warsaw:'Varsóvia',Krakow:'Cracóvia','Kraków':'Cracóvia',Copenhagen:'Copenhaga',Stockholm:'Estocolmo',Edinburgh:'Edimburgo',Athens:'Atenas',Istanbul:'Istambul',Valencia:'Valência','Palma, Majorca':'Palma de Maiorca','Palma de Mallorca':'Palma de Maiorca','Gran Canaria':'Gran Canária','Las Palmas':'Las Palmas',Marseille:'Marselha',Strasbourg:'Estrasburgo',Basel:'Basileia',Zurich:'Zurique',Luxembourg:'Luxemburgo',Fes:'Fez',Tangier:'Tânger','New York':'Nova Iorque','Mexico City':'Cidade do México',Bangkok:'Banguecoque',Tokyo:'Tóquio',Beijing:'Pequim',Algiers:'Argel',Tunis:'Tunes',Reykjavik:'Reiquiavique',Salzburg:'Salzburgo',Crete:'Creta',Rhodes:'Rodes',Catania:'Catânia',Düsseldorf:'Düsseldorf'};
const pt = c => CITY[c] || c;
const TYPES = {
  beach: 'AGP,ALC,PMI,IBZ,TFS,LPA,ACE,FUE,FNC,PXO,SID,BVC,AGA,MLA,HER,RHO,CFU,DJE,NAP,CTA',
  cities: 'BCN,MAD,PAR,LON,ROM,MIL,AMS,BER,PRG,VIE,BUD,BRU,DUB,CPH,SVQ,VLC,FLR,ATH,IST,EDI',
  nature: 'PDL,TER,FNC,KEF,GVA,INN,SZG,RAK,TFS,BIO,OPO,INV,LJU,TRN',
  winter: 'TFS,LPA,ACE,FUE,FNC,PXO,RAK,AGA,SID,BVC,RAI,HRG,SSH,DXB,MLA'
};
const TYPE_NAME = {anywhere:'Qualquer lugar', beach:'Praia', cities:'Cidades', nature:'Natureza', winter:'Sol no inverno', Europe:'Europa', Africa:'África', 'North America':'América do Norte', 'South America':'América do Sul', Asia:'Ásia'};

// ---------- illustrated postcards ----------
const ISLAND = new Set('FNC PXO PDL TER HOR SID BVC RAI VXE TFS TFN LPA ACE FUE PMI IBZ MAH MLA HER RHO CFU CTA PMO JTR'.split(' '));
const BEACH = new Set('AGP ALC FAO AGA DJE HRG SSH CUN MIA NCE BRI NAP ESU'.split(' '));
const SNOW = new Set('KEF INN SZG GVA ZRH TRN LJU BSL OSL INV'.split(' '));
const DESERT_C = new Set(['Morocco','Egypt','Tunisia','Algeria','United Arab Emirates','Qatar','Jordan']);
function hash(s){ let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kindOf(code, country){ if (DESERT_C.has(country)) return 'desert'; if (ISLAND.has(code)) return 'island'; if (BEACH.has(code)) return 'beach'; if (SNOW.has(code)) return 'snow'; return 'city'; }
let artN = 0;
function art(code, country, H = 200){
  const W = 400, k = kindOf(code, country), R = rng(hash(code + 'v2')), id = 'a' + (++artN);
  const DUSK = [205, 218, 232, 248, 262, 278, 300, 322, 340, 350];
  const warm = k === 'desert' || k === 'beach' || k === 'island';
  const h1 = warm ? 195 + Math.floor(R() * 45) : DUSK[Math.floor(R() * DUSK.length)], sky1 = `hsl(${h1},55%,16%)`, sky2 = `hsl(${(h1 + 25) % 360},60%,38%)`, sky3 = `hsl(${10 + R() * 30},${warm ? 85 : 75}%,${warm ? 66 : 62}%)`;
  const sx = 60 + R() * 280, sy = H * (0.38 + R() * 0.16);
  let g = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset=".55" stop-color="${sky2}"/><stop offset="1" stop-color="${sky3}"/></linearGradient><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(195,55%,38%)"/><stop offset="1" stop-color="hsl(205,60%,16%)"/></linearGradient><radialGradient id="${id}g"><stop offset="0" stop-color="hsl(45,100%,85%)" stop-opacity=".9"/><stop offset="1" stop-color="hsl(45,100%,85%)" stop-opacity="0"/></radialGradient></defs>`;
  g += `<rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
  for (let s = 0; s < 14; s++) g += `<circle cx="${(R() * W).toFixed(1)}" cy="${(R() * H * 0.35).toFixed(1)}" r="${(R() * 1.1 + .3).toFixed(2)}" fill="#fff" opacity="${(R() * .5 + .2).toFixed(2)}"/>`;
  g += `<circle cx="${sx}" cy="${sy}" r="70" fill="url(#${id}g)"/><circle cx="${sx}" cy="${sy}" r="${20 + R() * 10}" fill="hsl(${40 + R() * 15},95%,78%)"/>`;
  const ridge = (base, amp, step, col, op = 1) => { let d = `M0 ${H} L0 ${base}`; for (let x = 0; x <= W + step; x += step) d += ` L${x} ${(base - R() * amp).toFixed(1)}`; return `<path d="${d} L${W} ${H} Z" fill="${col}" opacity="${op}"/>`; };
  const sea = y => { let w = `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="url(#${id}w)"/><rect x="${sx - 40}" y="${y}" width="80" height="${H - y}" fill="hsl(45,100%,80%)" opacity=".12"/>`; for (let r = 0; r < 5; r++){ const yy = y + 6 + r * ((H - y) / 5); let d = `M0 ${yy.toFixed(1)}`; for (let x = 0; x <= W; x += 20) d += ` Q${x + 10} ${(yy - 2.5).toFixed(1)} ${x + 20} ${yy.toFixed(1)}`; w += `<path d="${d}" stroke="#fff" stroke-opacity="${.08 + r * .03}" fill="none"/>`; } return w; };
  const palm = (x, base, s) => { let p = `<path d="M${x} ${base} Q${x + 6 * s} ${base - 30 * s} ${x + 3 * s} ${base - 58 * s}" stroke="hsl(220,40%,8%)" stroke-width="${3.2 * s}" fill="none" stroke-linecap="round"/>`; const tx = x + 3 * s, ty = base - 58 * s; for (const [dx, dy] of [[-26,6],[-20,-8],[0,-14],[22,-7],[28,6],[12,12],[-12,12]]) p += `<path d="M${tx} ${ty} Q${tx + dx * s * .5} ${ty + dy * s * .5 - 8 * s} ${tx + dx * s} ${ty + dy * s}" stroke="hsl(220,40%,8%)" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`; return p; };
  if (k === 'beach'){
    g += sea(H * 0.66);
    g += `<path d="M0 ${H} L0 ${H * 0.84} Q${W * 0.35} ${H * 0.76} ${W * 0.62} ${H * 0.86} T${W} ${H * 0.8} L${W} ${H} Z" fill="hsl(36,55%,62%)"/>`;
    g += palm(W * (0.12 + R() * 0.1), H * 0.86, 1.1) + palm(W * (0.78 + R() * 0.1), H * 0.84, 0.85);
  } else if (k === 'island'){
    g += sea(H * 0.7);
    const cx = W * (0.3 + R() * 0.4), w = W * (0.35 + R() * 0.2);
    g += `<path d="M${cx - w / 2} ${H * 0.71} Q${cx - w / 4} ${H * 0.36} ${cx} ${H * 0.34} Q${cx + w / 4} ${H * 0.4} ${cx + w / 2} ${H * 0.71} Z" fill="hsl(${150 + R() * 30},35%,18%)"/>`;
    g += `<path d="M${cx - w / 3} ${H * 0.71} Q${cx} ${H * 0.5} ${cx + w / 3} ${H * 0.71} Z" fill="hsl(${150 + R() * 30},35%,24%)"/>`;
    g += palm(W * 0.88, H * 0.9, 0.9);
  } else if (k === 'desert'){
    g += ridge(H * 0.62, 18, 40, 'hsl(28,55%,46%)');
    const ax = W * (0.55 + R() * 0.25), ab = H * 0.74, aw = 46;
    g += `<g fill="hsl(18,45%,14%)"><rect x="${ax - aw}" y="${ab - 52}" width="${aw * 2}" height="52"/><path d="M${ax - 26} ${ab - 52} a26 26 0 0 1 52 0 Z"/><rect x="${ax + aw - 12}" y="${ab - 92}" width="14" height="92"/><rect x="${ax + aw - 15}" y="${ab - 96}" width="20" height="6"/></g><path d="M${ax - 12} ${ab} v-26 a12 12 0 0 1 24 0 v26 Z" fill="hsl(36,90%,62%)" opacity=".85"/>`;
    g += `<path d="M0 ${H} L0 ${H * 0.8} Q${W * 0.3} ${H * 0.68} ${W * 0.55} ${H * 0.82} T${W} ${H * 0.76} L${W} ${H} Z" fill="hsl(30,60%,36%)"/>`;
    g += `<path d="M0 ${H} L0 ${H * 0.9} Q${W * 0.4} ${H * 0.8} ${W} ${H * 0.92} L${W} ${H} Z" fill="hsl(24,55%,24%)"/>` + palm(W * 0.14, H * 0.92, 0.9);
  } else if (k === 'snow'){
    const peaks = (base, n, col, snow) => { let d = `M0 ${H} L0 ${base}`, caps = ''; const step = W / n; for (let p = 0; p < n; p++){ const x0 = p * step, xm = x0 + step / 2, top = base - (40 + R() * 70); d += ` L${xm} ${top} L${x0 + step} ${base}`; if (snow) caps += `<path d="M${xm - 14} ${top + 18} L${xm} ${top} L${xm + 14} ${top + 18} L${xm + 5} ${top + 14} L${xm - 4} ${top + 20} Z" fill="#f4f7ff" opacity=".9"/>`; } return `<path d="${d} L${W} ${H} Z" fill="${col}"/>` + caps; };
    g += peaks(H * 0.66, 4, `hsl(${h1},30%,30%)`, true) + peaks(H * 0.8, 5, `hsl(${h1},30%,18%)`, false);
    g += `<rect x="0" y="${H * 0.9}" width="${W}" height="${H * 0.1}" fill="hsl(${h1},35%,10%)"/>`;
  } else {
    g += ridge(H * 0.74, 12, 50, `hsl(${h1},35%,26%)`, .6);
    const bld = (base, minH, maxH, col, win) => { let s = '', x = -5; while (x < W){ const w = 14 + R() * 26, h = minH + R() * (maxH - minH); s += `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`; if (win) for (let wy = base - h + 6; wy < base - 6; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (R() < .22) s += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2.6" height="3.4" fill="hsl(45,100%,75%)" opacity=".75"/>`; x += w + 1; } return s; };
    g += bld(H * 0.86, 20, 60, `hsl(${h1},30%,20%)`, false);
    const lx = W * (0.25 + R() * 0.5), lk = Math.floor(R() * 3), base = H * 0.9, dark = `hsl(${h1},40%,9%)`;
    if (lk === 0) g += `<g fill="${dark}"><rect x="${lx - 30}" y="${base - 48}" width="60" height="48"/><path d="M${lx - 28} ${base - 48} a28 28 0 0 1 56 0 Z"/><rect x="${lx - 2}" y="${base - 90}" width="4" height="16"/></g>`;
    else if (lk === 1) g += `<g fill="${dark}"><path d="M${lx - 16} ${base} L${lx - 5} ${base - 110} L${lx} ${base - 128} L${lx + 5} ${base - 110} L${lx + 16} ${base} Z"/></g>`;
    else g += `<g fill="${dark}"><rect x="${lx - 34}" y="${base - 40}" width="68" height="40"/><path d="M${lx - 38} ${base - 40} L${lx} ${base - 62} L${lx + 38} ${base - 40} Z"/><rect x="${lx + 24}" y="${base - 82}" width="10" height="42"/></g>`;
    g += bld(H * 0.95, 14, 46, dark, true);
    g += `<rect x="0" y="${H * 0.94}" width="${W}" height="${H * 0.06}" fill="${dark}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}
