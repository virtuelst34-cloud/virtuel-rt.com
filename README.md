# Virtuel.st - Application de Chat en Temps Réel

## 📋 Description

Virtuel.st est une application de chat en temps réel moderne et interactive avec des fonctionnalités avancées de gestion de communauté, de gamification (XP, niveaux, badges), et de modération.

## 🚀 Fonctionnalités

### Chat en Temps Réel
- **Salons multiples** : Salons par défaut (musique, débat, quiz, etc.) et salons personnalisés
- **Messages riches** : Support des réactions, mentions, et messages directs
- **Gestion des médias** : Partage d'images et fichiers
- **Emoji picker** : Sélecteur d'emojis intégré

### Gamification
- **Système XP** : Gain d'expérience pour les activités
- **Niveaux** : Progression avec badges diamant personnalisables
- **Badges spéciaux** : Fondateur, modérateur, VIP
- **Classements** : Top XP mensuel et global

### Gestion de Communauté
- **Profils utilisateurs** : Avatars, statuts, préférences
- **Messages directs** : Chat privé entre utilisateurs
- **Notifications** : Système de notifications en temps réel
- **Recherche** : Recherche d'utilisateurs et de messages

### Modération
- **Panneau d'administration** : Interface complète de gestion
- **Bannissement/Mute** : Gestion des sanctions
- **Gestion des salons** : Création, modification, suppression
- **Surveillance** : Rapports d'activité et statistiques

### Accessibilité
- **Navigation au clavier** : Support complet du clavier
- **ARIA labels** : Labels sémantiques pour lecteurs d'écran
- **Contraste élevé** : Conformité aux standards WCAG
- **Focus management** : Gestion du focus pour les modales et formulaires

## 🛠️ Technologies

### Frontend
- **React 18** : Framework UI avec hooks
- **TypeScript** : Typage statique
- **Vite** : Build tool et dev server
- **Tailwind CSS** : Framework CSS utilitaire
- **Radix UI** : Composants accessibles
- **Framer Motion** : Animations fluides
- **Lucide React** : Icônes modernes

### State Management
- **React Context API** : Gestion d'état globale
- **Contexts personnalisés** : User, Messages, Salons, XP, Moderation, Badges, Notifications, Preferences, DM, UI

### Validation
- **Zod** : Validation de schémas TypeScript
- **React Hook Form** : Gestion de formulaires

### Testing
- **Vitest** : Framework de tests unitaires
- **React Testing Library** : Tests de composants
- **Playwright** : Tests E2E
- **Coverage** : Couverture de tests avec @vitest/coverage-v8
- **Axe-core** : Tests d'accessibilité

## 📁 Structure du Projet

```
virtuel-st/
├── src/
│   ├── components/
│   │   ├── chat/              # Composants de chat
│   │   │   ├── admin/         # Sous-composants AdminPanel
│   │   │   ├── ChatArea.tsx   # Zone de chat principale
│   │   │   ├── ChatInput.tsx  # Input de messages avec validation
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── AdminPanel.tsx # Panneau d'administration
│   │   │   └── ...
│   │   └── ui/                # Composants UI réutilisables
│   ├── lib/
│   │   ├── contexts/          # Contextes React
│   │   │   ├── UserContext.tsx
│   │   │   ├── MessagesContext.tsx
│   │   │   ├── SalonsContext.tsx
│   │   │   ├── XPContext.tsx
│   │   │   ├── ModerationContext.tsx
│   │   │   ├── BadgesContext.tsx
│   │   │   └── ...
│   │   ├── validation.ts      # Schémas Zod
│   │   ├── chatConfig.ts      # Configuration des salons
│   │   ├── diamondBadges.ts   # Configuration des badges
│   │   └── sanitizer.ts       # Sanitization XSS
│   ├── test/
│   │   ├── components/        # Tests de composants
│   │   ├── contexts/          # Tests de contextes
│   │   ├── hooks/             # Tests de hooks
│   │   └── utils/             # Utilitaires de test
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🔧 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd virtuel-st
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
Créer un fichier `.env.local` :
```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_BASE44_API_KEY=your_api_key
```

4. **Valider la configuration**
```bash
node validate-env.js
```

5. **Lancer l'application**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 🧪 Tests

### Exécuter tous les tests
```bash
npm test
```

### Exécuter les tests avec UI
```bash
npm run test:ui
```

### Exécuter les tests en mode CI
```bash
npm run test:run
```

### Couverture de tests
```bash
npm run test:run -- --coverage
```

**Objectif** : Couverture > 70%

## 📝 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build pour production |
| `npm run preview` | Preview du build de production |
| `npm run lint` | Linting du code |
| `npm test` | Exécute les tests en mode watch |
| `npm run test:ui` | Interface UI pour les tests |
| `npm run test:run` | Exécute les tests une fois |
| `npm run test:e2e` | Exécute les tests E2E avec Playwright |
| `npm run test:e2e:ui` | Interface UI pour les tests E2E |
| `npm run storybook` | Lance Storybook pour documentation |
| `npm run build-storybook` | Build de Storybook |
| `npm run load-test` | Exécute les tests de charge avec k6 |

## ♿ Accessibilité

### Fonctionnalités d'accessibilité implémentées

1. **Navigation au clavier**
   - Tab navigation ordonnée
   - Raccourcis clavier pour actions courantes
   - Focus visible sur éléments interactifs

2. **ARIA Labels**
   - Labels descriptifs pour lecteurs d'écran
   - Roles sémantiques (button, dialog, etc.)
   - États ARIA (aria-expanded, aria-pressed, etc.)

3. **Contraste**
   - Ratio de contraste WCAG AA minimum
   - Texte lisible sur tous les fonds

4. **Focus Management**
   - Focus trap dans les modales
   - Restoration du focus après fermeture
   - Focus visible sur tous les éléments

### Tests d'accessibilité

Pour tester l'accessibilité :
```bash
npm run test:run -- accessibility
```

## 🔒 Sécurité

### Mesures de sécurité

1. **Sanitization XSS**
   - Messages sanitizés avant affichage
   - Échappement HTML automatique
   - Validation des entrées utilisateur

2. **Validation des entrées**
   - Schémas Zod pour validation
   - Longueur maximale des messages
   - Filtrage des caractères dangereux

3. **Modération**
   - Système de bannissement
   - Mute temporaire
   - Rapports d'abus

## 📊 Statistiques et Monitoring

### Panneau d'administration

Le panneau d'administration fournit :
- **Statistiques utilisateurs** : Total, actifs, bannis, mutés
- **Activité par salon** : Messages par salon
- **Top XP** : Classement mensuel et global
- **Gestion des salons** : Création et suppression
- **Gestion des badges** : Personnalisation des badges diamant
- **Modération** : Vue d'ensemble des sanctions

## 🤝 Contribution

### Guidelines de contribution

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Standards de code

- **TypeScript** strict
- **ESLint** pour linting
- **Prettier** pour formatting
- **Tests** requis pour nouvelles fonctionnalités
- **Accessibilité** : Respecter les standards WCAG

## 🐛 Dépannage

### Problèmes courants

#### Erreur de connexion
- Vérifier les variables d'environnement
- S'assurer que le backend est accessible
- Vérifier la connexion internet

#### Erreur de build
- Nettoyer le cache : `rm -rf node_modules dist`
- Réinstaller les dépendances : `npm install`
- Vérifier la version de Node.js

#### Tests échouent
- Mettre à jour les snapshots : `npm test -- -u`
- Vérifier les dépendances de test
- Nettoyer le cache de Vitest

## 📄 Licence

Ce projet est sous licence propriétaire.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de support
- Consulter la documentation

---

## Dépannage après déploiement

Besoin d'aide ?

Découvrez les problèmes courants après le déploiement et comment les résoudre.

### App ID invalide

Vérifiez que `VITE_BASE44_APP_ID` correspond à l'ID de votre application dans Base44.

### URL de base invalide

Vérifiez que `VITE_BASE44_APP_BASE_URL` correspond à l'URL de votre backend Base44.

### Clé API invalide

Vérifiez que `VITE_BASE44_API_KEY` correspond à la clé API dans Base44 → Paramètres du projet → Clés API.

### Variable d'environnement non définie

Vérifiez les déploiements → Variables d'environnement pour confirmer que `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL` et `VITE_BASE44_API_KEY` ont été enregistrées.

### Erreur de configuration

Si vous voyez des erreurs dans la console au démarrage :
- ❌ `VITE_BASE44_APP_ID is not defined` : Vérifiez que la variable est définie dans `.env.local`
- ❌ `VITE_BASE44_APP_BASE_URL is not defined` : Vérifiez que l'URL de base est configurée
- ❌ `VITE_BASE44_API_KEY is not defined` : Vérifiez que la clé API est configurée
