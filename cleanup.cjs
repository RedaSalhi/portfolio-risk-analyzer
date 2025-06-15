#!/usr/bin/env node

/**
 * Script de nettoyage pour supprimer les fichiers template inutiles d'Expo
 * et créer une structure propre pour l'application financière
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Démarrage du nettoyage des fichiers template...\n');

// Fichiers et dossiers à supprimer
const filesToDelete = [
  'app-example',           // Dossier d'exemple Expo
  'app',                   // Dossier app par défaut (on utilise src/)
  'scripts/reset-project.js', // Script de reset pas nécessaire
  'assets/images',         // Images d'exemple
  'components',            // Composants d'exemple
  'constants',             // Constantes d'exemple
  'hooks',                 // Hooks d'exemple
];

// Dossiers à créer
const dirsToCreate = [
  'src',
  'src/screens',
  'src/components',
  'src/utils',
  'assets/documents',
];

function deleteFileOrDir(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ Supprimé le dossier: ${filePath}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`✅ Supprimé le fichier: ${filePath}`);
      }
    } else {
      console.log(`⚠️  N'existe pas: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression de ${filePath}:`, error.message);
  }
}

function createDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Créé le dossier: ${dirPath}`);
    } else {
      console.log(`⚠️  Existe déjà: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la création de ${dirPath}:`, error.message);
  }
}

// Étape 1: Supprimer les fichiers inutiles
console.log('📁 Suppression des fichiers template...');
filesToDelete.forEach(deleteFileOrDir);

// Étape 2: Créer la structure de dossiers
console.log('\n📁 Création de la structure de dossiers...');
dirsToCreate.forEach(createDirectory);

// Étape 3: Créer un fichier README mis à jour
const newReadme = `# Portfolio Optimization & VaR Analysis App

Application mobile de finance quantitative développée avec React Native et Expo.

## 🚀 Fonctionnalités

- **Portfolio Optimizer**: Optimisation selon Markowitz et CAPM
- **Value-at-Risk Analysis**: Calculs VaR (Parametric, Monte Carlo, Portfolio, Fixed Income)
- **Profil & Bibliographie**: Informations personnelles et références académiques

## 📱 Démarrage

1. Installer les dépendances:
   \`\`\`bash
   npm install
   \`\`\`

2. Lancer l'application:
   \`\`\`bash
   npx expo start
   \`\`\`

3. Scanner le QR code avec Expo Go ou utiliser un émulateur

## 🏗️ Structure

\`\`\`
src/
├── screens/
│   ├── HomeScreen.js
│   ├── PortfolioOptimizerScreen.js
│   ├── VaRAnalysisScreen.js
│   └── AboutScreen.js
├── components/
└── utils/
\`\`\`

## 👨‍💼 Auteur

**SALHI Reda**  
Étudiant en Génie Financier - Centrale Méditerranée
`;

try {
  fs.writeFileSync('README.md', newReadme);
  console.log('✅ README.md mis à jour');
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour du README:', error.message);
}

// Étape 4: Créer un .gitignore propre
const newGitignore = `# Dépendances
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# Fichiers d'environnement
.env*.local

# TypeScript
*.tsbuildinfo

# Fichiers temporaires
*.log
*.tmp
`;

try {
  fs.writeFileSync('.gitignore', newGitignore);
  console.log('✅ .gitignore mis à jour');
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour du .gitignore:', error.message);
}

console.log('\n🎉 Nettoyage terminé!');
console.log('\n📋 Prochaines étapes:');
console.log('1. Copier les fichiers screens dans src/screens/');
console.log('2. Remplacer App.js par la nouvelle version');
console.log('3. Tester l\'application avec: npx expo start');
console.log('\n✨ Votre app est maintenant prête!');