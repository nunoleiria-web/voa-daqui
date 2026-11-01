# Teste da API de dados da Travelpayouts (Aviasales) contra os preços atuais do Voa Daqui.
# Corre no GitHub Actions; o token vem do segredo TP_TOKEN e nunca é escrito.
import json, os, urllib.request, urllib.parse, time
TOKEN = os.environ['TP_TOKEN']
API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
def q(**p):
    p.update(currency='eur', limit=1000, sorting='price', unique='false')
    url = API + '?' + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={'X-Access-Token': TOKEN, 'Accept-Encoding': 'identity'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: j = json.load(r)
    except urllib.error.HTTPError as e:
        return {'error': f'HTTP {e.code}', 'body': e.read()[:300].decode('utf8', 'replace')}
    except Exception as e:
        return {'error': str(e)[:200]}
    time.sleep(0.3)
    return j
d = json.load(open('data/data.json'))
items = sorted(d['items'], key=lambda x: x['price'])[:40]
out = {'updated_site': d['updated'], 'routes': [], 'origins': {}}
for it in items:
    a, b = it['out']['dep'][:10], it['in']['dep'][:10]
    exact = q(origin=it['o'], destination=it['to'], departure_at=a, return_at=b)
    month = q(origin=it['o'], destination=it['to'], departure_at=a[:7], one_way='false')
    def summ(j):
        if 'error' in j or not j.get('success'): return {'err': j.get('error') or j.get('error', '') or str(j)[:200]}
        ds = j.get('data') or []
        if not ds: return {'n': 0}
        c = ds[0]
        return {'n': len(ds), 'min': c.get('price'), 'dep': c.get('departure_at'), 'ret': c.get('return_at'),
                'airline': c.get('airline'), 'transfers': c.get('transfers'), 'found': c.get('found_at') or c.get('expires_at')}
    out['routes'].append({'o': it['o'], 'to': it['to'], 'city': it['city'], 'ours': it['price'], 'dates': [a, b],
                          'exact': summ(exact), 'month': summ(month)})
for o in ('LIS', 'OPO', 'FAO'):
    for m in ('2026-11', '2026-12', '2027-01'):
        j = q(origin=o, departure_at=m, one_way='false')
        ds = j.get('data') or [] if j.get('success') else []
        out['origins'][f'{o} {m}'] = {'n': len(ds), 'dests': len({x.get('destination') for x in ds}),
                                      'cheapest': [(x.get('destination'), x.get('price'), x.get('departure_at', '')[:10], x.get('return_at', '')[:10]) for x in ds[:15]],
                                      'err': None if j.get('success') else (j.get('error') or str(j)[:200])}
os.makedirs('tp', exist_ok=True)
json.dump(out, open('tp/report.json', 'w'), ensure_ascii=False, indent=1)
print('ok', len(out['routes']))
