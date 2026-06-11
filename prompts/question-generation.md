# AI küsimuste genereerimise prompt

Koosta täpselt 15 valikvastustega küsimust miljonimängu stiilis.

Küsimused peavad põhinema valitud ülesande `assignment.md` failil ja sama ülesande lahendusfailidel. Küsimused ei tohi kontrollida ainult mälu või failinimesid, vaid peavad kontrollima, kas õppija mõistab lahenduse loogikat, kasutatud tehnoloogiaid, nõuetele vastavust, võimalikke vigu ja erijuhtumeid.

Nõuded:

- Küsimusi on täpselt 15.
- Igal küsimusel on täpselt 4 vastusevarianti.
- Ainult üks vastusevariant on õige.
- Küsimused 1-5 on lihtsad, 6-10 keskmised ja 11-15 rasked.
- Igal küsimusel on lühike selgitus, miks õige vastus on õige.
- Vastus peab olema JSON-massiiv.

JSON kuju:

```json
[
  {
    "level": 1,
    "difficulty": "lihtne",
    "question": "Milleks kasutatakse selles lahenduses JavaScripti?",
    "options": [
      "Lehe kujundamiseks",
      "Kasutaja tegevustele reageerimiseks",
      "Serveri operatsioonisüsteemi muutmiseks",
      "Pildi suuruse vähendamiseks"
    ],
    "correctIndex": 1,
    "explanation": "JavaScript reageerib kasutaja tegevusele ja muudab tulemust lehel."
  }
]
```
