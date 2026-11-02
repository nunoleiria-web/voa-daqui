#!/usr/bin/env python3
"""Voltar a casa: voos baratos das cidades com mais emigrantes portugueses para Portugal.

Corre uma vez por dia no GitHub Actions (.github/workflows/tp-casa.yml), com a API de dados
da Travelpayouts (token no segredo TP_TOKEN, nunca escrito). Gera data/casa.json.
São preços vistos por outros viajantes nos últimos dias: o site diz isso e manda confirmar.
"""
import json, os, sys, time, datetime as dt, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'casa.json'
API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
FROM = ['PAR', 'LYS', 'BOD', 'TLS', 'MRS', 'NCE', 'LON', 'MAN', 'GVA', 'ZRH', 'BSL', 'LUX', 'BRU', 'FRA', 'DUS', 'AMS']
TO = ['LIS', 'OPO', 'FAO', 'FNC', 'PDL']
WINDOW = 95
NIGHTS = (2, 30)


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
    lo, hi = now.date() + dt.timedelta(days=2), now.date() + dt.timedelta(days=WINDOW)
    months = sorted({(lo + dt.timedelta(days=k)).strftime('%Y-%m') for k in range(0, WINDOW)})
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
                    rows.append({'o': o, 'oa': x.get('origin_airport') or o, 'to': d, 'p': round(float(x['price'])), 'dep': x['departure_at'][:16],
                                 'ret': x['return_at'][:16], 'n': n, 'al': x.get('airline') or '', 'st': (x.get('transfers') or 0) + (x.get('return_transfers') or 0),
                                 'seen': (x.get('found_at') or '')[:16]})
                time.sleep(0.35)
    if not rows:
        sys.exit('nenhum preço: nada foi alterado')
    # por ligação, guarda os 12 mais baratos e, à parte, os 8 mais baratos do Natal (datas diferentes)
    def xmas(r):
        a, b = r['dep'][5:10], r['ret'][5:10]
        return '12-12' <= a <= '12-26' and (b >= '12-24' or r['ret'][:4] > r['dep'][:4])
    rows.sort(key=lambda r: r['p'])
    keep, cnt, seen = [], {}, set()
    for r in rows:
        k = (r['o'], r['to'], xmas(r))
        kd = (r['o'], r['to'], r['dep'][:10], r['ret'][:10])
        if kd in seen or cnt.get(k, 0) >= (8 if k[2] else 12):
            continue
        seen.add(kd); cnt[k] = cnt.get(k, 0) + 1; keep.append(r)
    OUT.write_text(json.dumps({'updated': now.isoformat(timespec='minutes'), 'raw': total, 'rows': keep}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{total} preços · {len(keep)} guardados · {len(cnt)} ligações')


if __name__ == '__main__':
    main()
