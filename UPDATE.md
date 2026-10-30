# Atualização diária

Todas as manhãs uma tarefa agendada do Claude faz isto:

1. **Três pesquisas no Kiwi.com** (ferramenta `search-flight`), uma por origem (`LIS`, `OPO`, `FAO`), sempre com:
   - `flyTo`: `anywhere`
   - `departureDate`: amanhã · `departureDateTo`: amanhã + 58 dias (formato dd/mm/aaaa)
   - `nights_in_dst_from`: 2 · `nights_in_dst_to`: 4
   - `one_for_city`: true · `allow_self_transfer`: false
   - `dtime_from`: 6 · `ret_dtime_from`: 6
   - `sort`: price · `currency`: EUR · `adults`: 1

2. **Escrever `rows.txt`**, uma linha por itinerário devolvido (até 15 por origem), campos separados por `|`:

   ```
   ORIGEM|DESTINO|Cidade|País|preço|partida ida|chegada ida|escalas ida|minutos ida|partida volta|chegada volta|escalas volta|minutos volta|companhia|bookingUrl
   ```

   - Cidade e País: `toCity` e `toCountry` do último segmento da ida, em inglês, como vêm do Kiwi.
   - Datas: `aaaa-mm-ddThh:mm` (hora local, sem segundos).
   - Minutos: `durationSeconds` da ida e da volta a dividir por 60.
   - Exemplo: `OPO|SVQ|Seville|Spain|38|2026-11-24T07:35|2026-11-24T09:50|0|75|2026-11-28T19:50|2026-11-28T20:05|0|75|Ryanair|https://kiwi.com/u/4569xjv`
   - Companhia: `carrierName` da ida; se a volta for de outra companhia, `Ida + Volta` (ex.: `Ryanair + Vueling`).
   - bookingUrl: copiado exatamente.

3. **`python3 build.py rows.txt`**: valida as linhas, atualiza `data/history.json` e gera `data/data.json` (lista de voos + Pechincha do dia). Se der erro, corrigir `rows.txt` e repetir.

4. **Commit e push** para `main`. O GitHub Pages publica sozinho em 1 a 2 minutos.

## Como funciona a Pechincha do dia

Para cada ligação (ex.: Porto → Sevilha) guarda-se o preço mais baixo visto em cada dia.
O preço "normal" é a mediana dos últimos 21 dias. Se a ligação não apareceu num dia,
o preço estava acima do 15.º destino mais barato dessa origem, e esse valor conta como estimativa mínima.
Há pechincha quando o preço de hoje está pelo menos 30% abaixo do normal (precisa de 3 dias de histórico).
