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
  ParticleDef,
  Vec3,
} from './types.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

function vec3ToStr(v: Vec3 | string): string {
  if (typeof v === 'string') return v;
  return `${v.x} ${v.y} ${v.z}`;
}
function toRad(deg: number) { return (deg * Math.PI) / 180; }
void toRad; // unused in A-Frame (uses degrees directly)

export class AFrameSceneManager {
  private objects = new Map<string, HTMLElement>();
  private lights  = new Map<string, HTMLElement>();
  private particles = new Map<string, { points: THREE.Points; def: ParticleDef }>();
  private scene: Element;
  private bloomPass: UnrealBloomPass | null = null;
  private composer: EffectComposer | null = null;

  constructor() {
    this.scene = document.querySelector('a-scene')!;

    // ── Configure underlying Three.js renderer for higher fidelity ──
    const aScene = this.scene as unknown as { renderer: THREE.WebGLRenderer; object3D: THREE.Scene };
    const setupRenderer = () => {
      if (aScene.renderer) {
        aScene.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        aScene.renderer.toneMappingExposure = 1.0;
        aScene.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Generate procedural IBL environment for PBR reflections
        const pmrem = new THREE.PMREMGenerator(aScene.renderer);
        pmrem.compileEquirectangularShader();
        const envScene = new THREE.Scene();
        envScene.add(new THREE.HemisphereLight(0x8899bb, 0x223344, 2.0));
        const key = new THREE.DirectionalLight(0xffeedd, 3.0);
        key.position.set(5, 8, 3);
        envScene.add(key);
        const fill = new THREE.DirectionalLight(0xaabbdd, 1.0);
        fill.position.set(-3, 4, -5);
        envScene.add(fill);
        aScene.object3D.environment = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
        pmrem.dispose();
      }
    };
    if ((this.scene as HTMLElement).hasAttribute('loaded')) setupRenderer();
    else this.scene.addEventListener('loaded', setupRenderer, { once: true } as AddEventListenerOptions);

    // ── Default lighting ───────────────────────────────────────
    const ambient = this.entity();
    ambient.setAttribute('light', 'type: ambient; color: #ffffff; intensity: 0.3');
    ambient.setAttribute('id', '__default_ambient');
    this.scene.appendChild(ambient);

    const hemi = this.entity();
    hemi.setAttribute('light', 'type: hemisphere; color: #87ceeb; groundColor: #362907; intensity: 0.3');
    hemi.setAttribute('id', '__default_hemi');
    this.scene.appendChild(hemi);

    const dir = this.entity();
    dir.setAttribute('light', 'type: directional; color: #ffffff; intensity: 0.8; castShadow: true');
    dir.setAttribute('position', '5 10 7');
    dir.setAttribute('id', '__default_dir');
    this.scene.appendChild(dir);
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
      case 'sphere':   return `primitive: sphere; radius: ${r}; segmentsWidth: 64; segmentsHeight: 64`;
      case 'cylinder': return `primitive: cylinder; radius: ${r}; height: ${h}; segmentsRadial: 64`;
      case 'cone':     return `primitive: cone; radiusBottom: ${r}; height: ${h}; segmentsRadial: 64`;
      case 'torus':    return `primitive: torus; radius: ${r}; radiusTubular: ${r * 0.4}; segmentsRadial: 64; segmentsTubular: 24`;
      case 'plane':    return `primitive: plane; width: ${w}; height: ${h}`;
      case 'capsule':  return `primitive: cylinder; radius: ${r}; height: ${h + r * 2}; openEnded: false; segmentsRadial: 64`;
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

    if (def.type === 'line' && def.points && def.points.length >= 2) {
      // Line geometry via raw THREE.js on an entity
      el = this.entity();
      el.setAttribute('id', def.id);
      this.applyTransform(el, def);
      this.scene.appendChild(el);
      this.objects.set(def.id, el);
      // Build THREE.Line and attach to entity object3D
      requestAnimationFrame(() => {
        const obj3d = (el as any).object3D as THREE.Object3D;
        if (!obj3d) return;
        const geom = new THREE.BufferGeometry().setFromPoints(
          def.points!.map((p: Vec3) => new THREE.Vector3(p.x, p.y, p.z)),
        );
        const mat = new THREE.LineBasicMaterial({ color: def.material?.color ?? '#ffffff' });
        obj3d.add(new THREE.Line(geom, mat));
      });
      return;
    }

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

    // parentId grouping
    if (def.parentId) {
      const parent = this.objects.get(def.parentId);
      if (parent) {
        parent.appendChild(el);
      } else {
        this.scene.appendChild(el);
      }
    } else {
      this.scene.appendChild(el);
    }
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
    el.setAttribute(`animation__${property}`, [
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
    el.removeAttribute('animation__position');
    el.removeAttribute('animation__rotation');
    el.removeAttribute('animation__scale');
    el.removeAttribute('animation');
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  createParticles(def: ParticleDef): void {
    this.deleteParticles(def.id);
    const count  = def.count ?? 200;
    const spread = def.spread ?? { x: 10, y: 10, z: 10 };
    const size   = def.size ?? 0.1;
    const color  = def.color ?? '#ffffff';
    const opacity = def.opacity ?? 0.8;
    const pos = def.position ?? { x: 0, y: 0, z: 0 };

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = pos.x + (Math.random() - 0.5) * spread.x;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * spread.y;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * spread.z;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size,
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      sizeAttenuation: def.sizeAttenuation !== false,
      blending: def.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });
    if (def.emissive) {
      (mat as any).emissive = new THREE.Color(def.emissive);
      (mat as any).emissiveIntensity = def.emissiveIntensity ?? 1;
    }
    const points = new THREE.Points(geom, mat);
    // Add directly to the underlying Three.js scene
    const aScene = this.scene as unknown as { object3D: THREE.Scene };
    if (aScene.object3D) {
      aScene.object3D.add(points);
    }
    this.particles.set(def.id, { points, def });
  }

  updateParticles(update: Partial<ParticleDef> & { id: string }): void {
    const entry = this.particles.get(update.id);
    if (!entry) return;
    const mat = entry.points.material as THREE.PointsMaterial;
    if (update.color)             mat.color.set(update.color);
    if (update.opacity !== undefined) mat.opacity = update.opacity;
    if (update.size !== undefined)    mat.size = update.size;
    Object.assign(entry.def, update);
  }

  deleteParticles(id: string): void {
    const entry = this.particles.get(id);
    if (!entry) return;
    entry.points.geometry.dispose();
    (entry.points.material as THREE.PointsMaterial).dispose();
    entry.points.removeFromParent();
    this.particles.delete(id);
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

    // ── Post-processing (bloom) via Three.js composer ──
    if (env.bloom) {
      const aScene = this.scene as unknown as { renderer: THREE.WebGLRenderer; object3D: THREE.Scene };
      if (aScene.renderer && aScene.object3D) {
        if (!this.composer) {
          const canvas = aScene.renderer.domElement;
          this.composer = new EffectComposer(aScene.renderer);
          const cam = document.getElementById('main-camera');
          const threeCamera = cam ? (cam as any).object3DMap?.camera as THREE.Camera : null;
          if (threeCamera) {
            this.composer.addPass(new RenderPass(aScene.object3D, threeCamera));
          }
          this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(canvas.width, canvas.height),
            env.bloom.strength ?? 0.4,
            env.bloom.radius ?? 0.4,
            env.bloom.threshold ?? 0.8,
          );
          this.composer.addPass(this.bloomPass);
        } else if (this.bloomPass) {
          this.bloomPass.strength  = env.bloom.strength ?? 0.4;
          this.bloomPass.radius    = env.bloom.radius ?? 0.4;
          this.bloomPass.threshold = env.bloom.threshold ?? 0.8;
        }
      }
    }
  }

  // ── Full scene rebuild ────────────────────────────────────────────────────────

  loadScene(state: SceneState): void {
    for (const id of [...this.objects.keys()]) this.deleteObject(id);
    for (const id of [...this.lights.keys()])  this.deleteLight(id);
    for (const id of [...this.particles.keys()]) this.deleteParticles(id);

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light  of Object.values(state.lights  ?? {})) this.createLight(light);
    for (const object of Object.values(state.objects ?? {})) this.createObject(object);
    for (const p of Object.values(state.particles ?? {})) this.createParticles(p);
  }

  // ── Screenshot ────────────────────────────────────────────────────────────────

  takeScreenshot(): string {
    const canvas = document.querySelector('canvas');
    return canvas?.toDataURL('image/png') ?? '';
  }
}
