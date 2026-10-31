#!/usr/bin/env python3
"""Gera og.png (1200x630), a imagem que aparece quando se partilha o site.
Mostra a Pechincha do dia ou, se não houver, os 3 voos mais baratos.
Uso: python3 og.py   (precisa do Playwright com Chromium)"""
import json, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
D = json.loads((ROOT / 'data/data.json').read_text())
ORIGIN = {'LIS': 'Lisboa', 'OPO': 'Porto', 'FAO': 'Faro'}
CITY = {'Seville': 'Sevilha', 'Marseille': 'Marselha', 'Turin': 'Turim', 'Toulouse': 'Toulouse', 'Valencia': 'Valência',
        'Barcelona': 'Barcelona', 'Madrid': 'Madrid', 'London': 'Londres', 'Milan': 'Milão', 'Rome': 'Roma', 'Malaga': 'Málaga',
        'Tangier': 'Tânger', 'Marrakesh': 'Marraquexe', 'Funchal': 'Funchal', 'Paris': 'Paris', 'Dublin': 'Dublin',
        'Brussels': 'Bruxelas', 'Granada': 'Granada', 'Bilbao': 'Bilbau', 'Alicante': 'Alicante', 'Nantes': 'Nantes',
        'Bordeaux': 'Bordéus', 'Manchester': 'Manchester', 'Liverpool': 'Liverpool', 'Bristol': 'Bristol', 'Cork': 'Cork',
        'Valletta': 'La Valeta', 'Birmingham': 'Birmingham', 'Newcastle upon Tyne': 'Newcastle', 'Shannon': 'Shannon'}
e = html.escape
city = lambda it: CITY.get(it['city'].split(',')[0], it['city'].split(',')[0])
best = lambda it: it.get('best', it['price'])
day = lambda s: f"{int(s[8:10])}/{int(s[5:7])}"

if D.get('deal'):
    c = D['deal']; it = c['item']
    body = f"""<div class="tag">Pechincha do dia · −{round(c['off']*100)}%</div>
      <div class="big">{e(ORIGIN[it['o']])} → {e(city(it))}</div>
      <div class="row"><span class="price">{round(best(it))} €</span><span class="was">normal {c['base']} €</span></div>
      <div class="sub">ida e volta · {day(it['out']['dep'])} a {day(it['in']['dep'])}</div>"""
else:
    seen, top = set(), []
    for it in sorted(D['items'], key=best):
        if city(it) in seen: continue
        seen.add(city(it)); top.append(it)
        if len(top) == 3: break
    rows = ''.join(f"<li><b>{e(city(it))}</b><span>{'do Porto' if it['o']=='OPO' else 'de '+ORIGIN[it['o']]}</span><em>{round(best(it))} €</em></li>" for it in top)
    body = f"""<div class="tag">Voos mais baratos de hoje</div><ul>{rows}</ul>"""

PAGE = f"""<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}
body{{width:1200px;height:630px;background:#0e1525;color:#fff;font-family:'Bricolage Grotesque','DejaVu Sans',sans-serif;
  display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px;position:relative;overflow:hidden}}
body:before{{content:'';position:absolute;right:-220px;top:-260px;width:520px;height:520px;border-radius:50%;background:#ffbe2e}}
body:after{{content:'';position:absolute;right:-90px;bottom:-90px;width:260px;height:260px;border-radius:50%;background:#2257d6;opacity:.9}}
.brand{{font-size:44px;font-weight:800;position:relative;z-index:1}} .brand i{{font-style:normal;color:#ffbe2e}}
main{{position:relative;z-index:1;max-width:760px}}
.tag{{display:inline-block;background:#ffbe2e;color:#1b1404;font-weight:800;font-size:30px;padding:8px 20px;border-radius:999px;margin-bottom:22px}}
.big{{font-size:78px;font-weight:800;line-height:1.02;letter-spacing:-1px}}
.row{{display:flex;align-items:baseline;gap:28px;margin-top:14px}}
.price{{font-size:120px;font-weight:800;color:#ffbe2e;line-height:1}} .was{{font-size:40px;color:#9aa6c2;text-decoration:line-through}}
.sub{{font-size:34px;color:#c9d1e4;margin-top:8px}}
ul{{list-style:none;padding:0;display:flex;flex-direction:column;gap:14px}}
li{{display:flex;align-items:baseline;gap:20px;font-size:58px;font-weight:800}} li span{{font-size:30px;color:#9aa6c2;font-weight:600}}
li em{{font-style:normal;color:#ffbe2e;margin-left:auto}}
.foot{{position:relative;z-index:1;font-size:28px;color:#c9d1e4}}
</style></head><body><div class="brand">Voa <i>Daqui</i></div><main>{body}</main>
<div class="foot">Voos baratos de Lisboa, Porto e Faro · atualizados de hora a hora</div></body></html>"""

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(PAGE); pg.screenshot(path=str(ROOT / 'og.png')); b.close()
print('og.png gerado')
