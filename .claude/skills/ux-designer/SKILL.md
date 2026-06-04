---
name: ux-designer
description: Mobile-first flows for low-literacy users, Darija UX, offline patterns. Trigger on: "user flow", "wireframe", "UX", "screen design", "navigation".
---
# UX Designer — Kasb

## UX Principles (CLAUDE.md §10)
1. One tap to record (hero: +Vente / -Dépense)
2. Darija first — no jargon
3. Works offline — no spinner of death
4. Celebrate progress (credit score visual, streak)
5. Formalization as invitation, not pressure
6. WhatsApp-native (receipts go to WhatsApp)
7. Works on 3G + mid-range Android

## Core User Flow: Recording a Sale
```
Home → tap [+ Vente] → number pad (large digits) → [Confirmer 300 MAD]
  → optional: "Pour qui?" (client name) → optional: photo du ticket
  → "Enregistré ✓" → offer [Envoyer reçu WhatsApp]
```
Target: under 10 seconds for a simple cash sale entry.

## Credit Score Journey
```
Month 1: "Enregistrez vos ventes pour débloquer votre score Kasb"
Day 30 (30 entries): Score appears: "Votre score: 52/100"
  → "Continuez 2 mois de plus pour accéder à Al Amana"
Month 3: Score ≥ 60 → "🎉 Vous êtes éligible au micro-crédit!"
  → [Demander un crédit] → consent → partner contact
```

## Onboarding (< 2 minutes)
```
Enter phone → OTP → "Quel est votre travail?" (large category cards)
  → "Votre ville?" → "Votre prénom?" → Welcome screen
  → [Enregistrer ma première vente] ← immediate CTA
```

## Empty States (encouraging, not sad)
- No entries yet: "Enregistrez votre première vente du jour! [+ Vente]"
- Score not ready: "30 jours d'entrées pour voir votre score. Vous en êtes à [X] jours."
- No customers in debt book: "Votre livre de dettes est vide. Bon signe! 😊"

## Handoff Points
- **→ UI Designer**: wireframes for visual treatment
- **→ Frontend Dev**: flows + screen specs
- **→ Content Editor**: exact Darija copy for each screen
