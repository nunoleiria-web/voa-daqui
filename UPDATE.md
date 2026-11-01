# Atualização

Uma tarefa agendada do Claude corre três vezes por dia, às 7h, 13h e 19h (hora de Lisboa):
- **às 7h, completa:** os passos abaixo, com `python3 build.py rows.txt` (lastminute em todos os voos e eDreams nos mais baratos);
- **às 13h e às 19h, leve:** os mesmos passos, mas sempre com `--leve` no fim (`python3 build.py rows.txt --leve` e `python3 build.py rows.txt cmp.txt --leve`). A lista "PARA COMPARAR" fica só com o lastminute nos 12 destinos mais baratos. Nessas horas, em `cmp.txt` atualiza (ou acrescenta) só as linhas desses 12 voos e mantém as restantes como estão.

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

3b. **Confirmar as descobertas da Travelpayouts (em todas as atualizações).** Um programa no GitHub (`tools/tp_fetch.py`, uns 25 minutos antes de cada atualização) pergunta à API da Travelpayouts os voos mais baratos para mais de 100 destinos e guarda-os em `data/tp.json`. Esses preços podem ter até 2 dias, por isso nunca aparecem no site sem confirmação. O `build.py` mostra a lista "PARA CONFIRMAR" (`origem|destino|ida|volta`). Para cada linha (só as da primeira execução):
   - ferramenta `search-flight` do Kiwi com `flyFrom` origem, `flyTo` destino, `departureDate` ida e `returnDate` volta (dd/mm/aaaa), `allow_self_transfer` false, `sort` price, `currency` EUR, `adults` 1;
   - acrescentar ao fim de `extra.txt` (não apagar o que lá está) uma linha que começa pela hora atual de Lisboa e depois o voo mais barato no formato do `rows.txt`:
     `2026-11-01T23:13|LIS|SVQ|Seville|Spain|38|2026-12-17T22:20|2026-12-18T00:25|0|65|2026-12-19T23:45|2026-12-19T23:55|0|70|Ryanair|https://kiwi.com/u/w5g82f`
   - se o Kiwi não devolver nada: `2026-11-01T23:13|OPO|BGY|2026-12-11|2026-12-14|-`
   - O `build.py` junta sozinho os voos de `extra.txt` (durante 6 horas) e não volta a pedir a mesma confirmação nesse tempo.

3c. **Fins de semana sem faltar ao trabalho (em todas as atualizações).** Três pesquisas no Kiwi (`LIS`, `OPO`, `FAO`):
   - `flyTo` anywhere, `departureDate` amanhã, `departureDateTo` amanhã + 58 dias
   - `nights_in_dst_from` 2, `nights_in_dst_to` 2, `fly_days` "5", `ret_fly_days` "0", `dtime_from` 18
   - `one_for_city` true, `allow_self_transfer` false, `sort` price, `currency` EUR, `adults` 1
   - Escrever `fds.txt` (substitui o ficheiro todo), formato do `rows.txt`, com todos os resultados até 160 €. Se a pesquisa de uma origem falhar, mantém as linhas antigas dessa origem.

   Depois de 3b e 3c, correr outra vez `python3 build.py rows.txt` (com `--leve` se for o caso) e usar a lista "PARA COMPARAR" desta última execução.

4. **Comparar preços.** O `build.py` termina com a lista "PARA COMPARAR". Para cada linha:
   - `lastminute.com`: ferramenta `search_flights` do lastminute.com com `departure`, `arrival`, `start_date` (ida), `end_date` (volta), `max_results` 1, `adults` 1.
   - `eDreams`: ferramenta `search_flights` do eDreams com `origin`, `destination`, `departure_date`, `return_date`, `adults` 1, `market` pt-PT. Usar o primeiro itinerário (o mais barato).
   - Escrever `cmp.txt`, uma linha por resultado: `ORIGEM|DESTINO|data ida|data volta|lm ou ed|preço|preço Prime (eDreams) ou -|hora ida|hora volta|mac`
     - `mac` só no lastminute: o valor do parâmetro `mac=` do `deeplink` (ex.: `835654137106208768SCHv011659167019`), copiado exatamente. É o que faz o botão do site abrir a pesquisa certa.
     Ex.: `OPO|SVQ|2026-11-24|2026-11-28|lm|33.98|-|07:35|19:50|835654137106208768SCHv011659167019` e `OPO|SVQ|2026-11-24|2026-11-28|ed|45|28|07:35|19:50`
   - Se uma pesquisa falhar, salta essa linha.
   - Correr de novo: `python3 build.py rows.txt cmp.txt`

5. **Alojamento (só às 7h, completa).** O `build.py` termina com a lista "PARA ALOJAMENTO" (8 destinos). Para cada linha:
   - ferramenta `accommodations_search` do Booking.com com a cidade e o país, `checkin` = data de ida, `checkout` = data de volta, 2 adultos, 1 quarto, moeda EUR;
   - escolher o resultado **mais barato com nota 7 ou mais** (os resultados não vêm ordenados);
   - escrever `hotels.txt` (substitui o ficheiro todo), uma linha por destino: `ORIGEM|DESTINO|data ida|data volta|nome|preço total da estadia|nota|tipo|url`
     Ex.: `OPO|TNG|2026-11-28|2026-11-30|Nezha Hotel|57|7.1|Hotel|https://www.booking.com/hotel/ma/work-amp-stay.html?aid=8132308&checkin=2026-11-28&checkout=2026-11-30&no_rooms=1&group_adults=2&selected_currency=EUR`
   - o url é o do resultado, copiado exatamente (tem o `aid`); se faltarem `checkin`/`checkout`/`group_adults=2`, acrescentá-los.
   - Nas horas leves, `hotels.txt` fica como está.
   - Correr de novo: `python3 build.py rows.txt cmp.txt` (ou com `--leve`).

5b. **Pontes e feriados (só às 7h, completa).** O `build.py` mostra a lista "PARA PONTES" (até 3 pontes, cada linha `id|ida de|ida até|volta`). Para cada ponte, três pesquisas no Kiwi (`LIS`, `OPO`, `FAO`):
   - `flyTo`: `anywhere`, `departureDate`: "ida de", `departureDateTo`: "ida até", `returnDate` e `returnDateTo`: "volta"
   - `one_for_city`: true, `allow_self_transfer`: false, `dtime_from`: 6, `ret_dtime_from`: 6, `sort`: price, `currency`: EUR
   - Escrever `pontes.txt` (substitui o ficheiro todo): os 8 mais baratos de cada origem, no formato do `rows.txt` com o id da ponte à frente:
     `2026-12-08|OPO|SVQ|Seville|Spain|68|2026-12-05T20:30|2026-12-05T22:45|0|75|2026-12-08T06:55|2026-12-08T07:10|0|75|Ryanair|https://kiwi.com/u/su7f5r`
   - Nas horas leves, `pontes.txt` fica como está (as pontes que já passaram desaparecem sozinhas do site).

6. **Imagem de partilha:** `python3 og.py` (gera `og.png` com a Pechincha ou os 3 mais baratos). Se falhar, segue sem ela.

7. **Commit e push** para `main`. O GitHub Pages publica sozinho em 1 a 2 minutos.

## Como funciona a Pechincha do dia

Para cada ligação (ex.: Porto → Sevilha) guarda-se o preço mais baixo visto em cada dia.
O preço "normal" é a mediana dos últimos 21 dias. Se a ligação não apareceu num dia,
o preço estava acima do 15.º destino mais barato dessa origem, e esse valor conta como estimativa mínima.
Há pechincha quando o preço de hoje está pelo menos 30% abaixo do normal (precisa de 3 dias de histórico).
