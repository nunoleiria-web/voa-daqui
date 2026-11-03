#!/usr/bin/env python3
"""Brasil: os voos mais baratos de Lisboa, Porto e Faro para os destinos do Brasil.

Corre uma vez por dia no GitHub Actions (.github/workflows/tp-brasil.yml), com a API de dados
da Travelpayouts (token no segredo TP_TOKEN, nunca escrito). Gera data/brasil.json.
São preços vistos por outros viajantes nos últimos dias: o site diz isso e manda confirmar.
"""
import json, os, sys, time, datetime as dt, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'brasil.json'
API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
FROM = ['LIS', 'OPO', 'FAO']
TO = ['SAO', 'RIO', 'SSA', 'REC', 'FOR', 'NAT', 'BSB', 'BHZ', 'POA', 'CWB', 'MCZ', 'BEL', 'MAO', 'FLN', 'VIX', 'SLZ', 'JPA', 'AJU', 'THE', 'GYN']
MONTHS = 12
NIGHTS = (7, 35)
KEEP = 8  # por origem e destino; o site mostra os 5 mais baratos


def get(token, **p):
    p.update(currency='eur', limit=200, sorting='price', unique='false', one_way='false')
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(p), headers={'X-Access-Token': token, 'Accept-Encoding': 'identity'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                j = json.load(r)
            return (j.get('data') or []) if j.get('success') else []
        except Exception as e:
            print('aviso:', p.get('origin'), p.get('destination'), p.get('departure_at'), str(e)[:100])
            time.sleep(3 * (attempt + 1))
    return []


def main():
    token = os.environ.get('TP_TOKEN') or sys.exit('falta TP_TOKEN')
    try:
        import zoneinfo
        now = dt.datetime.now(zoneinfo.ZoneInfo('Europe/Lisbon'))
    except Exception:
        now = dt.datetime.now(dt.timezone.utc)
    lo = now.date() + dt.timedelta(days=7)
    hi = now.date() + dt.timedelta(days=MONTHS * 30)
    months = sorted({(lo + dt.timedelta(days=k)).strftime('%Y-%m') for k in range(0, MONTHS * 30, 7)})
    nowz = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')
    rows, total = [], 0
    for o in FROM:
        for d in TO:
            for m in months:
                for x in get(token, origin=o, destination=d, departure_at=m):
                    total += 1
                    try:
                        a, b = dt.date.fromisoformat(x['departure_at'][:10]), dt.date.fromisoformat(x['return_at'][:10])
                    except Exception:
                        continue
                    n = (b - a).days
                    if not (lo <= a <= hi) or not (NIGHTS[0] <= n <= NIGHTS[1]):
                        continue
                    if x.get('expires_at') and x['expires_at'][:19] < nowz:
                        continue
                    rows.append({'o': o, 'to': d, 'p': round(float(x['price'])), 'dep': x['departure_at'][:16], 'ret': x['return_at'][:16], 'n': n,
                                 'al': x.get('airline') or '', 'st': (x.get('transfers') or 0) + (x.get('return_transfers') or 0),
                                 'seen': (x.get('found_at') or '')[:16]})
                time.sleep(0.3)
    if not rows:
        sys.exit('nenhum preço: nada foi alterado')
    rows.sort(key=lambda r: r['p'])
    keep, cnt, seen = [], {}, set()
    for r in rows:
        k = (r['o'], r['to'])
        kd = (r['o'], r['to'], r['dep'][:10], r['ret'][:10])
        if kd in seen or cnt.get(k, 0) >= KEEP:
            continue
        seen.add(kd); cnt[k] = cnt.get(k, 0) + 1; keep.append(r)
    OUT.write_text(json.dumps({'updated': now.isoformat(timespec='minutes'), 'raw': total, 'rows': keep}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{total} preços · {len(keep)} guardados · {len(cnt)} ligações')


if __name__ == '__main__':
    main()
