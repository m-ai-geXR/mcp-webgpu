/**
 * A-Frame bloom post-processing fallback.
 *
 * If the CDN-loaded `aframe-effects` doesn't provide bloom, this system
 * hooks into the A-Frame render loop and applies Three.js EffectComposer
 * with UnrealBloomPass + FXAA.
 *
 * Register BEFORE the scene loads (called from main.ts).
 */

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import * as THREE from 'three';

declare const AFRAME: {
  registerSystem: (name: string, def: Record<string, unknown>) => void;
  systems: Record<string, unknown>;
};

export function registerBloomSystem(): void {
  // Skip if aframe-effects already provides bloom
  if (AFRAME.systems?.['effects']) return;

  AFRAME.registerSystem('bloom-postprocess', {
    schema: {
      strength:  { type: 'number', default: 0.4 },
      radius:    { type: 'number', default: 0.4 },
      threshold: { type: 'number', default: 0.85 },
    },

    init(this: {
      el: HTMLElement & { sceneEl: HTMLElement & {
        renderer: THREE.WebGLRenderer;
        object3D: THREE.Scene;
        camera: HTMLElement & { components: { camera: { camera: THREE.Camera } } };
      }};
      data: { strength: number; radius: number; threshold: number };
      composer: EffectComposer | null;
      bound: boolean;
    }) {
      this.composer = null;
      this.bound = false;
    },

    tick(this: {
      el: HTMLElement & { sceneEl: HTMLElement & {
        renderer: THREE.WebGLRenderer;
        object3D: THREE.Scene;
        camera: HTMLElement & { components: { camera: { camera: THREE.Camera } } };
      }};
      data: { strength: number; radius: number; threshold: number };
      composer: EffectComposer | null;
      bound: boolean;
    }) {
      const sceneEl = this.el.sceneEl ?? this.el;
      const renderer = (sceneEl as unknown as { renderer: THREE.WebGLRenderer }).renderer;
      const scene3D = (sceneEl as unknown as { object3D: THREE.Scene }).object3D;

      if (!renderer || !scene3D || this.bound) return;

      // Get the Three.js camera from the A-Frame camera entity
      const camEl = (sceneEl as HTMLElement).querySelector('[camera]');
      if (!camEl) return;
      const camComp = (camEl as unknown as { components: Record<string, { camera: THREE.Camera }> }).components?.camera;
      if (!camComp?.camera) return;
      const camera = camComp.camera;

      // Build the composer
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene3D, camera));

      const bloom = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        this.data.strength,
        this.data.radius,
        this.data.threshold,
      );
      composer.addPass(bloom);

      const fxaa = new ShaderPass(FXAAShader);
      const pixelRatio = renderer.getPixelRatio();
      fxaa.uniforms['resolution'].value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
      composer.addPass(fxaa);

      this.composer = composer;
      this.bound = true;

      // Override A-Frame's default render method to use the composer
      const origRender = (sceneEl as unknown as { render: () => void }).render;
      (sceneEl as unknown as { render: () => void }).render = () => {
        if (this.composer) {
          this.composer.render();
        } else if (origRender) {
          origRender.call(sceneEl);
        }
      };
    },
  });
}
