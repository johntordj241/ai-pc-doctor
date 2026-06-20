# AI_DIAGNOSTIC_RULES — Règles métier du moteur de diagnostic IA

Document de référence. Toute évolution du moteur IA doit respecter ces règles.

## 1. Principes fondamentaux

L'IA est un **médecin spécialisé en performances PC**. Elle :

- s'appuie **uniquement** sur les métriques réelles fournies dans le snapshot ;
- ne doit **jamais** inventer : données, causes, températures, pourcentages, conclusions, processus ;
- refuse explicitement d'analyser des données simulées (mode démo) ;
- s'exprime en français clair, sans jargon, pour un utilisateur non technique.

## 2. Classification des métriques

### CPU (%)
| Plage | Statut |
|-------|--------|
| 0–50 % | Normal |
| 50–80 % | Surveillance |
| 80–90 % | Élevé |
| 90–100 % | Critique |

### RAM (% utilisée)
| Plage | Statut |
|-------|--------|
| 0–70 % | Normal |
| 70–85 % | Surveillance |
| 85–95 % | Élevé |
| 95–100 % | Critique |

### SSD / Disque (% utilisé)
| Plage | Statut |
|-------|--------|
| 0–80 % | Normal |
| 80–90 % | Surveillance |
| 90–95 % | Élevé |
| 95–100 % | Critique |

### Température CPU (°C)
| Plage | Statut |
|-------|--------|
| 0–70 °C | Normal |
| 70–85 °C | Surveillance |
| 85–95 °C | Élevé |
| 95 °C+ | Critique |

## 3. Priorisation des causes

Chaque diagnostic doit présenter :

1. **Cause principale** (poids ≥ 40 %).
2. **Causes secondaires** (poids cumulés ≈ 100 %).
3. **Impact estimé** sur la perception utilisateur (lenteur, freeze, surchauffe…).
4. **Niveau de confiance** justifié.
5. **Recommandations** classées par gain.

## 4. Niveau de confiance

Le niveau de confiance est calculé en fonction de :

- le **nombre de métriques concordantes** (plus elles convergent, plus la confiance monte) ;
- la **durée du phénomène** (un pic isolé ≠ saturation prolongée) ;
- la **cohérence des mesures** (CPU 95 % + température 90 °C = très cohérent).

Échelle :

| Niveau | Quand l'utiliser |
|--------|------------------|
| `low` | 1 seule métrique anormale, signal isolé |
| `medium` | 2 métriques concordantes |
| `high` | 3+ métriques concordantes, phénomène stable |
| `very_high` | Faisceau de preuves très clair (≥ 4 signaux, processus identifiés) |

**Règle absolue :** ne **jamais** déclarer 100 % de confiance sans justification chiffrée explicite dans `confidenceReason`.

## 5. Structure obligatoire d'un diagnostic

Tout diagnostic produit par l'IA doit contenir :

1. **Résumé exécutif** (1–2 phrases, langage naturel).
2. **Cause principale** (label + poids).
3. **Causes secondaires** (liste pondérée).
4. **Métriques déclencheuses** (`triggers`) — preuves chiffrées : métrique, valeur, seuil, sévérité.
5. **Niveau de confiance** + `confidenceReason`.
6. **Recommandations** : titre, description, gain estimé, niveau de risque (low/medium/high), temps en minutes.
7. **Conclusion** implicite via la sévérité globale (low/medium/high/critical).

## 6. Architecture technique IA

Ordre de fallback :

1. **OpenAI** (`gpt-4o-mini` par défaut) — moteur principal si `OPENAI_API_KEY` est présent.
2. **Lovable AI Gateway** (`google/gemini-3-flash-preview`) — fallback automatique.
3. **Erreur contrôlée** remontée à l'utilisateur si les deux échouent.

Les bascules sont **loguées côté serveur** (`console.warn`) avec la raison.

## 7. Chat diagnostic

Le chat reçoit en contexte système :

- le dernier snapshot réel ;
- le diagnostic IA courant (résumé + causes + triggers) ;
- la classification métier ci-dessus.

Il refuse de répondre à des questions hors périmètre performance/diagnostic PC.
