# Product backlog ja arendusprotsess

## Töövoog

Kanban-tabeli etapid: Backlog, Todo, In progress, Review/Test, Done.

## Kasutajalood

### Õppijana tahan näha ülesannete nimekirja, et valida harjutus, mille kohta mängida.

Vastuvõtutingimused:

- `input/` kausta numbrilised alamkaustad kuvatakse kasutajale.
- Ülesande nimi võetakse `assignment.md` esimesest pealkirjast.
- Valik töötab vähemalt ühe näidisülesandega.

### Õppijana tahan vastata 15 valikvastustega küsimusele, et kontrollida enda arusaamist.

Vastuvõtutingimused:

- Mängus on 15 küsimust.
- Igal küsimusel on 4 vastusevarianti.
- Vale vastus lõpetab mängu.
- Õige vastus lubab liikuda järgmisele küsimusele.

### Õppijana tahan näha selgitust, et aru saada, miks vastus oli õige või vale.

Vastuvõtutingimused:

- Pärast vastamist kuvatakse lühike selgitus.
- Vale vastuse korral kuvatakse lõpptulemus.

### Õpetajana tahan lisada ülesandeid `input/` kausta, et kasutada sama rakendust mitme tööga.

Vastuvõtutingimused:

- Uus ülesanne lisatakse eraldi numbrilisse alamkausta.
- Alamkaustas peab olema `assignment.md`.
- Lahendusfailid võivad olla alamkaustades.

### Õppijana tahan kasutada õlekõrsi, et mäng oleks miljonimängu moodi.

Vastuvõtutingimused:

- Olemas on 50:50.
- Olemas on AI vihje.
- Olemas on publiku hääletus.

## Definition of Done

- Rakendus käivitub käsuga `node server.js`.
- Vähemalt üks näidisülesanne on `input/` kaustas.
- Ülesannete nimekiri, ülesande valik ja mänguvaade töötavad.
- Küsimuste genereerimise koht on koodis eraldi olemas.
- README kirjeldab käivitamist, reegleid, piiranguid ja edasiarendust.
- Põhivoog on käsitsi testitud.

## Iteratsioonid

1. Loodi projektistruktuur ja Node.js server.
2. Lisati `input/` kausta lugemine ja näidisülesanne.
3. Lisati küsimuste simuleeritud genereerimine.
4. Ehitati mänguloogika, punktid ja turvatasemed.
5. Lisati õlekõrred ning dokumentatsioon.

## Testimise kokkuvõte

Käsitsi kontrollitav põhivoog:

1. Käivita `node server.js`.
2. Ava `http://localhost:3000`.
3. Vali ülesanne `001 - JavaScripti kalkulaator`.
4. Genereeri küsimused ja vasta vähemalt ühele küsimusele õigesti.
5. Kontrolli, et vale vastus lõpetab mängu ja kuvab turvataseme põhise tulemuse.
