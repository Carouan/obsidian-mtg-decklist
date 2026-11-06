# Validation — petits blocs et cartes recto-verso

Cette note est conçue pour **Obsidian sur Android et ordinateur**. Elle teste les deux correctifs sans modifier vos decks existants.

## 1. Index compact des extensions

```extension-index
language: fr
view: gallery
group: block
sort: date-asc
search: Urza
```

**À contrôler :** dans chaque petit encadré, le symbole et le nom de l'extension ne sortent plus de leur boîte. Les noms trop longs sont limités à trois lignes ; le nom complet se trouve dans l'infobulle. Sur un grand écran, trois blocs peuvent apparaître côte à côte ; sur téléphone, une colonne est normale.

## 2. Cartes qui ont vraiment deux faces

```decklist
language: fr
view: gallery
group: auto
legality: off
# Deck principal
1 Delver of Secrets
1 Fable of the Mirror-Breaker
1 Bala Ged Recovery
1 Island
```

**À contrôler :** les cartes recto-verso ont une petite icône de retournement. Cliquer dessus alterne les images sans modifier le nom ou la quantité de la carte. Au toucher, les boutons **Recto** et **Verso** permettent de changer de face dans la grande prévisualisation. Sur ordinateur, les deux faces sont visibles côte à côte au survol.

## 3. Ne pas inventer de verso

```decklist
language: en
view: gallery
group: auto
legality: off
# Deck
1 Wear // Tear
1 Brazen Borrower
1 Island
```

Les cartes split ou Adventure sont imprimées sur une seule face : elles ne devraient pas recevoir un bouton « Retourner ».

## 4. Galerie d'éditions

```cardlist
language: fr
card: Delver of Secrets
view: gallery
unique: prints
```

**À contrôler :** les éditions possédant réellement deux faces peuvent afficher l'autre face, même dans l'explorateur. Les anciennes impressions et leurs visuels français/anglais restent respectés.
