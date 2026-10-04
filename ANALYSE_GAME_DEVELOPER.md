# Analyse de Big Balls par l'agent game-developer

Rapport complet de l'agent `game-developer`, enregistré le 2026-10-04 avant toute modification issue de ses propositions.

- Les numéros de ligne (`game.js:123`) correspondent à `game.js` **au moment de l'analyse** (après l'ajout du game feel, avant les propositions 1 à 3). Ils ont bougé depuis.
- L'agent a travaillé en lecture seule : aucun fichier du projet n'a été modifié par lui.
- Les simulations viennent de bots qui ne pilotent jamais en l'air. Ce sont des ordres de grandeur, pas des données de joueurs.

---

# Rapport d'analyse : Big Balls (lecture seule, aucun fichier du projet modifié)

**Méthode.**
- J'ai lu `game.js`, `index.html` et `style.css` en entier.
- J'ai rejoué le vrai `physStep` et le vrai générateur de terrain avec un harnais Node (`vm`). Le harnais et ses scripts sont dans `R:\Temp\claude\H--PROGRAMMATION-PROG-JEU-VIDEO-2026-10-03-Big-Balls-2026-10-03--Big-Balls\c1fbb22f-7490-493f-9da5-cae5fec34a81\scratchpad\sim\`.
- J'ai vérifié l'interface dans Edge avec Playwright.
- Les mtimes et `git status` du projet sont inchangés.
- Étiquettes : **[code]** lu dans le code, **[sim]** mesuré en simulation, **[nav]** vérifié dans le navigateur.
- Les bots de simulation ne remplacent pas un humain. Ils tiennent le gaz, avec ou sans nitro, et ne pilotent jamais en l'air.

## Constats chiffrés

- **Revenu.** Dans la simulation, la distance (0,5 crédit/m) fait 70 à 80 % des gains. Les figures et le temps de vol pèsent 7 à 15 %. Les missions et l'objectif pèsent 10 à 25 % [sim].
- **Vitesse et gains.** Le nitro n'est pas plafonné et rien ne freine la moto en vol. Résultat : le revenu par seconde dépend surtout de la vitesse (31 crédits/s pour la Rusty, 117 pour la Big Balls One, gaz seul en Monde 1) [sim].
- **Boutique.** Elle coûte 225 600 crédits au total (207 000 pour les motos, 18 600 pour les pilotes). Un bot « gaz + nitro » achète tout en 21 à 33 min de jeu net, selon le monde joué. C'est une borne basse, sans compétence ni temps de menu [sim].
- **Bonus de premier passage.** Ils valent 1 500, 3 000 et 4 500 crédits. Le Monde 1 est franchi à 100 % par la Rusty en gaz seul. Après le premier passage, le bonus de répétition (250 à 750) ne vaut plus rien face à 5 000 à 10 000 crédits par course en fin de jeu [sim].
- **Difficulté inversée.**
  - Gaz seul, sans nitro, Monde 1 : la Rusty atteint l'objectif dans 100 % des courses, la Café Racer 43 %, la Big Balls One 38 %.
  - Le gain par course passe de 3 673 (Rusty) à 1 068 (Big Balls One).
  - Les motos chères sont plus rapides mais plus dures à poser. Je n'ai pas de données humaines sur ce point [sim].
- **Monde 3.**
  - Le multiplicateur de performance (0,75) et 26 % de lacs filtrent fortement les motos.
  - Rusty, Dirt Scout et Mud Hog : 0 à 3 % d'objectifs atteints.
  - Pocket Rocket : 88 %.
  - Toutes les motos à 7 000 crédits ou plus : 13 % au mieux [sim].
- **Monde 2.** Il n'est pas plus dur que le Monde 1 pour les motos de départ (100 % pour la Rusty, comme en Monde 1). Il paie pourtant 2 fois le bonus d'objectif et 1,5 fois les missions. Le Monde 1 perd donc son intérêt après le premier passage [sim].
- **Structure.** Aucun déblocage de monde, aucune montée de difficulté avec la distance (`addChunk` utilise toujours le même `GEN`), aucune ligne d'arrivée visible dans le décor. Le toast « MONDE TERMINÉ ! » apparaît alors que la course continue (`game.js:1485-1495`) [code].

## Propositions priorisées (impact joueur / effort)

| # | Proposition | Pourquoi ça compte | Effort | Où |
|---|---|---|---|---|
| 1 | **Plafonner le nitro et ajouter une traînée.** Par exemple, nitro limité à `top × 1,3` et traînée croissante au-delà de `top`. | Le nitro fait atteindre 9 000 px/s (« 3 000 km/h »), ce qui est illisible. Les gains suivent la vitesse brute et l'économie dérive. | Petit | `physStep` (`game.js:525-553`), `endRun` (`1684`) |
| 2 | **Aligner missions et figures sur la moto possédée.** Filtrer le tirage de `flips` et `combo` selon la capacité de vol. Faire dépendre récompense et cible du tier de la moto. Rendre un tour atteignable sur les premières motos. | Voir défaut D3 : chaque course affiche au moins une mission irréalisable pendant les premières minutes. | Petit-moyen | `MISSION_KINDS`, `newMissions` (`1454-1473`), rotation en l'air (`557`) |
| 3 | **Passe tactile.** Masquer l'aide clavier. Sortir la jauge nitro de sous le bouton. Ajouter un bouton pause/relance. Rendre le menu scrollable en paysage court. Ajouter `touch-action:none`. | Aujourd'hui le jeu est partiellement injouable sur téléphone (D9). | Petit-moyen | `style.css`, `index.html:32-36`, `drawSpeedo` (`1418`), `startGame` (`1675`) |
| 4 | **Sauvegarder à la sortie.** Appeler `Save.store()` sur `visibilitychange` et `pagehide`, et après chaque mission ou objectif. Valider la sauvegarde chargée. Persister le réglage du son. Identifier les objets par id stable plutôt que par index. | Les gains d'une course en cours se perdent si l'onglet est fermé ou tué (D6). | Petit | `Save` (`210-239`) |
| 5 | **Fin de course qui donne envie de rejouer.** Rejouer avec R, Entrée ou Espace sur l'écran de fin. Afficher le détail des gains (distance, vol, figures, missions, objectif). Ajouter une jauge « prochain achat : X crédits ». Afficher la progression des missions ratées. Tenir un record par monde. Faire de R « terminer la course » (il encaisse la distance). | Le rejouer instantané est le levier de rétention le moins cher. Le détail des gains rend le but lisible. | Petit-moyen | `endRun` (`1680`), `#over`, `updateHUD` (`1514`), clavier (`418`, `1782`) |
| 6 | **Progression des mondes.** Débloquer le monde suivant à l'objectif du précédent (`Save.cleared` existe déjà). Afficher une moto recommandée par monde. Borner les pentes selon `perf`. Dessiner une ligne d'arrivée et une barre de progression. Ajouter un chrono ou des médailles pour rejouer l'objectif. | Donne une colonne vertébrale au jeu et corrige le piège du Monde 3 (D13). | Moyen | `WORLD_GOALS` (`1453`), menu, `updateWorldButtons` (`1647`), `featMega`/`featKicker` |
| 7 | **Rendre les stats vraies.** La masse doit compter (accélération = puissance / masse). L'accroche ne doit pas se comporter comme une traînée. Afficher NITRO et CONTRÔLE dans la boutique. Rééquilibrer les motos dominées. | Voir D2 et les chiffres de rééquilibrage ci-dessous. | Petit-moyen | `physStep` (`510-626`), `buildShop` (`1561-1568`), `BIKES` |
| 8 | **Contrôles.** Lire les touches avec `e.code` (ZQSD). Recharger le nitro même touche tenue. Ne déclencher le repêchage que si le gaz est tenu, avec un plafond de tentatives. R en appui long. | Corrige D5, D7, D10 et D12. | Petit | `418-446`, `553`, `1807-1818` |
| 9 | **Courbe de difficulté dans la course.** Faire monter amplitude et poids des features avec la distance. Ajouter des sections de rythme. | Aujourd'hui une course est infinie à difficulté constante. | Moyen | `addChunk` (`345-375`), `GEN` |
| 10 | **Économie de fin de jeu.** Ajouter des puits de crédits (améliorations par moto, peintures). Indexer les récompenses de mission sur le prix de la prochaine moto. Proposer un défi quotidien à `runSeed` fixe. | Après les achats, les crédits ne servent plus à rien. | Moyen-gros | `Save`, boutique, `newMissions` (`1468-1469`), `startGame` (`1667`) |
| 11 | **Variété du terrain.** Ajouter des pièces à ramasser, des obstacles et de longues pentes. Corriger le raccord entre chunks (D15). Adoucir les lacs. | Les 7 features additives se ressemblent d'un monde à l'autre. | Moyen | `feat*`, `addChunk` |
| 12 | **Coût GPU mobile et PWA.** DPR adaptatif. Retirer `backdrop-filter` en jeu. Manifest avec plein écran paysage. | C'est un risque que la mesure CPU ne couvre pas (voir hypothèses). À mesurer sur un vrai appareil. | Petit | `resize` (`245`), `style.css:29`, `:79`, `:224` |

Détail pour la proposition 7 :
- **Dominance de prix.** Turbo Falcon (9 000) est presque dominé par Nitro King (7 000). Vulcan (12 000) vaut environ 93 % de Volt Hyper (15 000) pour 80 % du prix. Mud Hog (800) domine Dirt Scout (500) sur la puissance, la vitesse et l'accroche.
- **Contrôle caché.** Le contrôle en l'air baisse avec le prix (`rot` passe de 9,5 à 6,6), mais la boutique ne l'affiche pas.

## Défauts vérifiés

- **D1. Nitro non plafonné, sans traînée** [code+sim]. `game.js:540-545` n'applique pas le test `fwd < top` du moteur (`525`) et rien ne freine la moto ensuite. Mesures nitro tenu depuis le départ : Rusty 1 302 px/s (`top` 500), Volt Hyper 9 167 px/s, Big Balls One 9 253 px/s. Un saut dure alors 3 s à 1 200 px d'altitude.
- **D2. La masse n'a aucun effet** [code+sim]. `mass` (`510`) s'annule dans le solveur d'impulsions (`607-624`).
  - Ma preuve : avec la même graine, la trajectoire est identique au bit près pour une masse ×0,5 et ×4.
  - L'inertie, elle, change bien le résultat (+861 px sur le même scénario).
  - La barre « LÉGÈRETÉ » de la boutique (`1568`) et les bonus « léger » (Aria, MX 250, Pocket Rocket) sont donc purement décoratifs.
  - L'accroche agit surtout comme une traînée. Avec le nitro, le temps pour atteindre l'objectif passe de 4,9 s (grip 0,6) à 8,5 s (grip 2,0).
- **D3. Figures et missions hors de portée au départ** [code+sim].
  - `MISSION_KINDS` compte 4 types et on en tire 3 (`1465`). Chaque course contient donc au moins une mission `flips` ou `combo` (les deux dans 50 % des cas).
  - Un tour propre exige environ 0,98 s de vol avec la Rusty et le pilote de départ (contrôleur quasi optimal), 1,02 s avec la Dirt Scout, 1,13 s avec la R1. Deux tours exigent 1,5 s ou plus.
  - Le vol maximal observé sur environ 35 km de terrain simulé est de 0,6 à 0,8 s avec la Rusty (1,0 s au mieux avec nitro en Monde 2). Sans nitro, la R1 atteint 1,0 s au mieux, le Turbo Falcon 1,2 s.
  - Les figures deviennent réalistes avec nitro et une moto à partir de 5 500 crédits.
  - Les récompenses sont plates (200/400/600) quel que soit le type. « 4 tours dans un seul saut » paie autant que « 1 200 m », alors qu'un seul tour x3 paie déjà 1 350 (`674`).
- **D4. R fait perdre la course sans l'encaisser** [code]. `game.js:1782` appelle `resetBike`, qui remet `bike.earned` (`489`) et `bike.goalHit` (`492`) à zéro. Les conséquences :
  - La distance (`floor(dist/2)`, `1684`) et le record (`1683`) ne sont jamais versés. R à 900 m perd 450 crédits.
  - Le bonus d'objectif redevient gagnable à chaque tour (250 × (monde + 1)), mais ce n'est pas rentable face au simple fait de continuer à rouler.
  - Le bandeau « Crédits gagnés » sous-estime ce qui a été crédité avant R.
  - Une touche R accidentelle fait perdre le run, notamment pour les joueurs WASD.
- **D5. R armé hors jeu** [code+nav]. `In.restart` (`421`) reste vrai quand on appuie sur R sur l'écran de fin. Au départ suivant, le toast « Reset » remplace « GO ! ». R, Entrée et Espace ne relancent pas depuis l'écran de fin (l'état reste `over`).
- **D6. Sauvegarde à la mort seulement** [code]. `Save.store()` n'est appelé qu'en `1662`, `1687`, `1712`, `1719`, `1736` et `1746`. Il n'y a ni `visibilitychange`, ni `pagehide`, ni `beforeunload` (recherche vide). Crédits, missions, `cleared` et `best` d'une course sont perdus si l'onglet est fermé ou tué (fréquent sur mobile). Le son n'est pas sauvegardé.
- **D7. Repêchage** [code+sim].
  - Il ignore l'entrée (`1807`) : un joueur qui s'arrête volontairement 2,6 s est téléporté en arrière.
  - Boucle observée : en Monde 3, la Rusty (puissance effective 1 013) cale sur une rampe Mega de 43 à 48°, où g·sin θ vaut 1 098 à 1 186. Le repêchage la remet à vitesse nulle au pied de la même rampe. 2 graines sur 12 donnent 13 repêchages d'affilée. Sur mobile, sans touche R, il ne reste que le crash volontaire.
  - `safeX/Y/A` ne sont jamais remis à zéro (`485-495`, écriture en `640`). Un point d'une course précédente reste exploitable si on cale avant d'avoir roulé à plus de 220 px/s au sol. C'est latent et peu probable.
- **D8. Record global** [code]. `updateHUD` (`1514`) affiche `Save.best`, un record unique. En Monde 3, le HUD affiche donc un record gagné en Monde 1.
- **D9. Tactile** [code+nav, 667×375 et 844×390].
  - Les boutons de rotation et N2O recouvrent le compteur dessiné au canvas (`1419`). La jauge nitro est masquée aux trois quarts.
  - L'aide clavier (671 px, `index.html:32-36`) reste affichée en tactile. Elle déborde de l'écran à 667 px et chevauche les boutons gauche, gaz et N2O.
  - Il n'y a ni R, ni pause, ni retour menu en tactile.
  - Le menu fait 630 px de haut (top à −127 px) sur un viewport de 375 px, sans scroll (`.overlay` n'a pas d'`overflow`). Le logo est coupé, et les boutons Son et Secousse (y=439) sont hors écran. L'option de réduction de secousse est donc inaccessible sur téléphone paysage.
- **D10. AZERTY** [code+nav]. `418-446` utilise `e.key`. Z et Q n'ont aucun effet (vérifié) : seuls D et S marchent sur un clavier ZQSD.
- **D11. Boutique** [code+nav].
  - Après un achat ou un équipement, le scroll de la grille repasse de 578 à 0 (`openShop` reconstruit tout, `1533-1548`).
  - Le toast « Acheté » (`1714`) est invisible car le HUD est caché.
  - Les flèches et Espace sont bloqués par `preventDefault` même dans la boutique (`419`).
- **D12. Nitro vide + touche tenue** [code]. La recharge est conditionnée à `!In.nitro` (`553`). Un doigt maintenu sur N2O avec le réservoir vide empêche toute recharge, sans message.
- **D13. Contrat de pente violé par les lacs** [code+sim]. Le commentaire `271-272` promet des pentes de 40 à 50° maximum. `featWater` (`329-343`) produit une falaise d'environ 78° (tan 4,67 en médiane sur le Monde 3, contre 0,8 à 1,3 aux Mondes 1 et 2) et une berge d'environ 70°. Un bot meurt sur « Water » 53 fois sur 60 avec la Rusty (Chute 38, Noyade 15).
- **D14. Paiement après la mort et mission non créditée** [code+sim]. La logique d'atterrissage (`651-689`) n'a pas de garde `!bike.dead` : jusqu'à 6,6 crédits en moyenne sont encore versés pendant les 900 ms qui suivent un crash. À l'inverse, `checkObjectives` (`1476`) abandonne dès `dead`. Une mission « temps en l'air » atteinte lors du saut qui provoque la chute est perdue, alors que le temps de vol est payé.
- **D15. Raccord de chunk** [sim]. `addChunk` repart de `x = startX` (`354`) alors que la dernière feature du chunk précédent déborde, et les features s'additionnent. À x = 2 400 m, 3 à 5 % des graines ont une queue résiduelle de 15 à 135 px. Les pentes restent proches de la normale (max 1,24 aux Mondes 1 et 2). Effet minime.
- **D16. Hygiène** [code].
  - Constantes mortes : `FN_MAX`, `K_SPRING`, `C_DAMP`, `FLIP_MIN_SPEED` (`499-502`).
  - `Math.sign(bike.vx >= 0 ? 1 : 1)` vaut toujours 1 (`705`).
  - La constante locale `fx` de `physStep` (`516`) masque l'objet `fx` du bloc GAME FEEL (`465`). C'est un piège pour toute évolution future.
  - `missionGain` est écrit mais jamais lu. `Save.missionsDone` n'est jamais affiché.
  - Le mélange `sort(() => Math.random()-0.5)` (`1465`) est biaisé.
  - La propriété des objets repose sur l'ordre des tableaux : insérer au milieu casse les sauvegardes.
  - Le terrain s'arrête net à x<0 (`932`) : une falaise est visible à gauche au départ (capture).

**Missions « parcourir X m » contre l'objectif du monde.** Il n'y a pas de contradiction de code. Les paliers (400/800/1 200 ×(1 + 0,5·monde)) donnent :
- 1 200 m pour 1 000 m d'objectif (Monde 1) ;
- 1 800 m pour 1 500 m (Monde 2) ;
- 2 400 m pour 2 000 m (Monde 3).

Le palier 3 dépasse donc l'objectif, et la course continue après. Ces missions sont redondantes avec la paie à la distance, donc gratuites pour tout joueur qui roule.

## Hypothèses non vérifiées

1. **Joueur humain.** Je n'ai pas de données humaines. « Les motos chères sont plus dures » et « le Monde 3 filtre fortement les motos de départ » viennent de bots qui ne pilotent pas. Un humain qui pilote en l'air peut faire mieux, et les temps de 21 à 33 min sont une borne basse.
2. **Vol humain.** Un humain peut peut-être dépasser les 0,98 s de vol minimal d'un tour avec la Rusty. Je ne l'ai pas testé.
3. **Caméra à très haute vitesse.** Par calcul seulement : au-delà d'environ 5 000 à 9 000 px/s, la moto est collée au bord droit de l'écran et le terrain à venir n'est visible que 0,25 s à l'avance. Je n'ai pas fait de rendu à ces vitesses.
4. **Coût GPU et batterie sur mobile.** Je n'ai pas mesuré. Risques identifiés : DPR jusqu'à 2, `backdrop-filter` sur 3 zones recomposées à chaque frame (HUD, overlay, boutons), dizaines de dégradés et `Path2D` recréés par frame, oscillateurs audio qui tournent même en menu.
5. **Multitouch.** Ce que j'ai vu est le code (`touchstart/touchend` par bouton) et une mise en page avec boutons tactiles dans Edge émulé, pas un appareil réel.
6. **Audio.** `Snd.engine` appelle `setTargetAtTime` à 60 Hz sur 5 paramètres. Je n'ai pas observé de fuite sur longue partie.
7. **Sauvegarde corrompue.** Un `ownedBikes` ou un `cleared` mal typé ferait planter le chargement (pas de validation). Je ne l'ai pas provoqué.
8. **Détection tactile.** `'ontouchstart' in window` (`1675`) n'a pas été testé sur matériel hybride.
9. **Raccord de chunk en jeu réel.** Les chiffres viennent de 400 graines par monde, pas de parties jouées.
10. **Perf CPU.** Rien à ajouter à tes mesures : mon harnais n'a vu aucune croissance anormale côté terrain (un `Float32Array` de 24 Ko par 2 400 m).

## Les 3 propositions à faire en premier

1. **Plafonner le nitro avec une traînée (n°1).** C'est quelques lignes dans `physStep` (`540-553`). Cela débloque tout le reste : les gains deviennent mesurables, la caméra suit, le saut ne dure plus 3 s, et un tarif de missions ou de boutique devient possible à régler.
2. **Missions et figures atteignables dès la moto de départ (n°2).** Chaque course affiche aujourd'hui un objectif quasi impossible, et les figures, le cœur du jeu, restent hors de portée pendant les premières minutes. Filtrer les missions selon la capacité de vol coûte peu et rend le but du jeu lisible dès la première partie.
3. **Passe tactile plus sauvegarde à la sortie (n°3 + n°4).** Ce sont des défauts concrets et peu chers : jauge nitro cachée, aide clavier sur écran tactile, pas de pause ni de relance, menu coupé, gains d'une course perdus à la fermeture. Le tactile est la plateforme où le jeu ne se joue pas aujourd'hui.

Viennent juste après : l'écran de fin avec rejouer instantané et détail des gains (n°5, effort petit), et le déblocage séquentiel des mondes (n°6).

---

# Suivi d'implémentation (ajouté après l'analyse, 2026-10-04)

Les propositions 1 à 3 ont été mesurées et testées en simulation / dans Edge. Le lot suivant (4 à 9 et défauts) n'a reçu **qu'un contrôle de syntaxe et un contrôle statique des identifiants** : à tester à la main.

## Fait

| # | Ce qui a été fait | Où |
|---|---|---|
| 1 | Nitro plafonnée à `top × 1,4` (poussée dégressive) + traînée horizontale quadratique au-delà de `top` : vitesse ≤ ~1,5 × `top` mesurée sur 12 terrains | `NITRO_CAP`, `OVERSPEED_DRAG`, `physStep` |
| 2 | Missions tirées selon la moto (vol max typique, tours faisables, temps de vol par km), récompense et cibles selon le palier de la moto, tirage Fisher–Yates, rotation en l'air `AIR_TORQUE` 1,7 → 3,0 | `bikeProfile`, `MISSION_KINDS`, `newMissions` |
| 3 | Tactile : aide masquée, jauge en haut à droite, bouton pause + écran de pause (P / Échap), menu et fin compacts en paysage court, `touch-action`. Sauvegarde sur `visibilitychange` / `pagehide` avec encaissement de la distance (`bankRun`, sans double paiement) | `setPause`, `bankRun`, `style.css` |
| 4 | Sauvegarde validée au chargement (`Save.sane`), réglage du son mémorisé. **Non fait** : ids stables à la place des index | `Save` |
| 5 | Rejouer avec Entrée / Espace / R depuis l'écran de fin ; bilan détaillé (distance, vol et figures, missions et arrivée) ; état des 3 missions ; jauge « prochain achat » ; record par monde ; **R encaisse la distance puis relance** (au lieu de perdre la course) | `endRun`, `noteBest`, `Save.bests` |
| 6 | Monde suivant débloqué en terminant le précédent (`UNLOCK_WORLDS`), conseil de moto par monde, ligne d'arrivée dessinée, barre de progression, rampes 25 % plus longues au Monde 3. **Non fait** : chrono et médailles | `worldUnlocked`, `drawFinish`, `GEN.ramp` |
| 7 | La masse compte (poussée, frein et nitro divisés par la masse), boutique : NITRO, CONTRÔLE, LÉGÈRETÉ ajoutés | `physStep`, `buildShop` |
| 8 | Touches par position physique (ZQSD sur AZERTY), nitro qui se recharge touche tenue sur réservoir vide, repêchage seulement si le gaz est tenu et fin de course après 3 repêchages au même endroit | `keyId`, boucle principale |
| 9 | Difficulté croissante : amplitude du terrain +12 % à 1 000 m, +25 % à 2 000 m, plafond +35 % | `ampAt` |
| 12 | DPR plafonné à 1,5 en tactile, `backdrop-filter` retiré du HUD et des boutons tactiles. **Non fait** : manifeste PWA | `resize`, `style.css` |

Défauts corrigés : D1, D3, D4, D5, D6, D7 (sauf la graine `safeX` d'une ancienne course, remise à zéro), D8, D9, D10, D11, D12, D14, D15, D16. D2 corrigé pour la masse seulement.

## Non fait, et pourquoi

- **D13 / lacs du Monde 3 (proposition 11)** : adoucir les berges allonge le lac ; or la portée de saut des motos bridées est la contrainte. Il faut choisir entre lac plus étroit ou berge moins raide, avec un test de jeu.
- **D2, volet accroche** : l'accroche agit comme une traînée parce que les roues n'ont pas de vraie rotation. Corriger demande de refaire le modèle de roue.
- **Rééquilibrage des motos dominées** (Falcon / Nitro King, Vulcan / Volt Hyper, Mud Hog / Dirt Scout) : choix de design, à décider avec des parties réelles. La masse effective change déjà un peu la donne.
- **Proposition 10** (dépenses de fin de jeu, défi quotidien) et **proposition 11** (pièces, obstacles) : demandent des décisions de contenu.
- **Ids stables dans la sauvegarde**, **manifeste PWA**, **chrono / médailles**.

## Réglages à connaître

`NITRO_CAP` (1,4), `OVERSPEED_DRAG` (6000), `AIR_TORQUE` (3,0), `FLIP_HUMAN` (1,15), `UNLOCK_WORLDS` (true), `SHAKE_MAX` / `SHAKE_DECAY`, `ampAt` (80000, plafond 0,35), `GEN.ramp` du Monde 3 (1,25).
