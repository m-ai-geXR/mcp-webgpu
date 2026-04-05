# Changelog - April 5, 2026

## Session Summary: Scene Controls, UX Improvements, and Bug Fixes

This session delivered major improvements to post-processing controls, chat panel UX, and bug fixes across all 4 framework clients.

---

## 🎨 Comprehensive Scene Controls (Commit: ae0e6cc)

**Added real-time UI controls for post-processing and environment settings across all 4 clients:**

### Post-Processing Controls
- **Bloom Strength** (0-2, step 0.1) - Glow intensity around bright objects
- **Bloom Threshold** (0-1, step 0.01) - Minimum brightness for bloom
- **Exposure** (0-3, step 0.1) - Overall scene brightness/HDR exposure

### Environment Controls
- **Background Color** (color picker) - Scene background
- **Fog Near** (0-100) - Fog start distance
- **Fog Far** (0-1000) - Fog end distance

### Implementation
- Server: Added `update-environment` WebSocket message type
- All clients: Collapsible "🎨 Scene Controls" panel with live value feedback
- Real-time updates via WebSocket on input event (during drag)
- Environment updates merged into state and broadcast to all connected clients

**Files Modified:** 18 total
- Server: `types.ts`, `WSServer.ts`
- Each client: `index.html`, `ChatOverlay.ts`, `ws-client.ts`, `main.ts`/`App.tsx`

---

## 🌈 Chromatic Aberration Control - Three.js (Commit: 212a25e)

**Added framework-specific post-processing control for Three.js:**

- **Chromatic Aberration Intensity** (0-0.05, step 0.001)
- Fine-grained control for precise color fringing adjustment
- Displays value with 3 decimal places
- Clearly labeled "(Three.js only)" in UI
- Sends environment update: `{ chromaticAberration: { offset: value } }`

**Why Three.js only:** Different frameworks have different post-processing capabilities. Controls are framework-specific.

---

## 🔧 Chat Panel UX Improvements (Commit: 4998e84)

### Problem 1: Controls Blocked by Messages
When AI sent long responses, chat messages would expand and push system prompt, model parameters, and scene controls out of view with no scrolling.

### Solution
- Created `#chat-controls-wrapper` with independent scrolling (max-height: 200px)
- Changed `#chat-messages` to max-height: 250px with min-height: 100px
- Both sections now scroll independently
- **Result:** Users can ALWAYS access all controls even during long AI responses

### Problem 2: A-Frame Showing Unsupported Controls
A-Frame was incorrectly showing bloom/exposure controls that didn't work.

### Solution (Later Corrected - See Below)
- Initially removed unsupported controls
- Added explanatory note about limitations
- **Note:** This was later corrected when A-Frame v1.7.0 post-processing was confirmed

**Applied to:** All 4 clients (Three.js, A-Frame, Babylon.js, R3F)

---

## ✅ A-Frame Post-Processing Restoration (Commit: 2ae65f0)

### Issue
Previous commit incorrectly removed bloom and exposure controls from A-Frame, assuming it lacked post-processing support.

### Correction
User correctly identified that **A-Frame v1.7.0 HAS post-processing support**.

### Fix
- **Re-added bloom controls** (strength, threshold) to A-Frame client
- **Re-added exposure control** to A-Frame client
- A-Frame uses Three.js `EffectComposer` + `UnrealBloomPass` under the hood
- Verified by checking `scene.ts` implementation (imports on lines 18-21, usage lines 36-37)
- Restored all TypeScript properties and event listeners

---

## 🐛 Chromatic Aberration Disable Fix (Commit: 2ae65f0)

### Problem
Once chromatic aberration slider moved from 0, the effect remained active even when slider returned to 0.

### Root Causes
1. UI was sending incorrect format: `{ chromaticAberration: number }`
   - Should be: `{ chromaticAberration: { offset: number } }`
2. No logic to disable the ShaderPass when offset = 0

### Fix
- **ChatOverlay.ts:210** - Changed to send correct format: `{ chromaticAberration: { offset: value } }`
- **scene.ts:619** - Added: `this.chromaticAberrationPass.enabled = offset > 0;`
- **Result:** When slider is at 0, pass is disabled (no performance cost or visual effect)

---

## 📊 Framework-Specific Capabilities Summary

After all fixes, here's what each framework supports:

| Effect | Three.js | A-Frame | Babylon.js | R3F |
|--------|----------|---------|------------|-----|
| Bloom (Strength/Threshold) | ✅ | ✅ | ✅ | ✅ |
| Exposure | ✅ | ✅ | ✅ | ✅ |
| Chromatic Aberration | ✅ | ❌ | ❌ | ❌ |
| Background Color | ✅ | ✅ | ✅ | ✅ |
| Fog (Near/Far) | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 Demo Prompts Provided

Provided 10 spectacular demonstration prompts covering:
- **Demoscene effects:** Tunnel effect, cube lattice, plasma metaballs
- **Vaporwave aesthetics:** Sunset grid, neon pyramids, glitch cubes
- **Star Wars scenes:** Death Star trench, lightsaber duel, space battle
- **Ultimate showcase:** Hybrid demoscene-vaporwave-sci-fi spectacular

Each prompt stress-tests different capabilities: geometry, materials, particles, post-processing, environment, lighting, and animation.

---

## 📈 Commits Summary

1. **3007a2c** - iOS parity with temperature/top-p controls + creative enhancements
2. **ae0e6cc** - Comprehensive scene controls (bloom, exposure, fog, background)
3. **212a25e** - Chromatic aberration control for Three.js
4. **4998e84** - Chat panel UX improvements (independent scrolling)
5. **2ae65f0** - A-Frame post-processing restoration + chromatic aberration disable fix
6. **5954b23** - Documentation: Added screenshot of UX issue

---

## 🚀 Impact

- **Better UX:** Chat controls always accessible, no matter how long AI responses are
- **More control:** 6+ new environment/post-processing controls per client
- **Framework parity:** All clients have appropriate controls for their capabilities
- **Bug fixes:** Chromatic aberration properly toggles on/off
- **Accuracy:** A-Frame post-processing correctly supported

All TypeScript compiles successfully. Ready for production use.
