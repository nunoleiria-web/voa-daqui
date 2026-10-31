#!/usr/bin/env python3
"""Gera data/data.json a partir das pesquisas do dia.

Uso:  python3 build.py rows.txt

rows.txt tem uma linha por voo (ida e volta), campos separados por "|":
  ORIGEM|DESTINO|Cidade|País|preço|partida ida|chegada ida|escalas ida|minutos ida|partida volta|chegada volta|escalas volta|minutos volta|companhia|bookingUrl
Exemplo:
  OPO|SVQ|Seville|Spain|38|2026-11-24T07:35|2026-11-24T09:50|0|75|2026-11-28T19:50|2026-11-28T20:05|0|75|Ryanair|https://kiwi.com/u/4569xjv

Cidade e país ficam em inglês, tal como o Kiwi os devolve (a página traduz).
O histórico de preços (data/history.json) serve para saber o preço "normal"
de cada ligação e encontrar a Pechincha do dia.
"""
import json, sys, statistics, datetime as dt
from pathlib import Path

ROOT = Path(__file__).parent
DATA, HIST = ROOT / 'data' / 'data.json', ROOT / 'data' / 'history.json'
ORIGINS = {'LIS', 'OPO', 'FAO'}
MIN_DAYS = 3          # dias de histórico antes de haver pechinchas
DEAL_OFF = 0.30       # pechincha do dia: pelo menos 30% abaixo do normal
OTHER_OFF = 0.20      # outras descidas
KEEP_DAYS = 60


def fail(msg):
    sys.exit(f'ERRO: {msg}')


def parse(path):
    items, seen = [], set()
    for n, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        f = [x.strip() for x in line.split('|')]
        if len(f) != 15:
            fail(f'linha {n}: esperava 15 campos, tem {len(f)}: {line}')
        o, to, city, country, price, od, oa, os_, om, idp, ia, is_, im, car, url = f
        if o not in ORIGINS:
            fail(f'linha {n}: origem inválida {o}')
        try:
            price = float(price)
            for t in (od, oa, idp, ia):
                dt.datetime.fromisoformat(t)
            os_, is_, om, im = int(os_), int(is_), int(om), int(im)
        except ValueError as e:
            fail(f'linha {n}: {e}')
        if not url.startswith('https://'):
            fail(f'linha {n}: link inválido {url}')
        if dt.datetime.fromisoformat(idp) <= dt.datetime.fromisoformat(od):
            fail(f'linha {n}: volta antes da ida')
        key = f'{o}|{city}'
        if key in seen:      # fica o mais barato de cada ligação
            prev = next(i for i in items if i['key'] == key)
            if prev['price'] <= price:
                continue
            items.remove(prev)
        seen.add(key)
        items.append({'key': key, 'o': o, 'to': to, 'city': city, 'country': country, 'price': round(price),
                      'out': {'dep': od, 'arr': oa, 'stops': os_, 'min': om}, 'in': {'dep': idp, 'arr': ia, 'stops': is_, 'min': im},
                      'carrier': car, 'url': url})
    if len(items) < 5:
        fail(f'só {len(items)} voos válidos: algo correu mal nas pesquisas')
    return items


LM_TOP, ED_TOP = 99, 4   # quantos destinos comparar no lastminute.com e no eDreams
HOTEL_TOP = 8            # quantos destinos com alojamento do Booking (atualização das 7h)


def parse_cmp(path, items):
    """cmp.txt: preços do lastminute.com (lm) e do eDreams (ed) para as mesmas datas.
    ORIGEM|DESTINO|data ida|data volta|site|preço|preço Prime ou -|hora ida|hora volta[|mac]
    mac (só lastminute): o valor do parâmetro mac= do deeplink, para o link abrir a pesquisa certa.
    Ex.: OPO|SVQ|2026-11-24|2026-11-28|lm|33.98|-|07:35|19:50|835654137106208768SCHv011659167019"""
    by = {(i['o'], i['to'], i['out']['dep'][:10], i['in']['dep'][:10]): i for i in items}
    n = 0
    for k, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        f = [x.strip() for x in line.split('|')]
        if len(f) not in (9, 10) or f[4] not in ('lm', 'ed'):
            fail(f'cmp.txt linha {k}: formato inválido: {line}')
        it = by.get((f[0], f[1], f[2], f[3]))
        if not it:
            print(f'aviso: cmp.txt linha {k} não corresponde a nenhum voo de rows.txt')
            continue
        try:
            entry = {'p': round(float(f[5]), 2), 'out': f[7], 'in': f[8]}
            if len(f) == 10 and f[9]:
                if 'SCH' not in f[9]:
                    fail(f'cmp.txt linha {k}: mac inválido')
                entry['mac'] = f[9]
            if f[6] not in ('-', ''):
                entry['prime'] = round(float(f[6]), 2)
        except ValueError:
            fail(f'cmp.txt linha {k}: preço inválido')
        it.setdefault('cmp', {})[f[4]] = entry
        n += 1
    return n


def parse_hotels(path, items):
    """hotels.txt: alojamento mais barato no Booking.com para 2 adultos / 1 quarto, nas datas do voo.
    ORIGEM|DESTINO|data ida|data volta|nome|preço total|nota|tipo|url"""
    by = {(i['o'], i['to'], i['out']['dep'][:10], i['in']['dep'][:10]): i for i in items}
    n = 0
    for k, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        f = [x.strip() for x in line.split('|')]
        if len(f) != 9:
            fail(f'hotels.txt linha {k}: esperava 9 campos: {line}')
        it = by.get(tuple(f[:4]))
        if not it:
            continue
        try:
            price = round(float(f[5]), 2)
            rating = float(f[6]) if f[6] not in ('', '-') else None
        except ValueError:
            fail(f'hotels.txt linha {k}: preço ou nota inválidos')
        if not f[8].startswith('https://'):
            fail(f'hotels.txt linha {k}: link inválido')
        it['hotel'] = {'name': f[4], 'p2': price, 'rating': rating, 'type': f[7], 'url': f[8]}
        n += 1
    return n


def best_price(it):
    ps = [it['price']] + [c['p'] for c in it.get('cmp', {}).values()]
    return min(ps)


def to_compare(items, deal, light=False):
    """Os voos a comparar: a pechincha e os destinos mais baratos (um por cidade)."""
    seen, order = set(), []
    for it in ([deal['item']] if deal else []) + sorted(items, key=lambda i: i['price']):
        c = it['city']
        if c in seen:
            continue
        seen.add(c)
        order.append(it)
    lm = order[:12 if light else LM_TOP]
    ed = [] if light else order[:ED_TOP + (1 if deal else 0)]
    return lm, ed


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    light = '--leve' in sys.argv   # atualização de hora a hora: só lastminute nos 12 mais baratos
    if len(args) not in (1, 2):
        fail('uso: python3 build.py rows.txt [cmp.txt] [--leve]')
    items = parse(args[0])
    ncmp = parse_cmp(args[1], items) if len(args) == 2 and Path(args[1]).exists() else 0
    nhot = parse_hotels(ROOT / 'hotels.txt', items) if (ROOT / 'hotels.txt').exists() else 0
    for it in items:
        it['best'] = best_price(it)
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=0)))
    try:
        import zoneinfo
        now = dt.datetime.now(zoneinfo.ZoneInfo('Europe/Lisbon'))
    except Exception:
        pass
    today = now.date().isoformat()

    hist = json.loads(HIST.read_text()) if HIST.exists() else []
    hist = [h for h in hist if h['d'] != today]
    prev = sorted(hist, key=lambda h: h['d'])[-KEEP_DAYS:]

    # preço "normal" de cada ligação: mediana dos dias anteriores.
    # Se a ligação não apareceu num dia, o preço estava acima do 15.º mais barato
    # dessa origem nesse dia, por isso usamos esse valor como estimativa mínima.
    cands = []
    if len(prev) >= MIN_DAYS:
        for it in items:
            series = []
            for h in prev[-21:]:
                p = h['routes'].get(it['key'])
                lb = p is None
                if lb:
                    p = h['max'].get(it['o'])
                if p:
                    series.append({'d': h['d'], 'p': p, 'lb': lb})
            if len(series) < MIN_DAYS or it['price'] < 15:
                continue
            base = statistics.median(s['p'] for s in series)
            off = 1 - it['price'] / base
            cands.append({'item': it, 'base': round(base), 'off': round(off, 3),
                          'lb': any(s['lb'] for s in series), 'hist': series[-13:]})
    cands.sort(key=lambda c: (-c['off'], c['item']['price']))
    deal = cands[0] if cands and cands[0]['off'] >= DEAL_OFF else None
    others = [c for c in cands if c is not deal and c['off'] >= OTHER_OFF][:3]
    top = None if deal or not cands else cands[0]

    maxes = {}
    for it in items:
        maxes[it['o']] = max(maxes.get(it['o'], 0), it['price'])
    hist.append({'d': today, 'routes': {it['key']: it['price'] for it in items}, 'max': maxes})  # histórico sempre com o preço do Kiwi, para comparar igual com igual
    hist = sorted(hist, key=lambda h: h['d'])[-KEEP_DAYS:]

    deps = sorted(i['out']['dep'][:10] for i in items)
    out = {'updated': now.isoformat(timespec='minutes'), 'days': len(prev), 'needDays': MIN_DAYS,
           'range': [deps[0], deps[-1]], 'items': sorted(items, key=lambda i: i['price']),
           'deal': deal, 'others': others, 'top': top}
    DATA.parent.mkdir(exist_ok=True)
    DATA.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    HIST.write_text(json.dumps(hist, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    d = deal
    print(f'{len(items)} voos · histórico de {len(prev)} dias · {ncmp} preços de outros sites · ' +
          (f"pechincha: {d['item']['o']} → {d['item']['city']} {d['item']['price']} € (normal {d['base']} €, −{round(d['off']*100)}%)" if d else 'sem pechincha hoje'))
    lm, ed = to_compare(items, deal, light)
    print(f'{nhot} destinos com alojamento')
    print('\nPARA COMPARAR (origem destino ida volta):')
    for site, lst in (('lastminute.com', lm), ('eDreams', ed)):
        for it in lst:
            print(f"  {site:14} {it['o']} {it['to']} {it['out']['dep'][:10]} {it['in']['dep'][:10]}")
    if not light:
        print('\nPARA ALOJAMENTO (Booking.com, 2 adultos, 1 quarto: cidade, país, entrada, saída):')
        for it in lm[:HOTEL_TOP]:
            print(f"  {it['o']}|{it['to']}|{it['out']['dep'][:10]}|{it['in']['dep'][:10]}  ->  {it['city']}, {it['country']}")


if __name__ == '__main__':
    main()
