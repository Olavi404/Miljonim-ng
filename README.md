# Miljonimäng

## Projekti kirjeldus

Miljonimäng on kooliprojekt, mis aitab kontrollida, kas õppija mõistab ülesande lahendust. Rakendus loeb `input/` kaustast ülesanded, võtab kaasa `assignment.md` kirjelduse ja lahendusfailid ning loob nende põhjal 15 küsimusega miljonimängu.

Praeguses versioonis on AI osa simuleeritud, kuid küsimuste genereerimise loogika on koodis eraldi kohas, et selle saaks hiljem OpenAI või muu AI API vastu vahetada.

## Kasutatud tehnoloogiad

- Node.js sisseehitatud `http` server
- HTML
- CSS
- JavaScript
- Failisüsteemist lugemine Node.js `fs/promises` mooduliga

## Käivitamise juhend

### Kohalik käivitamine Node.js serveriga

1. Paigalda Node.js.
2. Ava terminal projekti kaustas.
3. Käivita rakendus:

```bash
node server.js
```

4. Ava brauseris:

```text
http://localhost:3000
```

### GitHub Pages

Rakendust saab hostida ka GitHub Pages lehel, sest juurkaustas on staatiline `index.html`.

GitHubis:

1. Ava repository `Settings`.
2. Vali vasakult `Pages`.
3. `Build and deployment` all vali `Deploy from a branch`.
4. Branch: `main`.
5. Folder: `/root`.
6. Salvesta.

Pärast avaldamist on leht kujul:

```text
https://olavi404.github.io/Miljonim-ng/
```

GitHub Pages ei käivita `server.js` faili. Sellepärast kasutab leht staatilises režiimis faili `input/tasks.json`, kust saab teada, millised ülesanded ja lahendusfailid tuleb laadida.

## Input-kausta struktuur

Ülesanded asuvad `input/` kaustas numbriliste alamkaustadena.

```text
input/
  001/
    assignment.md
    index.html
    style.css
    script.js
  tasks.json
```

Igas ülesande kaustas peab olema `assignment.md`. Lahendusfailid võivad olla samas kaustas või alamkaustades. Rakendus ignoreerib näiteks `.git`, `node_modules` ja `vendor` kaustu.

Kui lisad GitHub Pages versiooni jaoks uue ülesande, lisa see ka faili `input/tasks.json`, näiteks:

```json
{
  "id": "002",
  "title": "Uue ülesande nimi",
  "files": ["index.html", "style.css", "script.js"]
}
```

## AI küsimuste genereerimise loogika

AI-le mõeldud prompt asub failis `prompts/question-generation.md`.

Praegu teeb `server.js` funktsioon `generateQuestions()` simuleeritud küsimused valitud ülesande kirjelduse ja failide põhjal. See tuvastab kasutatud tehnoloogiad, loeb lahendusfailide nimed ja otsib sisust teemasid nagu `addEventListener`, `localStorage`, `fetch`, `JSON` ja `innerHTML`.

Hiljem saab selle koha asendada päris AI API päringuga, millele antakse kaasa:

- `assignment.md` sisu;
- lahendusfailide sisu;
- nähtav prompt;
- nõue tagastada 15 küsimust JSON kujul.

## Mängu reeglid

- Mängus on 15 küsimust.
- Igal küsimusel on 4 vastusevarianti.
- Ainult üks vastus on õige.
- Küsimused lähevad lihtsamast raskemaks.
- Vale vastus lõpetab mängu.
- Tulemus langeb viimasele saavutatud turvatasemele.
- Turvatasemed on 1 000, 32 000 ja 1 000 000 punkti.
- Mängus on õlekõrred 50:50, AI vihje ja publik.

## Teadaolevad piirangud

- Päris AI API ühendust veel ei ole.
- Küsimused on simuleeritud ja tuginevad lihtsale failide analüüsile.
- Tulemusi ei salvestata andmebaasi.
- Kasutajate süsteemi ja õpetaja vaadet ei ole.

## Edasiarenduse võimalused

- Lisada päris AI API ühendus.
- Salvestada genereeritud küsimused vahemällu.
- Salvestada mänguajalugu ja tulemused.
- Lisada õpetaja vaade ülesannete lisamiseks.
- Kuvada Markdown ilusamas vormingus.
- Lisada koodile süntaksivärvimine.

## Arendusprotsess

Product backlog, kasutajalood, Definition of Done ja testimise kirjeldus on failis `docs/backlog.md`.
