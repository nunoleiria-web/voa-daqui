// local football clubs → official websites (calendar + tickets)
const CLUBS = {
  'seville':[['Sevilla FC','sevillafc.es'],['Real Betis','realbetisbalompie.es']],
  'madrid':[['Real Madrid','realmadrid.com'],['Atlético de Madrid','atleticodemadrid.com'],['Rayo Vallecano','rayovallecano.es'],['Getafe CF','getafecf.com']],
  'barcelona':[['FC Barcelona','fcbarcelona.com'],['RCD Espanyol','rcdespanyol.com']],
  'valencia':[['Valencia CF','valenciacf.com'],['Levante UD','levanteud.com']],
  'malaga':[['Málaga CF','malagacf.com']], 'bilbao':[['Athletic Club','athletic-club.eus']], 'san sebastian':[['Real Sociedad','realsociedad.eus']],
  'vigo':[['RC Celta','rccelta.es']], 'a coruna':[['RC Deportivo','rcdeportivo.es']],
  'palma':[['RCD Mallorca','rcdmallorca.es']], 'las palmas':[['UD Las Palmas','udlaspalmas.es']], 'gran canaria':[['UD Las Palmas','udlaspalmas.es']],
  'granada':[['Granada CF','granadacf.es']], 'santander':[['Racing de Santander','realracingclub.es']], 'pamplona':[['CA Osasuna','osasuna.es']],
  'vitoria':[['Deportivo Alavés','deportivoalaves.com']], 'girona':[['Girona FC','gironafc.cat']],
  'london':[['Arsenal','arsenal.com'],['Chelsea','chelseafc.com'],['Tottenham Hotspur','tottenhamhotspur.com'],['West Ham United','whufc.com'],['Fulham','fulhamfc.com'],['Crystal Palace','cpfc.co.uk'],['Brentford','brentfordfc.com']],
  'manchester':[['Manchester United','manutd.com'],['Manchester City','mancity.com']], 'liverpool':[['Liverpool FC','liverpoolfc.com'],['Everton','evertonfc.com']],
  'birmingham':[['Aston Villa','avfc.co.uk']], 'newcastle':[['Newcastle United','nufc.co.uk']],
  'glasgow':[['Celtic','celticfc.com'],['Rangers','rangers.co.uk']], 'edinburgh':[['Hearts','heartsfc.co.uk'],['Hibernian','hibernianfc.co.uk']],
  'milan':[['AC Milan','acmilan.com'],['Inter','inter.it']], 'rome':[['AS Roma','asroma.com'],['SS Lazio','sslazio.it']],
  'turin':[['Juventus','juventus.com'],['Torino','torinofc.it']], 'naples':[['SSC Napoli','sscnapoli.it']],
  'bologna':[['Bologna FC','bolognafc.it']], 'florence':[['ACF Fiorentina','acffiorentina.com']],
  'paris':[['Paris Saint-Germain','psg.fr']], 'marseille':[['Olympique de Marseille','om.fr']], 'lyon':[['Olympique Lyonnais','ol.fr']],
  'nice':[['OGC Nice','ogcnice.com']], 'toulouse':[['Toulouse FC','toulousefc.com']], 'lille':[['LOSC Lille','losc.fr']],
  'munich':[['FC Bayern','fcbayern.com']], 'dortmund':[['Borussia Dortmund','bvb.de']], 'berlin':[['Union Berlin','fc-union-berlin.de']],
  'hamburg':[['Hamburger SV','hsv.de'],['FC St. Pauli','fcstpauli.com']], 'cologne':[['1. FC Köln','fc.de']], 'frankfurt':[['Eintracht Frankfurt','eintracht.de']],
  'amsterdam':[['Ajax','ajax.nl']], 'eindhoven':[['PSV','psv.nl']], 'rotterdam':[['Feyenoord','feyenoord.nl']],
  'lisbon':[['SL Benfica','slbenfica.pt'],['Sporting CP','sporting.pt']], 'porto':[['FC Porto','fcporto.pt']],
  'brussels':[['RSC Anderlecht','rsca.be']], 'dublin':[['Shamrock Rovers','shamrockrovers.ie']],
  'istanbul':[['Galatasaray','galatasaray.org'],['Fenerbahçe','fenerbahce.org'],['Beşiktaş','bjk.com.tr']],
  'athens':[['Panathinaikos','pao.gr'],['Olympiacos','olympiacos.org']],
  'prague':[['Sparta Praga','sparta.cz'],['Slavia Praga','slavia.cz']], 'vienna':[['Rapid Viena','skrapid.at']],
  'copenhagen':[['FC Copenhaga','fck.dk']], 'warsaw':[['Legia Varsóvia','legia.com']], 'budapest':[['Ferencváros','fradi.hu']]
};
const cityKey = s => String(s || '').split(',')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^palma de mallorca$/, 'palma').trim();
function footballHtml(it, d1, d2){
  const seg = lastSeg(it), clubs = CLUBS[cityKey(seg.toCity)] || CLUBS[cityKey(seg.toName)] || null;
  const q = encodeURIComponent(`jogos de futebol ${cityOf(it)} ${fmtDay(d1)} a ${fmtDay(d2)} ${d1.getFullYear()} bilhetes oficiais`);
  const tip = 'As datas e horas finais costumam ser confirmadas 3 a 6 semanas antes. Compra só no site oficial.';
  if (!clubs) return `<div class="hrow"><div><b>Jogos de futebol</b><span>Não tenho os clubes desta cidade na lista. Procura os jogos em casa nestas datas. ${tip}</span></div><div class="hp"><a class="hbook" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Procurar</a></div></div>`;
  return `<span class="lbl" style="margin-top:6px">Futebol em ${esc(cityOf(it))} · ${fmtDay(d1)} a ${fmtDay(d2)}</span><span class="muted">Abre o calendário no site oficial de cada clube para veres se joga em casa nestes dias e comprares bilhetes. ${tip}</span>`
    + clubs.map(([n, d]) => `<div class="hrow"><div><b>${esc(n)}</b><span>site oficial · ${esc(d)}</span></div><div class="hp"><a class="hbook" href="https://www.${esc(d)}" target="_blank" rel="noopener">Calendário e bilhetes</a></div></div>`).join('');
}
