# 🐝 HIVEMIND - Plan du Projet

> **L'intelligence collective des IA, accessible à tous.**

---

## 📋 Résumé

Hivemind est une plateforme de chat IA qui permet d'obtenir un **consensus multi-modèles** (GPT, Claude, Gemini) en une seule requête. L'utilisateur utilise ses propres clés API (BYOK - Bring Your Own Key), stockées localement dans le navigateur.

### Différenciation clé
- **Mode Hivemind** : 3 modèles répondent simultanément + synthèse consensus
- **Gratuit** et open source (vs TypingMind à $39)
- **Zéro setup** : hébergé sur Vercel (vs LibreChat qui nécessite Docker)
- **Intégration Claude Code** via MCP + slash command `/hive`

---

## 🎯 Vision

```
┌─────────────────────────────────────────────────────────────┐
│                         HIVEMIND                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔑 Clés API stockées localement (localStorage chiffré)     │
│                                                              │
│  💬 Deux modes de chat :                                     │
│     • Mode Solo   → 1 modèle (comme ChatGPT)                │
│     • Mode Hive   → 3 modèles + consensus                   │
│                                                              │
│  🔌 Multi-plateforme :                                       │
│     • Web App (Next.js + Vercel)                            │
│     • Claude Code (MCP + /hive)                             │
│     • ChatGPT (Custom GPT - futur)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Technique

### Stack

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Stockage clés | localStorage (chiffré) |
| Stockage conversations | localStorage / IndexedDB |
| Hébergement | Vercel (gratuit) |
| MCP (Claude Code) | TypeScript |

### Structure du repo

```
hivemind/
│
├── apps/
│   └── web/                    # Application Next.js
│       ├── app/
│       │   ├── page.tsx        # Page principale (chat)
│       │   ├── settings/       # Page paramètres (clés API)
│       │   └── api/            # API routes (optionnel)
│       ├── components/
│       │   ├── Chat.tsx
│       │   ├── Message.tsx
│       │   ├── ModelSelector.tsx
│       │   ├── HivemindToggle.tsx
│       │   └── ApiKeySettings.tsx
│       ├── lib/
│       │   ├── providers/
│       │   │   ├── openai.ts
│       │   │   ├── anthropic.ts
│       │   │   └── google.ts
│       │   ├── hivemind.ts     # Logique consensus
│       │   ├── storage.ts      # Gestion localStorage
│       │   └── crypto.ts       # Chiffrement clés
│       └── package.json
│
├── packages/
│   ├── core/                   # Logique partagée
│   │   ├── src/
│   │   │   ├── consensus.ts    # Algorithme de consensus
│   │   │   ├── providers.ts    # Abstraction providers
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── mcp/                    # MCP pour Claude Code
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── .claude/
│   └── commands/
│       └── hive.md             # Slash command /hive
│
├── package.json                # Monorepo (pnpm workspaces)
├── pnpm-workspace.yaml
├── README.md
├── LICENSE                     # MIT
└── vercel.json
```

---

## ✨ Features MVP (v1.0)

### Web App

- [ ] **Gestion des clés API**
  - [ ] Formulaire ajout clés (OpenAI, Anthropic, Google)
  - [ ] Stockage chiffré localStorage
  - [ ] Validation des clés (test API)
  - [ ] Indicateur visuel clés configurées

- [ ] **Chat interface**
  - [ ] Zone de saisie message
  - [ ] Affichage messages (user + assistant)
  - [ ] Support markdown dans les réponses
  - [ ] Syntax highlighting code

- [ ] **Mode Solo**
  - [ ] Sélecteur de modèle (dropdown)
  - [ ] Appel API direct au provider
  - [ ] Streaming des réponses

- [ ] **Mode Hivemind** ⭐
  - [ ] Toggle Solo/Hivemind
  - [ ] Appels parallèles à 3 modèles
  - [ ] Affichage des 3 réponses
  - [ ] Génération du consensus (par Claude ou GPT)
  - [ ] Mise en avant du consensus final

- [ ] **Historique**
  - [ ] Sauvegarde conversations localStorage
  - [ ] Liste des conversations (sidebar)
  - [ ] Nouvelle conversation
  - [ ] Suppression conversation

### MCP Claude Code

- [ ] **Installation simple**
  ```bash
  claude mcp add hivemind
  ```

- [ ] **Outil `hivemind`**
  - [ ] Paramètre `question` (required)
  - [ ] Paramètre `models` (optional, default: gpt-4, claude, gemini)
  - [ ] Retourne le consensus

- [ ] **Slash command `/hive`**
  - [ ] Fichier `.claude/commands/hive.md`
  - [ ] Utilise l'outil hivemind du MCP

---

## 📱 Maquettes UI

### Écran principal

```
┌─────────────────────────────────────────────────────────────┐
│  🐝 Hivemind                    [Solo 🔘] [Hive 🔵]    ⚙️   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Historique  │   💬 Comment puis-je structurer mon API ?   │
│              │                                              │
│  □ Conv 1    │   ┌────────────────────────────────────────┐ │
│  □ Conv 2    │   │ 🧠 HIVEMIND CONSENSUS                  │ │
│  ■ Conv 3    │   │                                        │ │
│              │   │ Les 3 modèles s'accordent sur :        │ │
│              │   │ • Architecture REST avec versioning    │ │
│              │   │ • Utiliser des DTOs                    │ │
│              │   │ • Implémenter rate limiting            │ │
│              │   └────────────────────────────────────────┘ │
│              │                                              │
│              │   ┌──────────┬──────────┬──────────┐        │
│              │   │  GPT-4   │  Claude  │  Gemini  │        │
│              │   │  ......  │  ......  │  ......  │        │
│              │   └──────────┴──────────┴──────────┘        │
│              │                                              │
│  [+ New]     ├──────────────────────────────────────────────┤
│              │  [Écrivez votre message...]          [Envoyer]│
└──────────────┴──────────────────────────────────────────────┘
```

### Écran paramètres

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Paramètres                                    [← Retour]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔑 Clés API                                                │
│                                                              │
│  OpenAI        [sk-xxxxxxxxxxxxx...] ✅ Valide   [Modifier] │
│  Anthropic     [Non configuré]                   [Ajouter]  │
│  Google AI     [AIza-xxxxxxxxxxxx...] ✅ Valide  [Modifier] │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🐝 Mode Hivemind                                           │
│                                                              │
│  Modèles par défaut :                                       │
│  ☑️ GPT-4o                                                  │
│  ☑️ Claude Sonnet                                           │
│  ☑️ Gemini Pro                                              │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💾 Données                                                  │
│                                                              │
│  [Exporter conversations]  [Effacer tout]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Algorithme de Consensus

```typescript
async function getHivemindConsensus(question: string, apiKeys: ApiKeys) {
  // 1. Appels parallèles aux 3 modèles
  const [gptResponse, claudeResponse, geminiResponse] = await Promise.all([
    callOpenAI(question, apiKeys.openai),
    callAnthropic(question, apiKeys.anthropic),
    callGoogle(question, apiKeys.google),
  ]);

  // 2. Générer le consensus (via le modèle le plus capable disponible)
  const consensusPrompt = `
    Tu as reçu 3 réponses de différents modèles IA à la question : "${question}"
    
    Réponse GPT-4 : ${gptResponse}
    Réponse Claude : ${claudeResponse}  
    Réponse Gemini : ${geminiResponse}
    
    Analyse ces 3 réponses et génère un CONSENSUS qui :
    - Identifie les points d'accord
    - Signale les divergences importantes
    - Propose une synthèse équilibrée
  `;

  const consensus = await callOpenAI(consensusPrompt, apiKeys.openai);

  return {
    consensus,
    responses: {
      gpt: gptResponse,
      claude: claudeResponse,
      gemini: geminiResponse,
    },
  };
}
```

---

## 💰 Stratégie de Monétisation (Future)

### Phase 1 : Gratuit (Mois 1-6)
- 100% gratuit
- Open source
- Objectif : 1000 users, 500 GitHub stars

### Phase 2 : Freemium (Mois 6+)

| Gratuit | Pro ($29 one-time) |
|---------|-------------------|
| 3 modèles | Tous les modèles |
| Historique local | Sync cloud |
| - | Custom prompts système |
| - | Export PDF |
| - | Thèmes |

### Phase 3 : Teams (Mois 12+)

| Pro | Team ($9/user/mois) |
|-----|---------------------|
| Tout Pro | Workspaces partagés |
| - | Admin dashboard |
| - | SSO |
| - | Analytics |

---

## 📅 Roadmap de Développement

### Sprint 1 : Setup & Core (Semaine 1)
- [ ] Init repo monorepo (pnpm)
- [ ] Setup Next.js app
- [ ] Setup Tailwind + shadcn/ui
- [ ] Composants UI de base
- [ ] Gestion clés API (localStorage)

### Sprint 2 : Chat Solo (Semaine 2)
- [ ] Interface chat
- [ ] Intégration OpenAI
- [ ] Intégration Anthropic
- [ ] Intégration Google AI
- [ ] Streaming réponses
- [ ] Historique local

### Sprint 3 : Mode Hivemind (Semaine 3)
- [ ] Toggle Solo/Hivemind
- [ ] Appels parallèles
- [ ] Affichage multi-réponses
- [ ] Génération consensus
- [ ] UI consensus

### Sprint 4 : MCP & Polish (Semaine 4)
- [ ] Package MCP
- [ ] Slash command /hive
- [ ] Tests
- [ ] Documentation README
- [ ] Deploy Vercel
- [ ] Publication npm (MCP)

### Sprint 5 : Launch (Semaine 5)
- [ ] Landing page
- [ ] ProductHunt prep
- [ ] GitHub release
- [ ] Annonce Twitter/LinkedIn

---

## 🚀 Commandes de Développement

### Installation
```bash
# Clone
git clone https://github.com/[username]/hivemind.git
cd hivemind

# Install dependencies
pnpm install

# Setup environment
cp apps/web/.env.example apps/web/.env.local
```

### Développement
```bash
# Lancer l'app web
pnpm dev

# Build
pnpm build

# Lancer le MCP en local
pnpm --filter @hivemind/mcp dev
```

### Déploiement
```bash
# Deploy sur Vercel (automatique via GitHub)
git push origin main

# Publier le MCP sur npm
cd packages/mcp
npm publish
```

---

## 📝 Commits Recommandés

```bash
# Sprint 1
git commit -m "chore: init monorepo with pnpm workspaces"
git commit -m "feat: setup Next.js app with Tailwind"
git commit -m "feat: add shadcn/ui components"
git commit -m "feat: add API key management with encrypted localStorage"

# Sprint 2
git commit -m "feat: add chat interface components"
git commit -m "feat: integrate OpenAI provider"
git commit -m "feat: integrate Anthropic provider"
git commit -m "feat: integrate Google AI provider"
git commit -m "feat: add response streaming"
git commit -m "feat: add conversation history"

# Sprint 3
git commit -m "feat: add Hivemind mode toggle"
git commit -m "feat: add parallel API calls"
git commit -m "feat: add multi-response display"
git commit -m "feat: add consensus generation"
git commit -m "feat: add consensus UI"

# Sprint 4
git commit -m "feat: add MCP package"
git commit -m "feat: add /hive slash command"
git commit -m "docs: add README"
git commit -m "chore: configure Vercel deployment"

# Sprint 5
git commit -m "feat: add landing page"
git commit -m "chore: prepare v1.0.0 release"
```

---

## 📚 Ressources

### APIs
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Google AI (Gemini)](https://ai.google.dev/docs)

### MCP
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Code MCP](https://docs.anthropic.com/claude-code/mcp)

### Inspirations
- [TypingMind](https://typingmind.com) - UI référence
- [LibreChat](https://github.com/danny-avila/LibreChat) - Open source
- [PAL MCP](https://github.com/BeehiveInnovations/pal-mcp-server) - Multi-model

---

## 📄 License

MIT License - Open Source

---

**Créé le :** 2025-01-07
**Auteur :** [Ton nom]
**Repo :** github.com/[username]/hivemind
