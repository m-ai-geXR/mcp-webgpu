# maige-3d-mcp Visual Improvements

**Date**: April 1, 2026
**Status**: Ready for Review and Testing

## Problem Statement

Generated scenes had a "sterile" appearance due to:
- Sci-fi-biased system prompt that didn't adapt to other styles (fantasy, realistic, architectural, etc.)
- High bloom threshold (0.85) preventing most emissive materials from glowing
- Blue default material color (#4488ff) with low metalness (0.1) creating plastic-looking surfaces
- Conservative lighting intensity
- Missing normal map and roughness map support

---

## Changes Implemented

### 1. ✅ **Style-Agnostic System Prompt**
**File**: `packages/server/src/chat/ChatRelay.ts`

**Before**:
- Example was a "glowing sci-fi corridor"
- Material recipes focused on glowing/metallic/neon
- Particle recipes: starfield, fireflies, sparks (all sci-fi themed)
- Post-FX recipe literally called "Sci-fi"
- Final instruction: "Use emissive materials, particles, bloom... generously"

**After**:
- Added opening line: "Adapt your style to match the user's request — realistic, fantasy, sci-fi, architectural, horror, abstract, or any aesthetic"
- Material recipes organized by style:
  - **Realistic/Natural**: Wood, stone, metal, fabric, grass
  - **Architectural/Modern**: Concrete, glass, painted wall, polished metal, marble
  - **Fantasy/Magical**: Glowing crystal, ancient stone, magical glow, gold
  - **Sci-fi/Tech**: Neon panel, carbon fiber, hologram
  - **Horror/Dark**: Decayed wood, rust, blood, dark metal
- Particle recipes by purpose (not style):
  - Ambient space (stars, snow)
  - Floating lights (fireflies, embers)
  - Atmosphere (dust, fog)
  - Weather (rain, leaves)
  - Magic/energy
- Post-FX recipes:
  - ~~"Sci-fi"~~ → "High Contrast"
  - Added: "Natural/Subtle", "Moody/Dark"
- Lighting guide by style:
  - Natural, Indoor, Dramatic, Moody, Sci-fi
- Example changed from sci-fi corridor to **serene garden scene**
- Final instruction: "Balance detail with performance" (not prescriptive about glow)

---

### 2. ✅ **Lower Bloom Threshold for More Visible Glow**

**Three.js** (`packages/client-threejs/src/scene.ts:112`)
```typescript
// Before: 0.85 (very high - only extremely bright things glow)
// After:  0.5  (more materials will have subtle, visible glow)
```

**Babylon.js** (`packages/client-babylonjs/src/scene.ts:128, 586`)
```typescript
// Before: 0.8
// After:  0.5
```

**Impact**: Emissive materials with intensity 1.0-2.0 will now glow subtly, creating more atmospheric scenes without requiring intensity values of 3.0+.

---

### 3. ✅ **Improved Default Materials**

**All 4 Clients Updated**:

| Property | Before | After | Reason |
|----------|--------|-------|--------|
| **Color** | `#4488ff` (blue) | `#cccccc` (neutral grey) | Works with any style, not sci-fi specific |
| **Metalness** | `0.1` | `0.3` | More realistic PBR, less plastic-looking |
| **Roughness** | `0.7` | `0.6` | Slightly smoother, more varied surface appearance |

**Files Updated**:
- `packages/client-threejs/src/scene.ts:657, 672-673`
- `packages/client-babylonjs/src/scene.ts:703, 708-709`
- `packages/client-aframe/src/scene.ts:118`
- `packages/client-r3f/src/SceneCanvas.tsx:165, 169-170`

---

### 4. ✅ **Normal Map & Roughness Map Support**

**Before**: Defined in type system but not implemented in clients.

**After**: Fully implemented in Three.js and Babylon.js clients.

**Three.js** (`packages/client-threejs/src/scene.ts:681-683`)
```typescript
if (def.normalMapUrl) mat.normalMap = this.loader.load(def.normalMapUrl);
if (def.roughnessMapUrl) mat.roughnessMap = this.loader.load(def.roughnessMapUrl);
```

**Babylon.js** (`packages/client-babylonjs/src/scene.ts:716-717`)
```typescript
if (def.normalMapUrl) mat.bumpTexture = new Texture(def.normalMapUrl, this.scene);
if (def.roughnessMapUrl) mat.metallicTexture = new Texture(def.roughnessMapUrl, this.scene);
```

**Impact**: Surfaces can now have fine detail and varied roughness without adding geometry. AI can reference texture URLs for realistic materials.

---

### 5. ✅ **Warmer, More Intense Lighting**

**Three.js** (`packages/client-threejs/src/scene.ts:80-81`)
```typescript
// Before: 0xffffff (pure white), intensity 0.8
// After:  0xFFF5E6 (warm white), intensity 1.2
```

**Babylon.js** (`packages/client-babylonjs/src/scene.ts:110-113`)
```typescript
// Before: pure white, intensity 0.8
// After:  #FFF5E6 (warm white), intensity 1.2
```

**Impact**:
- 50% increase in key light intensity (0.8 → 1.2)
- Warmer color temperature creates more natural, inviting scenes
- Better matches real-world sunlight

---

## Expected Results

### Before
- ❌ Scenes looked sterile, blue-tinted, plastic-like
- ❌ AI generated sci-fi aesthetic regardless of request
- ❌ Emissive materials barely glowed
- ❌ Flat, cold lighting
- ❌ No surface detail without geometry

### After
- ✅ Neutral grey defaults work with any style
- ✅ AI adapts to requested aesthetic (realistic, fantasy, architectural, horror, etc.)
- ✅ Emissive materials have subtle, atmospheric glow
- ✅ Warmer, more natural lighting
- ✅ Normal maps and roughness maps add surface detail

---

## Testing Checklist

### Build & Run
```bash
cd /mnt/c/Users/brend/exp/maigeXR/mcp-webgpu
pnpm build:server
pnpm dev
```

### Test Scenarios

1. **Realistic Scene**: "Create a wooden table with stone floor and natural sunlight"
   - Should use browns, greys, low metalness
   - Warm lighting
   - No neon or glow

2. **Fantasy Scene**: "Create a magical crystal cavern with glowing gems"
   - Should use purples, blues, emissive crystals
   - Atmospheric particles
   - Moderate bloom

3. **Architectural Scene**: "Create a modern minimalist gallery with white walls"
   - Should use whites, greys, concrete materials
   - Clean lighting
   - Subtle post-processing

4. **Horror Scene**: "Create a dark abandoned room with decayed walls"
   - Should use dark colors, rust, decay
   - Low, moody lighting
   - Heavy vignette

5. **Sci-fi Scene** (should still work!): "Create a neon-lit cyberpunk corridor"
   - Should use neon colors, metallic surfaces
   - Emissive panels
   - Strong bloom

### Visual Checks

- [ ] Default objects (no material specified) appear neutral grey, not blue
- [ ] Emissive materials with intensity 1.0-2.0 have visible glow
- [ ] Scenes feel warmer and more inviting
- [ ] AI responds appropriately to different style requests
- [ ] Normal maps work (if testing with texture URLs)
- [ ] All 4 clients (Three.js, A-Frame, Babylon.js, R3F) behave consistently

---

## Next Steps (If Approved)

### Additional Improvements to Consider

1. **HDRI Environment Support**
   - Add tool parameter: `{"action":"setEnvironment", "hdri":"studio|forest|sunset|indoor|night"}`
   - Richer reflections and ambient lighting
   - Free HDRIs from polyhaven.com

2. **Lighting Presets Tool**
   - `{"action":"setLightingPreset", "preset":"natural|dramatic|soft|moody|bright"}`
   - One-command lighting setup
   - Consistent results across styles

3. **Material Presets Tool**
   - `{"action":"applyMaterialPreset", "id":"<id>", "preset":"wood|stone|metal|glass|fabric"}`
   - Quick material application
   - Could include texture URLs

4. **Procedural Textures**
   - Built-in noise, checkerboard, gradient patterns
   - No external URLs needed
   - Faster iteration

5. **Enhanced Default Background**
   - Gradient sky instead of solid color
   - Procedural ground plane with subtle detail
   - Better depth perception

6. **Post-FX Presets from UI**
   - Client-side preset buttons
   - Preview different looks without AI chat
   - Faster experimentation

---

## Files Modified

### Server
- `packages/server/src/chat/ChatRelay.ts` (system prompt rewrite)

### Clients
- `packages/client-threejs/src/scene.ts` (bloom, materials, lighting, texture maps)
- `packages/client-babylonjs/src/scene.ts` (bloom, materials, lighting, texture maps)
- `packages/client-aframe/src/scene.ts` (default color)
- `packages/client-r3f/src/SceneCanvas.tsx` (default materials)

**Total Lines Changed**: ~50 lines across 5 files

---

## Rollback Instructions

If issues arise, revert with:
```bash
git checkout HEAD~1 packages/server/src/chat/ChatRelay.ts
git checkout HEAD~1 packages/client-threejs/src/scene.ts
git checkout HEAD~1 packages/client-babylonjs/src/scene.ts
git checkout HEAD~1 packages/client-aframe/src/scene.ts
git checkout HEAD~1 packages/client-r3f/src/SceneCanvas.tsx
```

---

## Questions for Review

1. **System prompt length**: The new prompt is longer (more material recipes). Is this acceptable, or should we trim?

2. **Default metalness 0.3**: Is this too high for some use cases? Could make it 0.25 as a compromise.

3. **Bloom threshold 0.5**: This is a significant change. If too much glow, we can raise to 0.6.

4. **HDRI support**: Should we implement this next, or focus on other improvements?

5. **Are there any specific styles or scenarios you want to prioritize testing?**

---

**Ready for your review!** Please test and let me know what you think.
