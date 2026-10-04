# Animazioni personali di Iris Notch

In questa cartella puoi mettere le tue animazioni per gli occhi di Iris. Ognuna è un file **`.json`**: una descrizione di come si muovono gli occhi e qualche forma, **non codice**. Per questo sono sicure: un'animazione presa da internet non può fare altro che muovere occhi e forme.

L'app legge la cartella all'avvio e quando premi **Impostazioni → Debug e prove → Ricarica**. Lì c'è anche **Prova le mie animazioni**, che le fa partire una dopo l'altra.

## Come funziona, in breve

- Un'animazione dura `durata` millisecondi (da 1000 a 30000).
- Il tempo si scrive da **0** (inizio) a **1** (fine): `"t": 0.5` è a metà.
- Si scrivono solo i **momenti chiave**; i passaggi in mezzo li calcola l'app, con un movimento morbido.
- Le posizioni sono in **percentuale dell'area delle animazioni** (il rettangolo nero dell'isola chiusa, dentro il bordo):

```
 x:  0 ─────────────── 42 ── 58 ─────────────── 100
 y:  0  (in alto)
     50          ●        ●            ← gli occhi: sinistro a x 42, destro a x 58, y 50
    100 (in basso)
```

  Valori fuori da 0-100 vanno bene: la forma entra o esce dall'area (per esempio `"y": 110` parte da sotto).
- L'area è larga circa **5 volte** quanto è alta: 10 punti in orizzontale sono molto più lunghi di 10 in verticale.

## Il file

```json
{
  "nome": "Il nome che vuoi",
  "durata": 5000,
  "colore_occhi": "#f9a8d4",
  "quando": { "date": ["12-25", "07-01..07-15"], "ore": "20:00-23:59" },
  "occhi":    [ { "t": 0 }, { "t": 0.5, "sorriso": 0.6 }, { "t": 1 } ],
  "sinistro": [ ... ],
  "destro":   [ ... ],
  "oggetti":  [ { "forma": "cuore", "colore": "#fb7185", "dimensione": 6, "chiavi": [ ... ] } ]
}
```

| Campo | Cosa fa |
|---|---|
| `nome` | il nome mostrato nell'elenco |
| `durata` | millisecondi, da 1000 a 30000 (di solito 4000-8000) |
| `colore_occhi` | colore degli occhi durante l'animazione, `#rrggbb` (facoltativo) |
| `quando` | facoltativo. `date`: giorni `"MM-GG"` o intervalli `"MM-GG..MM-GG"`; `ore`: `"HH:MM-HH:MM"`. Senza `quando`, l'animazione entra tra le **sorprese di tutti i giorni**; con `quando`, parte solo in quei giorni o in quelle ore (6 volte su 10 al posto delle altre sorprese) |
| `occhi` | momenti chiave per **tutti e due** gli occhi |
| `sinistro`, `destro` | momenti chiave per **un occhio solo** (vincono su `occhi`), per esempio per fare l'occhiolino |
| `oggetti` | fino a 30 forme che si muovono |

### Momenti chiave degli occhi

| Proprietà | Valori | Effetto |
|---|---|---|
| `t` | 0-1 | quando |
| `dx`, `dy` | percentuale | spostamento dalla posizione normale (`dy` negativo = in su) |
| `larghezza`, `altezza` | 1 = normale (0,2-2,5) | occhi più larghi, più alti o schiacciati |
| `sorriso` | 0-1 | la palpebra di sotto sale: occhi "felici" |
| `palpebra` | 0-1 | la palpebra di sopra scende: 1 = occhio chiuso |
| `inclinazione` | gradi (-45, 45) | occhi inclinati: arrabbiato, triste |
| `visibile` | 0-1 | 0 = occhi spariti |
| `curva` | `"morbido"` (normale), `"lineare"`, `"rimbalzo"` | come si arriva a questo momento dal precedente |

### Gli oggetti

| Campo | Valori |
|---|---|
| `forma` | `"cerchio"`, `"rettangolo"`, `"cuore"`, `"stella"`, `"testo"` |
| `colore` | `#rrggbb` |
| `dimensione` | percentuale della larghezza dell'area (1-40); per il testo è la grandezza delle lettere |
| `testo` | solo per `"testo"`, al massimo 40 caratteri (anche emoji) |
| `dietro` | `true` = la forma passa dietro gli occhi |
| `chiavi` | momenti chiave: `t`, `x`, `y`, `scala` (1 = normale), `rotazione` (gradi), `opacita` (0-1), `curva` |

## Regole

- Un file per animazione, in **UTF-8**, al massimo **64 KB**. Al massimo 50 file nella cartella.
- Il nome del file diventa il suo identificativo: niente spazi né accenti (`mio-saluto.json`).
- Entrata e uscita sono già morbide: all'inizio e alla fine l'app sfuma da sola verso gli occhi normali.
- Gli occhi sono piccoli: movimenti di 5-15 punti bastano. Forme di dimensione 3-8 si vedono bene.
- Se un file ha un errore, l'app lo salta e lo scrive nel log (**Debug e prove → Ultimi errori**).

## Esempio

`esempio-saluto.json`, in questa cartella: gli occhi sorridono, il destro fa l'occhiolino, un cuore sale da sotto, compare "ciao!" e una stellina gira dietro. Copialo con un altro nome e cambialo.
