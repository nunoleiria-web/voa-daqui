#!/usr/bin/env python3
"""Descoberta de voos baratos com a API de dados da Travelpayouts (Aviasales).

Corre de hora a hora no GitHub Actions (.github/workflows/tp-fetch.yml).
O token vem do segredo TP_TOKEN e nunca é escrito em lado nenhum.

Gera:
  data/tp.json       candidatos: o voo de ida e volta mais barato por ligação (2 a 4 noites,
                     partida entre amanhã e daqui a 58 dias). O site NÃO os mostra diretamente:
                     a tarefa de hora a hora confirma os melhores no Kiwi.com (build.py, "PARA CONFIRMAR").
  data/tp_hist.json  preço mais baixo visto por ligação e por dia (para saber se um preço é bom).
"""
import json, os, sys, time, datetime as dt, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT, HIST = ROOT / 'data' / 'tp.json', ROOT / 'data' / 'tp_hist.json'
API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
ORIGINS = ('LIS', 'OPO', 'FAO')
NIGHTS = (2, 4)
WINDOW = 58
KEEP_DAYS = 180


def get(token, **p):
    p.update(currency='eur', limit=1000, sorting='price', unique='false', one_way='false')
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(p),
                                 headers={'X-Access-Token': token, 'Accept-Encoding': 'identity'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                j = json.load(r)
            if j.get('success'):
                return j.get('data') or []
            print('aviso: resposta sem sucesso', p.get('origin'), p.get('departure_at'), str(j.get('error'))[:120])
            return []
        except Exception as e:
            print('aviso:', p.get('origin'), p.get('departure_at'), str(e)[:120])
            time.sleep(3 * (attempt + 1))
    return []


def day(s):
    return dt.date.fromisoformat(s[:10])


def main():
    token = os.environ.get('TP_TOKEN')
    if not token:
        sys.exit('falta TP_TOKEN')
    try:
        import zoneinfo
        now = dt.datetime.now(zoneinfo.ZoneInfo('Europe/Lisbon'))
    except Exception:
        now = dt.datetime.now(dt.timezone.utc)
    today = now.date()
    lo, hi = today + dt.timedelta(days=1), today + dt.timedelta(days=WINDOW)
    months = sorted({(lo + dt.timedelta(days=k)).strftime('%Y-%m') for k in range(0, WINDOW + 1)})

    best, total = {}, 0
    for o in ORIGINS:
        for m in months:
            for x in get(token, origin=o, departure_at=m):
                total += 1
                try:
                    a, b = day(x['departure_at']), day(x['return_at'])
                except Exception:
                    continue
                n = (b - a).days
                if not (lo <= a <= hi) or not (NIGHTS[0] <= n <= NIGHTS[1]):
                    continue
                exp = x.get('expires_at')
                if exp and exp[:19] < dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S'):
                    continue
                city = x.get('destination') or x.get('destination_airport')
                to = x.get('destination_airport') or city
                if not city or city in ORIGINS and city == o:
                    continue
                k = f'{o}|{city}'
                p = round(float(x.get('price') or 0))
                if p <= 0:
                    continue
                if k not in best or p < best[k]['price']:
                    best[k] = {'o': o, 'to': to, 'city': city, 'price': p, 'dep': a.isoformat(), 'ret': b.isoformat(),
                               'nights': n, 'airline': x.get('airline'), 'stops': (x.get('transfers') or 0) + (x.get('return_transfers') or 0)}
            time.sleep(0.4)

    cands = sorted(best.values(), key=lambda c: c['price'])
    if not cands:
        sys.exit('nenhum candidato: a API falhou ou não devolveu dados; nada foi alterado')
    OUT.write_text(json.dumps({'updated': now.isoformat(timespec='minutes'), 'raw': total, 'cands': cands},
                              ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    hist = json.loads(HIST.read_text()) if HIST.exists() else {}
    d = today.isoformat()
    for c in cands:
        h = hist.setdefault(f"{c['o']}|{c['city']}", {})
        h[d] = min(h.get(d, 10 ** 6), c['price'])
    cut = (today - dt.timedelta(days=KEEP_DAYS)).isoformat()
    hist = {k: {dd: p for dd, p in v.items() if dd >= cut} for k, v in hist.items()}
    hist = {k: v for k, v in hist.items() if v}
    HIST.write_text(json.dumps(hist, ensure_ascii=False, separators=(',', ':'), sort_keys=True), encoding='utf-8')
    by = {}
    for c in cands:
        by[c['o']] = by.get(c['o'], 0) + 1
    print(f"{total} preços recebidos · {len(cands)} ligações · por origem: {by} · mais barato: {cands[0]}")


if __name__ == '__main__':
    main()
