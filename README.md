# Il caso Hugging Face — edizione italiana non ufficiale

Traduzione italiana di [huggingface.wtf](https://huggingface.wtf/), progetto di **Lightcone Infrastructure** a cura di Raymond Arnold e collaboratori. La versione italiana non è stata revisionata dagli autori originali.

**Sito:** https://ganileni.github.io/huggingface-italiano/

## Contenuti e comportamento

La copia conserva il lettore, le griglie e la cronologia interattiva originali, i dati degli agenti, le schede, l’archivio filtrabile delle citazioni, i riferimenti alle fonti e la vista per la stampa. Il testo principale, le citazioni rese in linguaggio accessibile, le conversazioni, le definizioni e l’interfaccia sono tradotti in italiano. Il testo originale delle citazioni resta consultabile e invariato.

I documenti delle fonti restano nella lingua originale. Le copie statiche ne consentono lettura e ricerca su GitHub Pages senza usare le API del sito originale. Le parti del lettore che modificano i documenti originali sono disattivate. Le posizioni illustrative già presenti nell’originale conservano le rispettive indicazioni: non vengono aggiunti dati inventati.

Il pulsante **Ascolta in italiano** usa la sintesi vocale del dispositivo, se disponibile. La registrazione originale in inglese rimane accessibile e indicata come tale. La funzione di stampa consente di salvare il testo italiano in PDF dal browser.

## Scelte di traduzione

- I nomi propri e gli identificativi degli agenti restano invariati.
- *Reinforcement learning*, *flag* e altri termini tecnici restano in inglese quando è la scelta naturale nel settore; il testo ne spiega il significato dove serve.
- *Hugging Face Incident* è reso come **caso Hugging Face**, con **attacco** o **intrusione** nei contesti specifici.
- *Chain of thought* è reso come **ragionamento interno**. *Poisoned* si riferisce alla compromissione della valutazione, non a un avvelenamento letterale.
- Incertezze, limiti delle prove, attribuzioni e divergenze tra le fonti vengono conservati.

## Costruzione e verifiche

Richiede Node.js 20 o successivo e Python 3.12 o successivo.

```sh
npm ci --ignore-scripts
npm run check
```

La costruzione estrae l’archivio suddiviso in `upstream/snapshot.tar.gz.part-*` quando necessario e genera `docs/`. Il controllo verifica completezza della traduzione, integrità delle trascrizioni originali e dei dati storici, conservazione dei passaggi citati, percorsi locali e sintassi JavaScript.

Il sito deve essere servito via HTTP o HTTPS; l’apertura diretta da `file://` non è supportata. Alcune funzioni dell’applicazione originale richiedono un contesto HTTPS.

GitHub Actions costruisce, verifica e pubblica il sito ad ogni modifica a `main`. In **Settings → Pages**, la sorgente di pubblicazione è **GitHub Actions**.

## Organizzazione

- `translations/catalogue.json`: unità di traduzione con testo originale e contesto.
- `translations/output-*.json`: traduzioni per identificativo.
- `translations/manual.json` e `review-story*.json`: scelte condivise e correzioni di revisione.
- `translations/astra-style.json`: prima revisione dei tempi verbali e dello stile delle schede degli agenti e dei tooltip.
- `translations/second-pass-*.json`: seconda revisione dei tempi verbali, della naturalezza e delle espressioni temporali.
- `scripts/localise.py`: trasformazioni che separano traduzione, dati e prove originali.
- `src/italiano-boot.js`: adattamento della navigazione e delle letture di dati a un sito statico, più lettura vocale italiana.
- l’archivio suddiviso in `upstream/snapshot.tar.gz.part-*`: copia congelata delle risorse pubbliche utilizzate, acquisita il 24 ottobre 2026 per la riproduzione autorizzata.

Il catalogo contiene anche stringhe tecniche che devono restare invariate. La copertura include quindi traduzioni e invarianti verificati; non è un conteggio dei soli brani in italiano.

Questa versione è predisposta per la revisione con Orazio e per proporre agli autori l’integrazione della traduzione. Nessuna licenza viene attribuita ai materiali originali o alle fonti esterne.

## Originali e note di traduzione

Gli estratti delle footnote sono disponibili in italiano, con l’originale inglese espandibile e il collegamento alla fonte conservato. Ognuna delle 228 citazioni degli agenti, inclusi messaggi pubblicati e ragionamenti interni, ha un richiamo «Originale e note di traduzione»: distingue trascrizioni, parafrasi ed esempi ricostruiti e documenta le scelte linguistiche. Le stesse note compaiono nella versione per la stampa.

- `translations/footnotes-*.it.json`: 192 estratti, con originali esatti e traduzioni.
- `translations/quote-annotations.json`: revisione delle citazioni e commenti alle traduzioni di tutte le 228 citazioni, compresi i 111 ragionamenti interni.
- `scripts/annotations.py` e `src/italiano-note.js`: collegamento tra resa italiana, originale e note.

## Seconda revisione

I report della lettura monolingue, svolta prima di consultare gli originali, e le decisioni successive sono raccolti in [revisioni/2026-10-24](revisioni/2026-10-24/README.md).
