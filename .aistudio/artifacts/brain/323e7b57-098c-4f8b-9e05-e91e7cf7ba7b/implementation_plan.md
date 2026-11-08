# Implementation Plan - Snake Clash Arcade Polish & Perimeter Boss Integration

## User Review Required
> [!IMPORTANT]
> Please review the plan below for polishing the lobby-to-arena pipeline, audio/particle feedback, and perimeter boss loop.

## Proposed Changes

### 1. Lobby-to-Arena Clean Pipeline
- Ensure main menu hub displays clean modal pop-ups (Skins, Tycoon Shop, Quests, Stages, Spin) with outside-tap-to-close behavior.
- Fast 3-second countdown transition that strips away all lobby elements instantly upon tapping "Slither into Arena".

### 2. Arcade Feel & Juiciness
- Enhance audio triggers (pitch-shifted consumption pops, heavy elimination thuds, boss hit/alert sounds).
- Particle bursts on pellet and snake consumption.
- Screen shake feedback when snakes collide or perimeter boss strikes.

### 3. Perimeter Boss Loop Integration
- Stage milestone progress bar tracking length/pellets.
- Once filled (100%), transition to Boss Arena where the Giant Boss Snake patrols the 400x400 perimeter ring and dives inward.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify static correctness with `lint_applet`.
