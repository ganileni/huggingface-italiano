# Il caso Hugging Face — base tecnica dell’edizione italiana

**Stato: anteprima tecnica. Non è ancora una copia integrale né una traduzione completa.**

Progetto destinato al GitHub di Orazio Angelini (`ganileni`). Il progetto originale è [huggingface.wtf](https://huggingface.wtf/), di Lightcone Infrastructure. L’autorizzazione degli autori alla riproduzione integrale è in attesa.

Questa base è scritta da zero. Include cinque pagine statiche, una griglia illustrativa originale, una cronologia navigabile, ricerca e filtri per un archivio bilingue, schede delle fonti, un glossario e una vista per la stampa. Contiene una breve sintesi originale; i capitoli tradotti e le citazioni sono ancora vuoti. **La griglia non rappresenta dati storici dei singoli agenti.** Nessun file, audio, immagine o codice del sito originale è incluso.

## Uso

Richiede Node.js 20 o successivo; nessuna dipendenza da installare.

```sh
npm run check
node scripts/verify-output.mjs
```

Il risultato è nella cartella `docs/`. Deve essere servito via HTTP per caricare il catalogo JSON; l’apertura diretta da `file://` non è supportata.

## GitHub Pages

La struttura è pronta per la pubblicazione da un ramo del repository: impostare **Settings → Pages → Deploy from a branch**, selezionare il ramo con questi file e la cartella `/docs`. Tutti i percorsi sono relativi, quindi il sito funziona anche sotto `https://ganileni.github.io/NOME-REPOSITORY/`.

Repository: [ganileni/huggingface-italiano](https://github.com/ganileni/huggingface-italiano). La cartella `docs/` contiene la bozza destinata a GitHub Pages.

## Inserimento della traduzione autorizzata

I contenuti risiedono in `src/content.it.json`; interfaccia e testi sono separati. Dopo l’autorizzazione, inserire la traduzione, aggiungere i dati storici verificati e adattare il modello ai sorgenti effettivi degli autori. Le citazioni mantengono originale, traduzione e riferimento alla fonte. Non usare la griglia dimostrativa per rappresentare dati reali.

Esempio del formato di un capitolo, con testo di esempio scritto per questa documentazione:

```json
{
  "id": "capitolo-esempio",
  "title": "Titolo del capitolo",
  "date": "2026-07-08",
  "paragraphs": ["Testo italiano approvato."],
  "details": [{"title": "Approfondimento", "paragraphs": ["Spiegazione aggiuntiva."]}],
  "quoteIds": [],
  "sourceIds": ["metr"]
}
```

Formato di una citazione, con testo fittizio usato soltanto per illustrare lo schema:

```json
{
  "id": "citazione-esempio",
  "agent": "IDENTIFICATIVO",
  "type": "Ragionamento interno",
  "original": "Example text for the schema.",
  "italian": "Testo di esempio per lo schema.",
  "context": "Contesto verificato della citazione.",
  "sourceId": "metr",
  "status": "da-rivedere",
  "tags": []
}
```

Per controllare i requisiti della versione completa: `node scripts/build.mjs --publish`. Il controllo segnala autorizzazione, capitoli e citazioni mancanti. Il normale comando di build crea invece la bozza, esplicitamente marcata come anteprima e non indicizzabile.

## Verifiche

Test automatici per ricerca bilingue, accenti, combinazione dei filtri, validità dei riferimenti, URL esterni e distinzione fra bozza e versione completa. Verifica dei collegamenti relativi su tutte le pagine esportate. L’interfaccia tratta i testi importati come testo, evitando l’esecuzione di HTML inserito nei contenuti.

## Da completare

- Riproduzione e traduzione integrale dopo l’autorizzazione.
- Importazione dell’intero archivio delle citazioni e delle fonti.
- Dati reali e interazioni specifiche della visualizzazione originale.
- Audio italiano, se richiesto: il prototipo non include né riproduce l’audio inglese.
- Confronto puntuale con il sito originale, revisione linguistica insieme a Orazio e pubblicazione su GitHub Pages.

Non viene attribuita alcuna licenza ai contenuti di Lightcone o alle fonti esterne.
