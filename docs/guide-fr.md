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
- **Après le chargement**, passer de la liste à la galerie et réorganiser les cartes. Les boutons **Page précédente** et **Page suivante**, en haut et en bas, naviguent par groupes de 24 cartes. Les images ne sont chargées qu'au moment de leur affichage à l'écran.
- Le bouton **Rechercher une extension** propose des noms et codes d'extension. Mirage utilise le code **MIR**.
- Une **icône Copier sur chaque carte**, dans le coin supérieur gauche en galerie, fournit une ligne utilisable dans un deck au format `1 Card Name (SET) numéro`. En mode liste, le bouton reste écrit en toutes lettres.
- En français, le visuel exact de l'édition est demandé à Scryfall ; s'il n'existe pas en français **ou s'il est seulement fourni sous forme d'image de remplacement**, son visuel anglais est conservé pour ne pas confondre les extensions.

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

## Raccourcis de modèles intégrés

Sur une ligne vide dans l'éditeur, taper `deck-cmd-fr`, `deck-cmd-auto-fr`, `deck-60-fr`, `deck-vintage-en`, `foudre-ext` ou `ext-mirage`, puis sélectionner la suggestion proposée avec Entrée ou un clic. Le raccourci est alors remplacé par le bloc Markdown correspondant. **Aucun module Templater n'est nécessaire.** Le texte n'est jamais remplacé automatiquement sans validation.

Pour signaler un problème, joindre le bloc `decklist` concerné (sans données privées), la version du plugin et, si possible, une capture d'écran dans une [issue GitHub](https://github.com/Ekrizdis367/obsidian-mtg-decklist/issues).
