# MTG Decklist — Guide pratique interactif

> [!abstract] Bienvenue
> Cette note est un **tutoriel utilisable directement dans Obsidian**, pas seulement une documentation à lire. Les encadrés de cartes, les galeries et les listes ci-dessous sont de vrais exemples du plugin.
>
> **Pour essayer :** ouvre la note en **Aperçu en direct** ou en mode **Lecture**. Les cartes et symboles sont récupérés auprès de [Scryfall](https://scryfall.com/) ; une connexion Internet est donc utile lors du premier chargement.
>
> Tu peux modifier les exemples dans une **copie** de cette note pour construire tes propres listes.

## Sommaire

1. [Configurer la langue et les images](#1-configurer-la-langue-et-les-images)
2. [Construire un deck : liste, galerie, tri et sections](#2-construire-un-deck--liste-galerie-tri-et-sections)
3. [Commander, réserve, cartes envisagées et éditions précises](#3-commander-réserve-cartes-envisagées-et-éditions-précises)
4. [Légalité : bannissements et restrictions](#4-légalité--bannissements-et-restrictions)
5. [Explorer une extension et paginer les cartes](#5-explorer-une-extension-et-paginer-les-cartes)
6. [Retrouver toutes les impressions d'une carte](#6-retrouver-toutes-les-impressions-dune-carte)
7. [Index des extensions : blocs historiques et filtres](#7-index-des-extensions--blocs-historiques-et-filtres)
8. [Cartes recto-verso et texte Oracle](#8-cartes-recto-verso-et-texte-oracle)
9. [Symboles de mana et liens vers les cartes dans une note](#9-symboles-de-mana-et-liens-vers-les-cartes-dans-une-note)
10. [Documenter une combo](#10-documenter-une-combo)
11. [Modèles rapides, import et export de decks](#11-modèles-rapides-import-et-export-de-decks)
12. [Réglages, limites et ressources](#12-réglages-limites-et-ressources)

---

## 1. Configurer la langue et les images

Dans **Paramètres → Modules complémentaires communautaires → MTG Decklist** :

- **Langue des cartes : Français**. Le plugin traduit les éléments de son interface ainsi que les noms et impressions lorsqu'une traduction est disponible.
- **Préférence pour les images : Priorité aux images HD lisibles** (recommandé). Un scan français reconnu comme basse résolution est remplacé par l'image anglaise **seulement si Scryfall confirme sa bonne qualité**. Le nom français reste visible.
- **Priorité aux images dans la langue choisie** : option pour garder le scan français, même si son texte est flou.
- **Qualité des images** : `Normal`, `Large` ou `PNG`. Cette option concerne la taille téléchargée : elle ne transforme pas un scan flou en haute définition.
- **Nombre de cartes par page** : 24 par défaut, personnalisable.
- **Colonnes des galeries** : 4 par défaut sur les panneaux assez larges ; le plugin réduit automatiquement le nombre de colonnes sur mobile.

> [!tip] À savoir
> Les noms des cartes dans les listes sources sont normalement écrits en **anglais**, car ce sont les identifiants Oracle les plus fiables pour les imports et exports. La **présentation** peut rester en français.

## 2. Construire un deck : liste, galerie, tri et sections

Un bloc `decklist` transforme une liste de cartes en affichage dynamique. Les nombres indiquent les quantités. Voici un petit **mono-rouge d'exemple**, volontairement incomplet :

```decklist
language: fr
group: auto
view: gallery
sort: name
legality: off

# Deck principal
4 Lightning Bolt
4 Spark Elemental
4 Hellspark Elemental
4 Thermo-Alchemist
4 Brute Force
4 Fling
8 Mountain

# Réserve
2 Pyroclasm
2 Browbeat

# Cartes envisagées
2 Ball Lightning
```

**À essayer dans le rendu ci-dessus :**

1. Passe de **Galerie** à **Liste** sans modifier le texte Markdown.
2. Change le tri entre **Nom**, **Valeur de mana** et **Ordre d'origine**.
3. Clique sur **Créatures**, **Éphémères**, **Terrains** ou **Réserve** pour replier/déplier les sections.
4. Sur ordinateur, survole une carte pour l'aperçu rapide ; clique sur l'image en galerie pour l'ouvrir en grand. Sur mobile, touche-la.
5. Consulte la courbe de mana et les statistiques sous le deck lorsque l'option est activée.

Les paramètres `group: auto` et `group: manual` distinguent le regroupement automatique par type du respect de tes en-têtes `# ...`. En `group: respect-manual`, les en-têtes manuels sont utilisés lorsqu'ils existent.

## 3. Commander, réserve, cartes envisagées et éditions précises

Un bloc avec la section **`# Commandant`** reconnaît automatiquement le commandant et l'identité de couleur. Voici un *mini-deck de démonstration* (ce n'est **pas** un deck Commander complet de 100 cartes) :

```decklist
language: fr
group: manual
view: list
legality: commander

# Commandant
1 Torbran, Thane of Red Fell

# Créatures
1 Thermo-Alchemist
1 Spark Elemental

# Éphémères
1 Lightning Bolt
1 Brute Force

# Artefacts
1 Sol Ring #ramp

# Terrains
8 Mountain

# Cartes envisagées
1 Firebrand Archer
```

**Éditions précises.** Pour imposer le visuel d'une impression donnée, ajoute `(SET) NUMÉRO` après le nom anglais. Par exemple, la référence `1 Mountain (ONE) 270` indique l'édition **ONE** et le numéro **270**. Ce format est compatible avec les références copiées depuis nos catalogues.

**Rôles des cartes.** Les tags tels que `#ramp`, `#draw`, `#removal`, `#boardwipe`, `#counterspell` et `#wincon` ajoutent de petits pictogrammes informatifs.

La **Réserve** et les **Cartes envisagées** sont des groupes distincts. Leur repli est possible ; il ne change pas les règles du format Commander.

## 4. Légalité : bannissements et restrictions

Le plugin lit les champs `legalities` de Scryfall. Les avertissements distinguent une carte **interdite**, **restreinte**, ou **hors format**. Le statut dépend du format choisi et peut évoluer.

En **Vintage**, *Black Lotus* est restreinte :

```decklist
language: fr
group: auto
view: gallery
legality: vintage
# Deck principal
1 Black Lotus
1 Sol Ring
2 Island
```

En **Commander**, cette même carte est interdite :

```decklist
language: fr
group: auto
view: list
legality: commander
# Deck principal
1 Black Lotus
1 Sol Ring
2 Island
```

Pour supprimer l'indication dans un exemple, utilise `legality: off`. Les avertissements de couleur en Commander sont également liés au choix du commandant.

> [!warning] Formats : deux niveaux différents
> Le **statut d'une carte** dans un format vient de Scryfall. En revanche, le filtre « Modern / Pioneer / Standard » de l'**index des extensions** est un simple repère historique ou catégoriel : il ne garantit pas que toutes les cartes d'un produit sont légales.

## 5. Explorer une extension et paginer les cartes

Le bloc `extension` propose des filtres **avant** de charger les cartes : couleur, type et rareté. La recherche est envoyée à Scryfall avec ces critères pour éviter de récupérer inutilement une énorme extension.

### Mirage : éphémères strictement rouges

```extension
language: fr
set: mir
color: red
type: instant
view: gallery
sortby: color
format: off
```

1. Clique sur **Afficher les cartes**.
2. Le symbole de mana rouge seul signifie **mono-rouge strict** : les multicolores ne sont pas incluses automatiquement. Coche **Multicolore** pour les intégrer si tu le souhaites.
3. Essaie les menus **Type** et **Rareté**, puis relance l'affichage.
4. Passe en mode Liste, change le tri et utilise les boutons **Page précédente / Page suivante** (en haut et en bas).
5. La petite icône **Copier** de chaque carte produit une référence avec son code d'extension et son numéro.

### Terres natales : rechercher avec un nom français

```extension
language: fr
set: Terres natales
type: artifact
view: gallery
sortby: name
```

Scryfall nomme cette édition **Homelands (HML)**. Le plugin reconnaît aussi l'alias français **Terres natales**. Le bouton **Rechercher une extension** ouvre une liste déroulante : efface le champ, saisis par exemple « Terres », puis choisis l'édition correspondante.

Le **nom français** d'une carte peut être connu même lorsqu'il n'existe aucun scan français lisible. Dans ce cas, l'illustration anglaise de la même impression reste utilisée.

## 6. Retrouver toutes les impressions d'une carte

Le bloc `cardlist` affiche les impressions d'une carte à partir de son identité Oracle.

### Une impression représentative par extension

```cardlist
language: fr
card: Foudre
unique: set
view: gallery
sort: set
```

### Toutes les impressions et variantes

```cardlist
language: fr
card: Lightning Bolt
unique: prints
view: list
sort: set
```

Clique sur **Afficher les cartes** dans chaque navigateur. Le mode `unique: set` affiche une impression représentative par extension ; `unique: prints` parcourt les variantes. Le chargement se fait **par pages**, et le bouton Copier agit sur **chaque impression**. Les images utilisent un chargement différé.

## 7. Index des extensions : blocs historiques et filtres

Le bloc `extension-index` exploite le **catalogue JSON de Scryfall**. Il regroupe des extensions selon leur vrai bloc historique et affiche leur **symbole SVG**, leur nom, leur code et la plage des dates de sortie.

### Trois petites fiches dans le bloc Urza

```extension-index
language: fr
view: gallery
group: block
sort: date-asc
search: Urza
ub: all
format: all
funny: false
digital: false
```

Le **Bloc Urza** doit contenir trois éditions : **USG**, **ULG** et **UDS**, avec une période allant de **10/1998 à 06/1999**. Sur un écran suffisamment large, la galerie peut afficher **trois blocs compacts côte à côte** ; elle s'adapte aux écrans étroits. Un clic sur une petite fiche ouvre l'explorateur de cette extension.

### Index complet sous forme de tableau

```extension-index
language: fr
view: table
group: block
sort: date-desc
ub: exclude
format: all
funny: false
digital: false
```

**À découvrir :**

- Recherche par nom français/anglais, code d'extension ou nom de bloc.
- Affichage **Tableau / Galerie**.
- Tri par **année croissante**, **année décroissante**, nom ou nombre de cartes.
- Regroupement par **bloc**, **année**, **catégorie** ou sans regroupement.
- Filtres *Universes Beyond*, produits humoristiques (*Un-sets*) et produits numériques.
- Filtre indicatif de période : Modern, Pioneer, Standard, Legacy/Vintage ou produits Commander.

Les **produits humoristiques** et les **produits numériques uniquement** sont masqués par défaut. Le classement *Universes Beyond* est enrichi par une petite liste entretenue dans le plugin et **n'est pas exhaustif**. Les dates, codes, décomptes et symboles proviennent de Scryfall.

## 8. Cartes recto-verso et texte Oracle

Cet exemple mélange une **carte à transformation**, une carte modale **recto-verso**, une carte **split** et une carte **Adventure** :

```decklist
language: fr
view: gallery
group: auto
legality: off
# Deck principal
1 Fable of the Mirror-Breaker
1 Delver of Secrets
1 Bala Ged Recovery
1 Wear // Tear
1 Brazen Borrower
```

- Sur une vraie carte à deux faces, le bouton **Retourner** change de côté, sans modifier la référence de la carte.
- Au **survol sur ordinateur**, l'aperçu rapide peut afficher les deux faces. Au **clic** (ordinateur et mobile), la grande fenêtre permet de choisir **Recto / Verso**.
- Clique sur **Afficher le texte** pour afficher séparément le **texte imprimé dans la langue de la carte** (historique, s'il est disponible) et le **texte Oracle en anglais**, utilisé pour les règles actuelles.
- Le texte Oracle est vérifié sur Scryfall **à la demande**, lors de l'ouverture du panneau. Si la connexion échoue, l'interface prévient qu'une version en cache peut ne pas être à jour.
- Les cartes **split** et **Adventure** n'ont pas de faux verso : elles présentent les informations de leurs deux parties sur une même face physique.

> [!important] Exactitude des règles
> Une traduction française imprimée peut être ancienne. **Le texte Oracle anglais est la référence actualisée**, et non une traduction automatique des corrections. La langue de l'image, le texte imprimé et les règles Oracle sont trois informations distinctes.

## 9. Symboles de mana et liens vers les cartes dans une note

Le plugin fonctionne aussi **hors des blocs de deck**. Par exemple :

- Coût de mana : {1}{R}, {2}{U}{U} ou {W/U}.
- Une carte en ligne : `mtg:Lightning Bolt`.
- Un lien avec son propre libellé : [Foudre](mtg:Lightning Bolt).

En mode Lecture ou Aperçu en direct, les expressions de mana sont remplacées par des symboles et les liens de cartes deviennent interactifs. Sur téléphone, le toucher ouvre l'aperçu ; sur ordinateur, le survol l'affiche et les liens peuvent ouvrir Scryfall.

## 10. Documenter une combo

Le bloc `combo` produit une description structurée avec les étapes, les conditions, les interactions et éventuellement une boucle.

```combo
name: Splinter Twin + Deceiver Exarch
result: Créer un grand nombre de jetons avec la célérité

prerequisites:
  - `mtg:Deceiver Exarch` sur le champ de bataille, dégagé
  - `mtg:Splinter Twin` enchante cette créature

loop:
  - Engager la créature pour créer une copie avec la célérité.
  - L'arrivée de la copie dégage la créature d'origine.
  - Recommencer pour produire d'autres jetons.

break:
  - Arrêter la boucle et attaquer avec les jetons.

interact:
  - Détruire la créature ou retirer l'enchantement en réponse à l'activation.
```

Les clés du bloc peuvent aussi être écrites en français pour certaines options, telles que `nom:`, `résultat:`, `étapes:`, `boucle:` et `sortie:`.

## 11. Modèles rapides, import et export de decks

### Raccourcis directement dans l'éditeur

Sur une **ligne vide en mode édition**, saisis un de ces raccourcis, puis **accepte la suggestion** (Entrée ou clic) :

| Raccourci | Produit |
| --- | --- |
| `deck-cmd-fr` | Deck Commander avec sections françaises |
| `deck-cmd-auto-fr` | Commander avec regroupement automatique |
| `deck-60-fr` | Deck de 60 cartes avec réserve |
| `deck-vintage-en` | Deck Vintage en anglais |
| `foudre-ext` | Liste des impressions de Foudre |
| `ext-mirage` | Explorateur d'une extension |
| `ext-index-fr` | Index visuel français des extensions |

Aucune substitution n'a lieu sans que tu sélectionnes explicitement une suggestion. Aucun plugin Templater n'est nécessaire.

### Imports publics Moxfield / Archidekt

Dans un nouveau bloc `decklist`, les directives `moxfield: URL`, `archidekt: URL` ou `source: URL` peuvent charger un **deck public**. Une commande permet ensuite d'actualiser les données mises en cache.

> [!tip] Pourquoi pas de vrai lien ici ?
> Le tutoriel n'effectue aucun import d'un deck qui ne t'appartient pas. Tu peux insérer ton propre lien public dans une **nouvelle note** lorsque tu en as besoin.

### Exports

Place ton curseur dans un bloc `decklist`, ouvre la **palette de commandes** d'Obsidian, puis choisis l'export **Moxfield** ou **MTG Arena**. Le plugin fournit le texte d'importation. Les références d'impression individuelles peuvent aussi être copiées dans les galeries de cartes.

## 12. Réglages, limites et ressources

**Réglages utiles :** langue et qualité des images, nombre de cartes par page (8 à 60 selon les options proposées), nombre de colonnes (2 à 6), affichage de statistiques, réserve repliée par défaut, affichage des avertissements de légalité et caches des imports.

**Bonnes pratiques :**

- Utiliser les noms Oracle anglais dans les sources de deck, et laisser le plugin présenter les noms français.
- Privilégier les critères de recherche avant d'afficher les cartes d'une grande extension.
- Ne pas confondre le filtre de **période d'un produit** avec le statut de légalité d'**une carte**.
- Préférer le **texte Oracle en anglais** lorsque la traduction imprimée est ambiguë ou obsolète.
- Recharger la note après une modification des paramètres ; si le style reste ancien, désactiver/réactiver le plugin ou recharger Obsidian.

### Sources et documentation

- [Scryfall — cartes et API](https://scryfall.com/docs/api)
- [Scryfall — catalogue des extensions](https://scryfall.com/sets)
- [Guide français du dépôt](https://github.com/Carouan/obsidian-mtg-decklist/blob/main/docs/guide-fr.md)
- [README du plugin](https://github.com/Carouan/obsidian-mtg-decklist)

> [!note] Mention légale
> Ce plugin est un projet communautaire non officiel, **ni affilié, ni approuvé, ni soutenu par Wizards of the Coast**. *Magic: The Gathering*, ses symboles, logos et marques associés appartiennent à leurs titulaires respectifs. Les illustrations de cartes appartiennent à Wizards of the Coast et à leurs créateurs ou ayants droit. Les données et images affichées proviennent notamment de Scryfall et restent soumises aux conditions applicables à ces ressources.

---

*Fin du guide pratique. Tous les exemples visibles dans cette note constituent un coffre de démonstration ; les recopier ou les modifier dans tes propres notes ne modifie pas le plugin.*
