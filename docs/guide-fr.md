# MTG Decklist — Guide rapide en français

Ce guide présente les fonctions du plugin Obsidian **MTG Decklist**, notamment les noms et prévisualisations de cartes en français. Pour l'installation et la référence complète des syntaxes, consulter le [README principal](../README.md).

## Choisir la langue et la qualité des images

1. Dans Obsidian, ouvrir **Paramètres → Modules complémentaires → MTG Decklist**.
2. Dans **Langue des cartes et de l'interface**, sélectionner **Français**. Les titres, statistiques, paramètres, messages et images de cartes sont alors affichés en français quand c'est possible.
3. Dans **Qualité des images**, choisir **Grande** ou **PNG (qualité maximale)**. Les aperçus utilisent les fichiers de Scryfall : un scan d'origine en basse résolution restera flou, même en PNG.
4. Rouvrir la note pour actualiser les decks déjà affichés. Désactiver puis réactiver le plugin si les commandes de la palette conservent leur ancien libellé.

> **À savoir :** l'affichage utilise les impressions françaises disponibles dans Scryfall. Une carte sans impression française reste en anglais. Si plusieurs éditions françaises existent, le plugin privilégie un véritable scan haute définition, sauf si une édition précise est demandée.

## Écrire un deck avec une réserve

Dans une note Obsidian, insérer ce bloc de code Markdown :

````markdown
```decklist
language: fr
group: auto
legality: off

# Deck principal
4 Lightning Bolt
4 Spark Elemental
4 Hellspark Elemental
4 Thermo-Alchemist
20 Mountain

# Réserve
2 Pyroclasm
2 Browbeat

# Cartes envisagées
2 Ball Lightning
```
````

Il s'agit d'un **exemple de syntaxe**, pas d'une liste complète à jouer en tournoi.

- Les lignes `4 Lightning Bolt` désignent quatre exemplaires de la même carte. **Conserver les noms Oracle anglais dans la source** assure un fonctionnement fiable avec Scryfall et les exports.
- `language: fr` demande le rendu français **pour ce bloc seulement**. Cette directive ne traduit pas les paramètres généraux ni les liens de cartes insérés ailleurs dans la note.
- `# Réserve` correspond à `# Sideboard` et `# Cartes envisagées` à `# Maybeboard`. Les mots-clés anglais restent acceptés.
- `group: auto` regroupe le deck principal en **Créature**, **Éphémère**, **Terrain**, etc. Sans regroupement automatique, les titres personnalisés sont respectés.
- La réserve peut être repliée par défaut via le paramètre **Replier la réserve par défaut**.

## Exemple Commander

````markdown
```decklist
language: fr
group: auto

# Commandant
1 Torbran, Thane of Red Fell

# Deck principal
1 Thermo-Alchemist
1 Guttersnipe
10 Mountain
```
````

Le plugin reconnaît `# Commandant` comme `# Commander`. L'exemple est volontairement incomplet : **un véritable deck Commander contient 100 cartes, commandant inclus**. Il n'est pas nécessaire de passer par le mode Lecture : le plugin peut afficher les blocs en aperçu en direct.

## Choisir une édition précise

```text
1 Lightning Bolt (M10) 146
```

Le code `(M10) 146` fixe l'édition et le numéro de collection. Le plugin recherche d'abord **cette impression précise** dans la langue souhaitée. Si son image française est basse résolution, il respecte néanmoins ton choix d'édition. Lorsqu'il n'existe pas de version française pour cette édition, il peut sélectionner une autre impression française.

## Cartes et combos dans les notes

- Une carte interactive : `` `mtg:Lightning Bolt` `` (avec un accent grave de chaque côté).
- Un libellé choisi : `[Foudre](mtg:Lightning Bolt)`.
- Les symboles `{R}`, `{2}{U}` et autres codes de mana peuvent être rendus automatiquement.
- Les blocs `combo` acceptent des clés françaises comme `nom:`, `résultat:`, `étapes:`, `boucle:` et `sortie:` (les clés anglaises restent valables).

## Si quelque chose reste en anglais

Vérifier **Langue des cartes et de l'interface = Français**, puis rouvrir la note. Les cartes dont Scryfall ne fournit pas d'impression française, les textes personnels saisis dans la note et certains noms propres restent volontairement inchangés. Les exports vers Moxfield et Arena conservent les identifiants et noms anglais nécessaires à leur compatibilité.

## Vues dynamiques : galerie, tri et explorateur d'extensions

Chaque rendu `decklist` possède désormais deux menus dans son en-tête : **tri par nom / mana / ordre source** et **affichage en liste / galerie**. Le choix n'écrit rien dans le Markdown. Pour ouvrir directement en galerie, ajouter `view: gallery` au début d'un bloc `decklist`.

Le bloc `extension` permet de chercher les cartes d'une extension sans les charger toutes à l'ouverture de la note :

````markdown
```extension
language: fr
set: mir
color: red
type: creature
view: gallery
sortby: color
```
````

- **Avant le chargement**, choisir les couleurs avec les **symboles de mana**, le type et la rareté. Cliquer sur **Afficher les cartes** : les filtres sont envoyés directement à Scryfall. Le symbole rouge seul donne des cartes **exclusivement rouges** ; le filtre **Multicolore** est séparé. Plusieurs couleurs sélectionnées fonctionnent comme un « OU ».
- **Après le chargement**, passer de la liste à la galerie et réorganiser les cartes. Les boutons **Page précédente** et **Page suivante**, en haut et en bas, naviguent par groupes de **24 cartes par défaut**. Le nombre de cartes par page (8 à 60) et le nombre de colonnes de la galerie (4 par défaut sur ordinateur) sont personnalisables dans **Paramètres → MTG Decklist → Explorateur de cartes et d'extensions**. Les images ne sont chargées qu'au moment de leur affichage à l'écran.
- Le bouton **Rechercher une extension** ouvre un **menu déroulant** contenant les extensions répertoriées par Scryfall, filtrable en saisissant du texte dans le champ de recherche. Certains noms français sont reconnus, notamment **Terres natales = Homelands (HML)**. Mirage utilise le code **MIR**. Les noms des autres extensions restent en anglais lorsqu'aucun alias français n'est renseigné.
- Une **icône Copier sur chaque carte**, dans le coin supérieur gauche en galerie, fournit une ligne utilisable dans un deck au format `1 Card Name (SET) numéro`. En mode liste, le bouton reste écrit en toutes lettres.
- En français, le visuel exact de l'édition est demandé à Scryfall. Si l'API possède le **nom imprimé français** mais seulement une image de remplacement (fréquent pour **Homelands / Terres natales**), le nom est affiché en français **sous le véritable visuel anglais**. On conserve l'édition exacte sans prétendre fournir une image française qui n'existe pas chez Scryfall.

Pour retrouver les éditions d'une carte :

````markdown
```cardlist
language: fr
card: Foudre
unique: set
view: gallery
```
````

`unique: set` affiche une impression représentative par extension. `unique: prints` conserve les variantes d'impression. Les boutons **Page précédente** et **Page suivante** évitent de télécharger toutes les éditions d'un coup. Le nombre total de pages peut rester inconnu tant que toutes les variantes d'une carte n'ont pas été parcourues. Les données de recherche sont conservées temporairement en mémoire (pas comme images PNG dans le coffre).

## Index visuel des extensions et indicateurs de légalité

### Qualité des scans et textes des cartes

Dans **Paramètres → MTG Decklist → Image preference** (*Préférence pour les images* en français),
deux choix sont proposés :

- **Priorité aux images HD lisibles** (défaut) : si Scryfall classe un scan français
  comme de basse résolution ou comme image de remplacement, et que l'impression
  anglaise correspondante possède un scan HD confirmé, l'illustration anglaise
  remplace l'image floue. Le **nom français** est conservé.
- **Priorité aux images dans la langue choisie** : afficher la version française
  même si la numérisation est de mauvaise qualité.

Le paramètre **Qualité de l'image** (`normal`, `large`, `png`) reste indépendant :
agrandir un scan de mauvaise qualité ne crée pas de détails supplémentaires.

Pour lire une carte, **cliquer sur son image dans une galerie**, puis sur
**Afficher le texte**. Le panneau distingue clairement :

- le **texte imprimé traduit**, disponible selon les données de l'édition,
  qui peut être ancien ou incomplet ;
- le **texte Oracle anglais**, de référence pour les règles actuelles.

Le texte Oracle est redemandé à Scryfall **uniquement lors de l'ouverture
du panneau de texte**, avec un cache mémoire court. Si la requête échoue,
le panneau indique que la version en cache n'a pas été vérifiée. Pour les
cartes recto-verso, le texte suit la face sélectionnée ; pour les cartes
*split* et *Adventure*, les deux descriptions s'affichent.

Il n'existe pas, dans cette API, de « texte Oracle français officiel »
automatiquement corrigé : il ne faut donc pas confondre une traduction
imprimée avec le texte Oracle à jour. Aucune traduction automatique n'est
présentée comme officielle.

Le bloc `extension-index` présente toutes les extensions avec un tableau ou une **galerie organisée par blocs** :

````markdown
```extension-index
language: fr
view: gallery
group: block
sort: date-desc
ub: exclude
format: all
funny: false
digital: false
```
````

- **Affichage** : tableau ou galerie. Dans un panneau suffisamment large, la galerie comporte **trois petits blocs par rangée**. Chaque bloc historique affiche son titre, ses dates extrêmes en *mois/année* et **trois petites fiches d'extensions par rangée** avec leurs vrais symboles Scryfall, leur nom et leur code. Sur mobile, les blocs se redisposent sur deux ou une colonne.
- **Tris** : par date décroissante ou croissante, par nom, ou par nombre de cartes.
- **Filtres** : catégorie Scryfall, recherche par nom ou bloc, Universes Beyond (tous, masquer les identifiés, uniquement les identifiés), produits humoristiques (masqués par défaut) et produits numériques.
- **Formats** : *Standard*, *Pioneer*, *Modern*, *Legacy*, *Vintage*, *produits Commander*. **Attention** : ce sont des repères indicatifs fondés sur la période ou la catégorie de publication, **pas une preuve de légalité de chaque carte**. Les rotations, exceptions et bannissements sont à vérifier au niveau des cartes.
- Les noms français de blocs et la classification de certains produits Universes Beyond proviennent d'un petit fichier JSON complémentaire. Les codes, dates, nombres de cartes et vrais symboles SVG proviennent toujours de Scryfall.
- Un clic sur une édition ouvre son explorateur de cartes. **Retour à l'index** permet de revenir à la navigation.

Pour les cartes, `legality: commander` dans un deck ou `format: modern` dans un bloc `extension` active les **pictogrammes Interdite / Restreinte / Hors format**. Ils utilisent le champ `legalities` de Scryfall ; il n'y a pas de liste locale de cartes bannies à mettre à jour manuellement.

## Raccourcis de modèles intégrés

Sur une ligne vide dans l'éditeur, taper `deck-cmd-fr`, `deck-cmd-auto-fr`, `deck-60-fr`, `deck-vintage-en`, `foudre-ext`, `ext-mirage` ou `ext-index-fr`, puis sélectionner la suggestion proposée avec Entrée ou un clic. Le raccourci est alors remplacé par le bloc Markdown correspondant. **Aucun module Templater n'est nécessaire.** Le texte n'est jamais remplacé automatiquement sans validation.

Pour signaler un problème, joindre le bloc `decklist` concerné (sans données privées), la version du plugin et, si possible, une capture d'écran dans une [issue GitHub](https://github.com/Ekrizdis367/obsidian-mtg-decklist/issues).

## Cartes recto-verso et affichage compact

Les galeries distinguent les cartes physiquement **recto-verso** (transform, modal double-faced, cartes réversibles, jetons recto-verso) des cartes **split**, **Adventure** et **flip**, imprimées sur une seule face. Les vraies cartes recto-verso disposent d’un petit bouton de retournement sur leur vignette.

Dans l’aperçu desktop, les deux faces sont présentées côte à côte ; sur mobile, toucher la carte ouvre l’aperçu avec deux boutons **Recto** et **Verso**. Le choix de l’image ne change pas la référence de la carte, la légalité ou la liste du deck.

Dans la galerie compacte des blocs d’extensions, les symboles restent dans leur case, les noms trop longs sont limités à trois lignes, et la vignette n’affiche qu’un nom (français lorsqu’il existe). Le nom bilingue complet reste dans l’infobulle.
