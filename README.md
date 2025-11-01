# ASTRA AI SDK

![Aperçu de l'interface](./public/illustration.png)

ASTRA AI SDK est une console web Next.js pensée pour piloter une instance Ollama locale avec une expérience riche côté front et un minimum d'API côté serveur. L'application combine un chat temps réel, la gestion complète des modèles, le monitoring de la machine hôte et un bac à sable d'exécution de snippets pour offrir une alternative haut de gamme à l'interface Ollama standard.

## Fonctionnalités principales

- **Chat en streaming** avec rendu Markdown, coloration syntaxique et découpe fine des blocs de code pour éviter les scintillements pendant le flux token par token. 【F:src/components/chat/chat-card.tsx†L1-L120】
- **Sélecteur et installation de modèles** directement depuis l'interface avec suivi précis du téléchargement (pourcentage, débit, ETA) et accès rapide aux modèles déjà chargés en RAM. 【F:src/components/ModelCombobox.tsx†L1-L204】
- **Barre de métriques en direct** indiquant modèle actif, RAM disponible, tokens entrants/sortants et temps de réponse une fois la génération terminée. 【F:src/components/MetricsBar.tsx†L1-L63】
- **Résumé système détaillé** (CPU, GPU, RAM, disque, réseau, modèles Ollama installés/chargés) accessible via un popover, alimenté par l'API `/api/system/summary`. 【F:src/components/system-popover.tsx†L1-L200】【F:src/app/api/system/summary/route.ts†L1-L104】
- **Console avancée** (`/console`) combinant gestionnaire de sessions, catalogue Ollama, suivi des modèles en cours d'exécution et panneau d'inspection. 【F:src/components/console/AIConsole.tsx†L1-L13】【F:src/components/console/model-manager/ModelManager.tsx†L1-L205】
- **Exécution sécurisée de snippets** générés par l'IA (bash, Python, Node/TypeScript) grâce à un endpoint sandboxé avec timeout. 【F:src/components/chat/CodeBubble.tsx†L1-L64】【F:src/app/api/exec/route.ts†L1-L96】

## Architecture

### Côté client
- Application **Next.js App Router** en mode client pour les vues interactives (`src/app/page.tsx`, `src/app/console/page.tsx`). 【F:src/app/page.tsx†L1-L188】【F:src/app/console/page.tsx†L1-L7】
- Gestion d'état légère via **Zustand** pour les sessions de chat persistantes dans la console. 【F:src/store/session.ts†L1-L33】
- Hooks dédiés pour interroger périodiquement Ollama et afficher l'état mémoire. 【F:src/hooks/use-ollama-status.ts†L1-L26】
- Composants UI basés sur Radix + shadcn/ui personnalisés pour garantir cohérence visuelle et support du thème clair/sombre.

### Côté serveur
- Routes Next.js (`app/api/*`) agissant comme **façade locale** vers Ollama : listage, installation/suppression, streaming NDJSON des chats et collecte des métriques système. 【F:src/app/api/ollama/chat/route.ts†L1-L52】【F:src/lib/ollama.ts†L1-L53】
- Intégration de la librairie [`systeminformation`](https://www.npmjs.com/package/systeminformation) pour exposer les ressources machine.
- Sandbox d'exécution (`/api/exec`) isolé dans un répertoire temporaire avec arrêt forcé à 15 s pour limiter les risques. 【F:src/app/api/exec/route.ts†L25-L73】

## Prérequis

- **Node.js 20+** (Next.js 16 et React 19 sont utilisés).
- **Ollama 0.4+** accessible en local ou sur le réseau. L'URL est configurable via la variable `OLLAMA_HOST` (par défaut `http://127.0.0.1:11434`). 【F:src/lib/ollama.ts†L1-L53】
- PNPM, npm ou bun pour gérer les dépendances (le projet inclut un `package-lock.json`).

## Installer Ollama via la ligne de commande

L'application suppose qu'Ollama est installé **avant** de lancer le serveur Next.js. Les commandes ci-dessous permettent de déployer une instance locale prête à l'emploi.

### macOS (Apple Silicon)

```bash
# 1. Télécharger et installer la CLI Ollama
curl -fsSL https://ollama.com/download/Ollama-darwin-arm64.tgz | sudo tar -xz -C /usr/local/bin

# 2. Lancer le service (à exécuter une fois après installation)
ollama serve

# 3. Vérifier qu'un modèle peut être tiré
ollama pull llama3.1
```

> ℹ️ Le service démarre automatiquement via launchd après la première exécution de `ollama serve`. Sur macOS, aucune étape supplémentaire n'est nécessaire pour exposer l'API sur `127.0.0.1:11434`.

### Linux x86_64

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
ollama pull llama3.1
```

### Windows 11/10 (WSL 2 recommandé)

```powershell
# Dans PowerShell administrateur
winget install Ollama.Ollama

# Après l'installation, ouvrir une invite PowerShell et démarrer le service
ollama serve

# Facultatif : dans WSL, exporter l'API vers le réseau local
setx OLLAMA_HOST http://127.0.0.1:11434
```

> ✅ Vous pouvez également utiliser WSL 2 : installez Ollama côté distribution Linux puis exposez `OLLAMA_HOST` depuis Windows pour que Next.js puisse s'y connecter.

Une fois Ollama installé, vérifiez que l'API répond :

```bash
curl http://127.0.0.1:11434/api/version
```

## Démarrage rapide du projet

1. Cloner ce dépôt puis installer les dépendances :
   ```bash
   git clone https://github.com/votre-org/astra-ai-sdk.git
   cd astra-ai-sdk
   npm install
   # ou
   pnpm install
   ```
2. (Optionnel) créer un fichier `.env.local` pour surcharger `OLLAMA_HOST` si l'instance n'est pas locale.
3. Lancer le serveur de développement Next.js :
   ```bash
   npm run dev
   ```
4. Accéder à [http://localhost:3000](http://localhost:3000) pour l'interface principale ou [http://localhost:3000/console](http://localhost:3000/console) pour la console avancée.

### Build production

```bash
npm run build
npm start
```

Le build statique est prêt à être déployé sur n'importe quelle plateforme compatible Next.js (Vercel, Docker, VM personnelle…). Pensez à exposer `OLLAMA_HOST` dans l'environnement d'exécution.

## Dimensionnement matériel recommandé

Les besoins varient selon la taille du modèle Ollama chargé. Le tableau suivant récapitule les configurations **minimales** et **recommandées** testées pour une expérience fluide avec les quantifications par défaut (`Q4_K_M`).

| Modèle | Apple Silicon – Configuration minimale | Apple Silicon – Configuration recommandée | Windows/WSL – Configuration minimale | Windows/WSL – Configuration recommandée |
| --- | --- | --- | --- | --- |
| 7–8B (ex. `llama3.1:8b`) | MacBook Air M1/M2, 8 cœurs CPU / 8 Go RAM unifiée | MacBook Pro M3, 10 cœurs CPU / 16 Go RAM, SSD NVMe | CPU 6 cœurs, 16 Go RAM système, GPU 8 Go VRAM (RTX 3060) | CPU 8 cœurs, 32 Go RAM, GPU 12 Go VRAM (RTX 4070) |
| 13B (ex. `llama3.1:13b`) | MacBook Pro M2 Pro, 10 cœurs / 16 Go RAM | MacBook Pro M3 Pro, 12 cœurs / 24 Go RAM | CPU 8 cœurs, 32 Go RAM, GPU 12 Go VRAM | CPU 12 cœurs, 48 Go RAM, GPU 16 Go VRAM |
| 33B (ex. `mixtral:8x7b`) | Mac Studio M2 Max, 12 cœurs / 32 Go RAM | Mac Studio M2 Ultra, 16 cœurs / 48 Go RAM | CPU 12 cœurs, 64 Go RAM, GPU 20 Go VRAM (RTX 4080) | CPU 16 cœurs, 96 Go RAM, GPU 24 Go VRAM (RTX 4090) |
| 70B (ex. `llama3.1:70b`) | Mac Studio M2 Ultra, 24 cœurs / 96 Go RAM | Mac Pro M2 Ultra, 24 cœurs / 128 Go RAM | CPU 16 cœurs, 128 Go RAM, GPU 48 Go VRAM (dual RTX 6000 Ada) | CPU 24 cœurs, 192 Go RAM, GPU 80 Go VRAM (RTX 6000 Ada x2) |

> 💡 Avec des quantifications plus légères (`Q8`), augmentez la mémoire d'au moins 30 %. En dessous des spécifications minimales, Ollama tombera en swap et les temps de réponse se dégraderont fortement.

## Structure du projet

```
src/
├─ app/                  # Pages Next.js (landing, console, API routes)
├─ components/           # UI (chat, metrics, popovers, console)
├─ hooks/                # Hooks custom (statut Ollama…)
├─ lib/                  # Clients Ollama, helpers NDJSON, formatage
└─ store/                # Zustand store pour les sessions
```

## Intégration Ollama

- Tous les appels réseau passent par les routes Next internes qui rejouent les endpoints officiels (`/api/chat`, `/api/tags`, `/api/pull`, etc.) en ajoutant du **contrôle de flux** et de la **télémétrie**. 【F:src/app/api/ollama/pull/route.ts†L1-L63】【F:src/app/api/ollama/status/route.ts†L1-L74】
- Le chat repose sur un flux **NDJSON stream** traité côté client pour mettre à jour progressivement l'UI et compter les tokens. 【F:src/lib/ndjson.ts†L1-L96】【F:src/components/chat/chat-card.tsx†L121-L220】
- La barre de métriques et le popover système combinent les données Ollama (modèles chargés) et les ressources locales pour faciliter le **dimensionnement** et le **monitoring**. 【F:src/components/MetricsBar.tsx†L1-L63】【F:src/components/system-popover.tsx†L135-L217】

## Console développeur

La vue `/console` se destine aux power users :
- **Gestionnaire de modèles** avec recherche unifiée catalogue/installés, suivi du téléchargement et actions (installer, mettre à jour, supprimer). 【F:src/components/console/model-manager/ModelManager.tsx†L1-L205】
- **Sidebar multi-sessions** pour basculer de modèle en un clic et amorcer de nouvelles conversations. 【F:src/components/console/Sidebar.tsx†L1-L47】
- **Inspector** (panneau droit) prêt à accueillir logs et métadonnées pendant les runs (structure déjà en place dans `src/components/console/Inspector.tsx`).

## Exécution de code

Les blocs de code détectés dans les réponses peuvent être exécutés si leur langage fait partie de la whitelist (`bash`, `python`, `node`, `typescript`). Les snippets sont envoyés à `/api/exec` qui crée un dossier temporaire, écrit le fichier, lance le processus puis stream stdout/stderr avec un timeout strict de 15 secondes. 【F:src/components/chat/CodeBubble.tsx†L1-L64】【F:src/app/api/exec/route.ts†L25-L96】

## Scripts utiles

- `npm run dev` : serveur de développement avec HMR.
- `npm run lint` : linting ESLint (configuration Next.js 16).
- `npm run build` / `npm start` : build et lancement production.

## Limitations & axes d'amélioration

- Authentification et gestion multi-utilisateurs absentes (l'application suppose un usage local et maîtrisé).
- Pas de persistance long terme des conversations (le store Zustand vit en mémoire côté client).
- L'exécution de code reste volontairement limitée à un set restreint de langages et à 15 s d'exécution pour minimiser les risques.
- La console `/console` expose déjà la structure UI mais certains panneaux (Inspector, logs stream) peuvent être enrichis en fonction des besoins.

## Licence

Le projet est diffusé sans licence explicite. Ajoutez un fichier `LICENSE` si vous souhaitez en préciser les termes.
