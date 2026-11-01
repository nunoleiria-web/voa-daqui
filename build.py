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


def parse(path, lines=None, minimum=5):
    items, seen = [], set()
    src = lines if lines is not None else Path(path).read_text(encoding='utf-8').splitlines()
    for n, line in enumerate(src, 1):
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
    if len(items) < minimum:
        fail(f'só {len(items)} voos válidos: algo correu mal nas pesquisas')
    return items


# ---------- pontes e feriados ----------
PONTES_MAX = 3   # quantas pontes pesquisar de cada vez (as mais próximas dentro das 8 semanas)


def easter(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e, f = b // 4, b % 4, (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    return dt.date(y, (h + l - 7 * m + 114) // 31, (h + l - 7 * m + 114) % 31 + 1)


def holidays(y):
    E, D, td = easter(y), dt.date, dt.timedelta
    return [(D(y, 1, 1), 'Ano Novo'), (E - td(47), 'Carnaval'), (E - td(2), 'Páscoa'), (D(y, 4, 25), '25 de Abril'),
            (D(y, 5, 1), '1 de Maio'), (E + td(60), 'Corpo de Deus'), (D(y, 6, 10), '10 de Junho'), (D(y, 8, 15), '15 de Agosto'),
            (D(y, 10, 5), '5 de Outubro'), (D(y, 11, 1), '1 de Novembro'), (D(y, 12, 1), '1 de Dezembro'),
            (D(y, 12, 8), '8 de Dezembro'), (D(y, 12, 25), 'Natal')]


def pontes(today, n=8):
    """Fins de semana prolongados: feriado à segunda ou sexta (3 dias), à terça ou quinta (4 dias com ponte)."""
    td, out = dt.timedelta, []
    for y in (today.year, today.year + 1):
        for d, name in holidays(y):
            w = d.weekday()
            if name == 'Páscoa':
                s, e, br = d, d + td(2), None          # Sexta-feira Santa a domingo
            elif w == 0: s, e, br = d - td(2), d, None
            elif w == 1: s, e, br = d - td(3), d, d - td(1)
            elif w == 3: s, e, br = d, d + td(3), d + td(1)
            elif w == 4: s, e, br = d, d + td(2), None
            else:
                continue
            if s <= today:
                continue
            out.append({'id': d.isoformat(), 'name': name, 'hol': d.isoformat(), 'start': s.isoformat(), 'end': e.isoformat(),
                        'bridge': br.isoformat() if br else None, 'days': (e - s).days + 1})
    return sorted(out, key=lambda p: p['start'])[:n]


def attach_pontes(today, path):
    lst = pontes(today)
    rows = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '|' in line:
                pid, rest = line.split('|', 1)
                rows.setdefault(pid, []).append(rest)
    for p in lst:
        its = parse(None, rows.get(p['id'], []), minimum=0)
        for it in its:
            it['key'] = f"{p['id']}|{it['key']}"
            it['best'] = it['price']
        p['items'] = sorted(its, key=lambda i: i['price'])
    return lst


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
    ORIGEM|DESTINO|data ida|data volta|nome|preço total|nota|tipo|url
    Fica associado à rota (origem e destino). Se ao longo do dia o voo mais barato mudar de datas,
    o site estima pelo preço por noite e abre o Booking já com as novas datas."""
    import re
    by = {(i['o'], i['to']): i for i in items}
    n = 0
    for k, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        f = [x.strip() for x in line.split('|')]
        if len(f) != 9:
            fail(f'hotels.txt linha {k}: esperava 9 campos: {line}')
        it = by.get((f[0], f[1]))
        if not it:
            continue
        try:
            price = round(float(f[5]), 2)
            rating = float(f[6]) if f[6] not in ('', '-') else None
            nights = max(1, (dt.date.fromisoformat(f[3]) - dt.date.fromisoformat(f[2])).days)
        except ValueError:
            fail(f'hotels.txt linha {k}: preço, nota ou datas inválidos')
        if not f[8].startswith('https://'):
            fail(f'hotels.txt linha {k}: link inválido')
        url = re.sub(r'([?&])aid=\d+&?', r'\1', f[8]).rstrip('&?')   # sem código de afiliado de terceiros
        it['hotel'] = {'name': f[4], 'p2': price, 'pn': round(price / nights, 2), 'ci': f[2], 'co': f[3],
                       'rating': rating, 'type': f[7], 'url': url}
        n += 1
    return n


# ---------- descoberta (Travelpayouts) e fins de semana ----------
CITY_CODE = {'STN': 'LON', 'LTN': 'LON', 'LGW': 'LON', 'LHR': 'LON', 'SEN': 'LON', 'LCY': 'LON', 'BVA': 'PAR', 'ORY': 'PAR', 'CDG': 'PAR',
             'BGY': 'MIL', 'MXP': 'MIL', 'LIN': 'MIL', 'FCO': 'ROM', 'CIA': 'ROM', 'HHN': 'FRA', 'NRN': 'DUS', 'EIN': 'AMS', 'CRL': 'BRU',
             'GRO': 'BCN', 'REU': 'BCN', 'TFS': 'TCI', 'TFN': 'TCI', 'ARN': 'STO', 'NYO': 'STO', 'BMA': 'STO', 'GOT': 'GOT'}
CONFIRM_TOP, CONFIRM_TOP_LIGHT = 6, 4   # quantos candidatos da Travelpayouts confirmar no Kiwi
TP_MAX_AGE_H = 4
EXTRA_KEEP_H = 6                        # um voo confirmado no Kiwi conta durante 6 horas


def read_extra(now):
    """extra.txt: voos confirmados no Kiwi a partir da lista PARA CONFIRMAR.
    Cada linha começa pela hora da confirmação: AAAA-MM-DDTHH:MM|<linha no formato do rows.txt>
    ou, se o Kiwi não tinha voo nessas datas: AAAA-MM-DDTHH:MM|ORIGEM|DESTINO|ida|volta|-
    Devolve (linhas válidas para juntar ao rows.txt, conjunto de pesquisas já feitas)."""
    path = ROOT / 'extra.txt'
    rows, done, keep = [], set(), []
    if not path.exists():
        return rows, done
    naive = now.replace(tzinfo=None)
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '|' not in line:
            continue
        stamp, rest = line.split('|', 1)
        try:
            age = (naive - dt.datetime.fromisoformat(stamp)).total_seconds() / 3600
        except ValueError:
            continue
        if age > 24:
            continue
        keep.append(line)
        f = rest.split('|')
        if len(f) == 5:
            if age <= EXTRA_KEEP_H:
                done.add((f[0], f[1], f[2], f[3]))
        elif len(f) == 15:
            if age <= EXTRA_KEEP_H:
                done.add((f[0], f[1], f[5][:10], f[9][:10]))
                rows.append(rest)
    path.write_text('\n'.join(keep) + ('\n' if keep else ''), encoding='utf-8')   # limpa linhas com mais de 24 h
    return rows, done


def to_confirm(items, now, light=False, done=()):
    """Voos que a Travelpayouts viu mais baratos do que os nossos (ou ligações que não temos),
    e que entrariam na lista. A tarefa confirma-os no Kiwi.com nas datas indicadas."""
    path = ROOT / 'data' / 'tp.json'
    if not path.exists():
        return []
    tp = json.loads(path.read_text(encoding='utf-8'))
    try:
        age = (now - dt.datetime.fromisoformat(tp['updated'])).total_seconds() / 3600
    except Exception:
        age = 99
    if age > TP_MAX_AGE_H:
        print(f'aviso: dados da Travelpayouts com {age:.0f} h, não há candidatos a confirmar')
        return []
    ours, cap = {}, {}
    for it in items:
        for k in ((it['o'], it['to']), (it['o'], CITY_CODE.get(it['to'], it['to']))):
            ours[k] = min(ours.get(k, 10 ** 6), it['price'])
        cap[it['o']] = max(cap.get(it['o'], 0), it['price'])
    tomorrow = (now.date() + dt.timedelta(days=1)).isoformat()
    out = []
    for c in tp.get('cands', []):
        if c['dep'] < tomorrow or c['o'] not in cap or (c['o'], c['to'], c['dep'], c['ret']) in done:
            continue
        mine = min(ours.get((c['o'], c['city']), 10 ** 6), ours.get((c['o'], c['to']), 10 ** 6))
        if c['price'] >= mine - 2 or c['price'] > cap[c['o']]:
            continue
        c['ours'] = None if mine == 10 ** 6 else mine
        out.append(c)
    return out[:CONFIRM_TOP_LIGHT if light else CONFIRM_TOP]


def parse_weekend(path):
    """fds.txt: fins de semana sem faltar ao trabalho (ida à sexta depois das 18h, volta ao domingo).
    Mesmo formato do rows.txt."""
    if not path.exists():
        return []
    its = parse(None, path.read_text(encoding='utf-8').splitlines(), minimum=0)
    keep = []
    for it in its:
        a, b = dt.datetime.fromisoformat(it['out']['dep']), dt.datetime.fromisoformat(it['in']['dep'])
        if not ((a.weekday() == 4 and a.hour >= 18) or a.weekday() == 5) or b.weekday() not in (5, 6):
            continue
        it['key'] = 'fds|' + it['key']
        it['best'] = it['price']
        it['wk'] = 1
        keep.append(it)
    return sorted(keep, key=lambda i: i['price'])


PH_MIN_DAYS = 10   # dias de histórico antes de mostrar "este preço é bom?"


def price_history(items, hist_prev, today):
    """Etiqueta de cada voo face ao histórico (Kiwi; se faltar, Travelpayouts): mais baixo em 30 dias, abaixo do normal, normal ou acima."""
    tp_path = ROOT / 'data' / 'tp_hist.json'
    tp = json.loads(tp_path.read_text()) if tp_path.exists() else {}
    cut = (dt.date.fromisoformat(today) - dt.timedelta(days=30)).isoformat()
    for it in items:
        ser = {h['d']: h['routes'][it['key']] for h in hist_prev if h['d'] >= cut and it['key'] in h['routes']}
        tser = tp.get(f"{it['o']}|{CITY_CODE.get(it['to'], it['to'])}") or tp.get(f"{it['o']}|{it['to']}") or {}
        for d, p in tser.items():
            if cut <= d < today and d not in ser:
                ser[d] = p
        if len(ser) < PH_MIN_DAYS:
            continue
        vals = [ser[d] for d in sorted(ser)]
        med, lo, p = statistics.median(vals), min(vals), it['price']
        tag = 'low' if p <= lo and p < med else 'good' if p <= med * 0.85 else 'high' if p >= med * 1.15 else 'normal'
        it['ph'] = {'tag': tag, 'med': round(med), 'min': round(lo), 'n': len(vals), 's': vals[-30:]}


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
    light = '--leve' in sys.argv   # atualizações das 13h e 19h: só lastminute nos 12 mais baratos
    if len(args) not in (1, 2):
        fail('uso: python3 build.py rows.txt [cmp.txt] [--leve]')
    now0 = dt.datetime.now(dt.timezone.utc)
    try:
        import zoneinfo
        now0 = dt.datetime.now(zoneinfo.ZoneInfo('Europe/Lisbon'))
    except Exception:
        pass
    extra, done = read_extra(now0)
    tmw = (now0.date() + dt.timedelta(days=1)).isoformat()
    extra = [r for r in extra if r.split('|')[5][:10] >= tmw]
    lines = Path(args[0]).read_text(encoding='utf-8').splitlines() + extra
    items = parse(args[0], lines)
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

    price_history(items, prev, today)
    plist = attach_pontes(now.date(), ROOT / 'pontes.txt')
    tomorrow = (now.date() + dt.timedelta(days=1)).isoformat()
    weekend = [w for w in parse_weekend(ROOT / 'fds.txt') if w['out']['dep'][:10] >= tomorrow]
    deps = sorted(i['out']['dep'][:10] for i in items)
    out = {'updated': now.isoformat(timespec='minutes'), 'days': len(prev), 'needDays': MIN_DAYS,
           'range': [deps[0], deps[-1]], 'items': sorted(items, key=lambda i: i['price']),
           'deal': deal, 'others': others, 'top': top, 'pontes': plist, 'weekend': weekend}
    DATA.parent.mkdir(exist_ok=True)
    DATA.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    HIST.write_text(json.dumps(hist, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    d = deal
    print(f'{len(items)} voos · histórico de {len(prev)} dias · {ncmp} preços de outros sites · ' +
          (f"pechincha: {d['item']['o']} → {d['item']['city']} {d['item']['price']} € (normal {d['base']} €, −{round(d['off']*100)}%)" if d else 'sem pechincha hoje'))
    lm, ed = to_compare(items, deal, light)
    print(f'{nhot} destinos com alojamento · {len(weekend)} fins de semana sem faltar ao trabalho')
    conf = to_confirm(items, now, light, done)
    if extra:
        print(f'{len(extra)} voos confirmados (extra.txt) juntos à lista')
    print('\nPARA CONFIRMAR (Kiwi, voo visto mais barato na Travelpayouts; origem|destino|ida|volta):')
    for c in conf:
        print(f"  {c['o']}|{c['to']}|{c['dep']}|{c['ret']}  (visto a {c['price']} €" + (f", nosso {c['ours']} €)" if c['ours'] else ", ligação nova)"))
    if not conf:
        print('  (nenhum)')
    print('\nPARA COMPARAR (origem destino ida volta):')
    for site, lst in (('lastminute.com', lm), ('eDreams', ed)):
        for it in lst:
            print(f"  {site:14} {it['o']} {it['to']} {it['out']['dep'][:10]} {it['in']['dep'][:10]}")
    if not light:
        horizon = now.date() + dt.timedelta(days=58)
        todo = [p for p in plist if dt.date.fromisoformat(p['start']) - dt.timedelta(days=1) <= horizon][:PONTES_MAX]
        print(f"\n{sum(1 for p in plist if p['items'])} pontes com voos")
        print('PARA PONTES (Kiwi, flyTo anywhere, uma pesquisa por origem LIS/OPO/FAO; id|ida de|ida até|volta):')
        for p in todo:
            dep0 = dt.date.fromisoformat(p['start']) - dt.timedelta(days=1)
            print(f"  {p['id']}|{dep0:%d/%m/%Y}|{dt.date.fromisoformat(p['start']):%d/%m/%Y}|{dt.date.fromisoformat(p['end']):%d/%m/%Y}  ({p['name']})")
        print('\nPARA ALOJAMENTO (Booking.com, 2 adultos, 1 quarto: cidade, país, entrada, saída):')
        for it in lm[:HOTEL_TOP]:
            print(f"  {it['o']}|{it['to']}|{it['out']['dep'][:10]}|{it['in']['dep'][:10]}  ->  {it['city']}, {it['country']}")


if __name__ == '__main__':
    main()
