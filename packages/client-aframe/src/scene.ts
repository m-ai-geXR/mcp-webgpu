/**
 * A-Frame Scene Manager
 *
 * Manages all scene mutations via the A-Frame DOM API.
 * Each object / light becomes an <a-entity> with appropriate components.
 */

import {
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  SceneState,
  Vec3,
} from './types.js';

function vec3ToStr(v: Vec3 | string): string {
  if (typeof v === 'string') return v;
  return `${v.x} ${v.y} ${v.z}`;
}
function toRad(deg: number) { return (deg * Math.PI) / 180; }
void toRad; // unused in A-Frame (uses degrees directly)

export class AFrameSceneManager {
  private objects = new Map<string, HTMLElement>();
  private lights  = new Map<string, HTMLElement>();
  private scene: Element;

  constructor() {
    this.scene = document.querySelector('a-scene')!;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private entity(tag = 'a-entity'): HTMLElement {
    return document.createElement(tag) as HTMLElement;
  }

  private applyTransform(el: HTMLElement, def: Partial<SceneObject>): void {
    if (def.position) el.setAttribute('position', vec3ToStr(def.position));
    if (def.rotation) el.setAttribute('rotation', vec3ToStr(def.rotation));
    if (def.scale)    el.setAttribute('scale',    vec3ToStr(def.scale));
    if (def.visible !== undefined) {
      el.setAttribute('visible', String(def.visible));
    }
  }

  private geometryAttr(def: SceneObject): string {
    const w = def.width  ?? 1;
    const h = def.height ?? 1;
    const d = def.depth  ?? 1;
    const r = def.radius ?? 0.5;

    switch (def.type) {
      case 'sphere':   return `primitive: sphere; radius: ${r}`;
      case 'cylinder': return `primitive: cylinder; radius: ${r}; height: ${h}`;
      case 'cone':     return `primitive: cone; radiusBottom: ${r}; height: ${h}`;
      case 'torus':    return `primitive: torus; radius: ${r}; radiusTubular: ${r * 0.4}`;
      case 'plane':    return `primitive: plane; width: ${w}; height: ${h}`;
      case 'capsule':  return `primitive: cylinder; radius: ${r}; height: ${h + r * 2}; openEnded: false`;
      default:         return `primitive: box; width: ${w}; height: ${h}; depth: ${d}`;
    }
  }

  private materialAttr(def: SceneObject): string {
    const m = def.material ?? {};
    const color = m.color ?? '#4488ff';
    let attr = `color: ${color}`;
    if (m.metalness !== undefined) attr += `; metalness: ${m.metalness}`;
    if (m.roughness !== undefined) attr += `; roughness: ${m.roughness}`;
    if (m.opacity   !== undefined) attr += `; opacity: ${m.opacity}`;
    if (m.wireframe)  attr += `; wireframe: true`;
    if (m.textureUrl) attr += `; src: ${m.textureUrl}`;
    if (m.emissive)   attr += `; emissive: ${m.emissive}`;
    if ((m as Record<string, unknown>).emissiveIntensity !== undefined) {
      attr += `; emissiveIntensity: ${(m as Record<string, unknown>).emissiveIntensity}`;
    }
    return attr;
  }

  // ── Objects ─────────────────────────────────────────────────────────────────

  createObject(def: SceneObject): void {
    this.deleteObject(def.id);

    let el: HTMLElement;

    if (def.type === 'gltf' && def.url) {
      el = this.entity();
      el.setAttribute('gltf-model', def.url);
    } else {
      el = this.entity();
      el.setAttribute('geometry', this.geometryAttr(def));
      el.setAttribute('material', this.materialAttr(def));
      if (def.castShadow !== false)    el.setAttribute('shadow', 'cast: true');
      if (def.receiveShadow !== false) el.setAttribute('shadow', 'receive: true');
    }

    el.setAttribute('id', def.id);
    this.applyTransform(el, def);
    this.scene.appendChild(el);
    this.objects.set(def.id, el);
  }

  updateObject(def: Partial<SceneObject> & { id: string }): void {
    const el = this.objects.get(def.id);
    if (!el) { this.createObject(def as SceneObject); return; }

    this.applyTransform(el, def);

    if (def.material) {
      const current = el.getAttribute('material') ?? '';
      const m = def.material;
      let attr = current;
      // Patch individual keys
      const patch: Record<string, string | number> = {};
      if (m.color)              patch['color']     = m.color;
      if (m.opacity !== undefined) patch['opacity'] = m.opacity;
      if (m.metalness !== undefined) patch['metalness'] = m.metalness;
      if (m.roughness !== undefined) patch['roughness'] = m.roughness;
      if (m.wireframe !== undefined) patch['wireframe'] = m.wireframe ? 'true' : 'false';
      for (const [k, v] of Object.entries(patch)) {
        const re = new RegExp(`${k}:\\s*[^;]+`);
        if (re.test(attr)) {
          attr = attr.replace(re, `${k}: ${v}`);
        } else {
          attr += `; ${k}: ${v}`;
        }
      }
      el.setAttribute('material', attr);
    }
  }

  deleteObject(id: string): void {
    const el = this.objects.get(id);
    if (!el) return;
    el.parentNode?.removeChild(el);
    this.objects.delete(id);
  }

  // ── Lights ──────────────────────────────────────────────────────────────────

  createLight(def: SceneLight): void {
    this.deleteLight(def.id);

    const el = this.entity();
    el.setAttribute('id', def.id);

    let attr = `type: ${def.lightType}; color: ${def.color}; intensity: ${def.intensity}`;
    if (def.castShadow)   attr += '; castShadow: true';
    if (def.distance)     attr += `; distance: ${def.distance}`;
    if (def.decay !== undefined) attr += `; decay: ${def.decay}`;
    if (def.angle !== undefined) attr += `; angle: ${def.angle}`;
    if (def.penumbra !== undefined) attr += `; penumbra: ${def.penumbra}`;
    if (def.groundColor)  attr += `; groundColor: ${def.groundColor}`;

    el.setAttribute('light', attr);
    if (def.position) el.setAttribute('position', vec3ToStr(def.position));
    this.scene.appendChild(el);
    this.lights.set(def.id, el);
  }

  updateLight(def: Partial<SceneLight> & { id: string }): void {
    const el = this.lights.get(def.id);
    if (!el) return;
    const current = el.getAttribute('light') ?? '';
    let attr = current;
    if (def.color)     { attr = attr.replace(/color:\s*[^;]+/, `color: ${def.color}`); }
    if (def.intensity !== undefined) { attr = attr.replace(/intensity:\s*[^;]+/, `intensity: ${def.intensity}`); }
    el.setAttribute('light', attr);
    if (def.position) el.setAttribute('position', vec3ToStr(def.position));
  }

  deleteLight(id: string): void {
    const el = this.lights.get(id);
    if (!el) return;
    el.parentNode?.removeChild(el);
    this.lights.delete(id);
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  setCamera(cam: Partial<SceneCamera>): void {
    const rig = document.getElementById('camera-rig');
    if (!rig) return;
    if (cam.position) rig.setAttribute('position', vec3ToStr(cam.position));
    // A-Frame doesn't have an orbit target; we set look-at on the camera entity
    if (cam.target) {
      const camEl = document.getElementById('main-camera');
      camEl?.setAttribute('look-at', vec3ToStr(cam.target));
    }
    if (cam.fov) {
      const camEl = document.getElementById('main-camera');
      camEl?.setAttribute('camera', `fov: ${cam.fov}`);
    }
  }

  flyToObject(id: string, distance = 3): void {
    const el = this.objects.get(id);
    if (!el) return;
    const pos = el.getAttribute('position') as unknown as Vec3 | null;
    if (!pos) return;
    const rig = document.getElementById('camera-rig');
    if (!rig) return;
    rig.setAttribute('position', `${pos.x + distance} ${pos.y + distance} ${pos.z + distance}`);
  }

  // ── Animation ────────────────────────────────────────────────────────────────

  animateObject(
    id: string,
    property: 'position' | 'rotation' | 'scale',
    to: Vec3,
    duration: number,
    easing: string,
    loop: boolean,
  ): void {
    const el = this.objects.get(id);
    if (!el) return;
    // A-Frame animation component — use component properties (not object3D path)
    // so vec3 interpolation and degree-based rotation work correctly.
    const toStr = vec3ToStr(to);
    const easingMap: Record<string, string> = {
      linear: 'linear',
      easeIn: 'easeInQuad',
      easeOut: 'easeOutQuad',
      easeInOut: 'easeInOutQuad',
    };
    const aframeEasing = easingMap[easing] ?? 'linear';
    el.setAttribute('animation', [
      `property: ${property}`,
      `to: ${toStr}`,
      `dur: ${Math.round(duration * 1000)}`,
      `easing: ${aframeEasing}`,
      `loop: ${loop}`,
    ].join('; '));
  }

  stopAnimation(id: string): void {
    const el = this.objects.get(id);
    if (!el) return;
    el.removeAttribute('animation');
  }

  // ── Environment ──────────────────────────────────────────────────────────────

  setEnvironment(env: EnvironmentDef): void {
    const scene = this.scene as Element & { setAttribute: (name: string, value: string) => void };
    if (env.background) {
      scene.setAttribute('background', `color: ${env.background}`);
    }
    if (env.fog) {
      scene.setAttribute('fog', `type: linear; color: ${env.fog.color}; near: ${env.fog.near}; far: ${env.fog.far}`);
    }
  }

  // ── Full scene rebuild ────────────────────────────────────────────────────────

  loadScene(state: SceneState): void {
    for (const id of [...this.objects.keys()]) this.deleteObject(id);
    for (const id of [...this.lights.keys()])  this.deleteLight(id);

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light  of Object.values(state.lights  ?? {})) this.createLight(light);
    for (const object of Object.values(state.objects ?? {})) this.createObject(object);
  }

  // ── Screenshot ────────────────────────────────────────────────────────────────

  takeScreenshot(): string {
    const canvas = document.querySelector('canvas');
    return canvas?.toDataURL('image/png') ?? '';
  }
}
