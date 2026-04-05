# Implementation Script - Temperature/Top-P UI for Remaining Clients

## Status
- ✅ **Three.js Client**: COMPLETE
- ⏳ **A-Frame Client**: Script below
- ⏳ **Babylon.js Client**: Script below
- ⏳ **R3F Client**: Script below

---

## A-Frame Client Implementation

### 1. Update `packages/client-aframe/index.html`

**Add CSS after line 253 (after `.prompt-hint` style):**

```css
      /* ── Model parameters (temperature, top_p) ────────────────── */
      #model-parameters-section {
        padding: 8px 14px;
        border-bottom: 1px solid rgba(100,100,220,0.15);
        display: none;
      }
      .param-control { margin-bottom: 10px; }
      .param-control:last-child { margin-bottom: 0; }
      .param-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .param-label {
        font-size: 11px;
        font-weight: 600;
        color: #a5b4fc;
      }
      .param-value {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        min-width: 32px;
        text-align: center;
      }
      .param-value.temp {
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
      }
      .param-value.topp {
        background: rgba(74, 222, 128, 0.2);
        color: #4ade80;
      }
      .param-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.1);
        cursor: pointer;
      }
      .param-slider.temp::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #818cf8;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(129, 140, 248, 0.6);
      }
      .param-slider.topp::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
      }
      .param-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
      }
      .param-slider.temp::-moz-range-thumb {
        background: #818cf8;
        box-shadow: 0 0 8px rgba(129, 140, 248, 0.6);
      }
      .param-slider.topp::-moz-range-thumb {
        background: #4ade80;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
      }
      .param-hint {
        display: flex;
        justify-content: space-between;
        margin-top: 2px;
      }
      .param-hint span {
        font-size: 10px;
        color: #4b5563;
      }
      .param-description {
        font-size: 10px;
        color: #6b7280;
        margin-top: 2px;
      }
```

**Add HTML after system-prompt-section:**

```html
      <div id="model-parameters-toggle" style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; cursor: pointer; user-select: none; border-bottom: 1px solid rgba(100,100,220,0.15); font-size: 11px; color: #818cf8; font-weight: 600;">
        🎛 Model Parameters ▾
      </div>
      <div id="model-parameters-section">
        <!-- Temperature Slider -->
        <div class="param-control">
          <div class="param-header">
            <span class="param-label">Temperature</span>
            <span class="param-value temp" id="temperature-value">0.7</span>
          </div>
          <input type="range" id="temperature-slider" class="param-slider temp"
                 min="0" max="2" step="0.1" value="0.7">
          <div class="param-hint">
            <span>0.0 - Focused</span>
            <span>2.0 - Creative</span>
          </div>
        </div>
        <!-- Top-p Slider -->
        <div class="param-control">
          <div class="param-header">
            <span class="param-label">Top-p (Nucleus Sampling)</span>
            <span class="param-value topp" id="topp-value">0.9</span>
          </div>
          <input type="range" id="topp-slider" class="param-slider topp"
                 min="0.1" max="1.0" step="0.1" value="0.9">
          <div class="param-hint">
            <span>0.1 - Precise</span>
            <span>1.0 - Diverse</span>
          </div>
          <div class="param-description">Controls vocabulary diversity. Lower values focus on most likely words.</div>
        </div>
      </div>
```

### 2. Update `packages/client-aframe/src/overlay/ChatOverlay.ts`

**Add to interface and constructor (same as Three.js):**
- Add `onParametersChange` callback parameter
- Add slider element references
- Add event listeners for sliders and toggle

### 3. Update `packages/client-aframe/src/main.ts`

**Add to ChatOverlay constructor:**
```typescript
  (temperature, topP) => { wsClient.sendParameters(temperature, topP); },
```

### 4. Update `packages/client-aframe/src/ws-client.ts`

**Add method:**
```typescript
  sendParameters(temperature: number, topP: number): void {
    this.send({ type: 'update-parameters', temperature, topP });
  }
```

---

## Babylon.js Client Implementation

Same as A-Frame - apply identical changes to:
- `packages/client-babylonjs/index.html`
- `packages/client-babylonjs/src/overlay/ChatOverlay.ts`
- `packages/client-babylonjs/src/main.ts`
- `packages/client-babylonjs/src/ws-client.ts`

---

## R3F Client Implementation

Same structure, apply to:
- `packages/client-r3f/index.html`
- `packages/client-r3f/src/overlay/ChatOverlay.ts`
- `packages/client-r3f/src/App.tsx` (instead of main.ts)
- `packages/client-r3f/src/ws-client.ts`

---

## Verification Checklist

After implementing for each client:

1. ✅ Temperature slider visible in Model Parameters section
2. ✅ Top-p slider visible in Model Parameters section
3. ✅ Sliders update value display on change
4. ✅ `sendParameters` method called on slider change
5. ✅ WebSocket message sent with type `update-parameters`
6. ✅ Default values: temperature=0.7, topP=0.9
7. ✅ Ranges: temperature 0.0-2.0, topP 0.1-1.0
8. ✅ Step size: 0.1 for both

---

## Next Steps After UI Complete

1. Update `packages/server/src/ws/WSServer.ts` to handle `update-parameters` message
2. Update `packages/server/src/chat/ChatRelay.ts` to store and use temperature/topP/maxTokens
3. Update all 9 AI provider implementations
4. Test end-to-end parameter flow
