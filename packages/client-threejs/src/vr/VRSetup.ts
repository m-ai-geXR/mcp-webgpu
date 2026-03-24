/**
 * VR Setup — initializes WebXR for the Three.js client.
 *
 * - Adds the VR button to the DOM
 * - Sets up XR controllers with ray casters
 * - Manages the VR chat panel lifecycle
 */
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { VRChatPanel } from './VRChatPanel.js';

export interface VRContext {
  vrChatPanel: VRChatPanel;
  controllers: THREE.Group[];
  isPresenting: boolean;
}

/**
 * Create and append the "Enter VR" button. Uses the native WebXR API
 * rather than Three's VRButton helper so we have full control over styling.
 */
function createVRButton(renderer: THREE.WebGLRenderer): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'vr-button';
  btn.textContent = 'Enter VR';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 110;
    padding: 10px 20px;
    border: 1px solid rgba(100,100,220,0.5);
    border-radius: 10px;
    background: rgba(20,20,50,0.85);
    color: #a5b4fc;
    font-size: 14px;
    font-weight: 600;
    font-family: "Segoe UI", system-ui, sans-serif;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition: all 0.2s;
    display: none;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(60,60,120,0.9)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(20,20,50,0.85)'; });

  // Check for WebXR support
  if ('xr' in navigator) {
    (navigator as Navigator & { xr: XRSystem }).xr
      .isSessionSupported('immersive-vr')
      .then((supported) => {
        if (supported) {
          btn.style.display = 'block';
          btn.addEventListener('click', () => toggleVR(renderer, btn));
        }
      })
      .catch(() => { /* WebXR not available */ });
  }

  document.body.appendChild(btn);
  return btn;
}

let currentSession: XRSession | null = null;

async function toggleVR(renderer: THREE.WebGLRenderer, btn: HTMLButtonElement): Promise<void> {
  if (currentSession) {
    await currentSession.end();
    return;
  }

  const xr = (navigator as Navigator & { xr: XRSystem }).xr;
  const session = await xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
  });

  currentSession = session;
  btn.textContent = 'Exit VR';

  session.addEventListener('end', () => {
    currentSession = null;
    btn.textContent = 'Enter VR';
  });

  await renderer.xr.setSession(session);
}

/**
 * Initialize full VR support for a Three.js scene.
 */
export function initVR(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): VRContext {
  // Enable XR on the renderer
  renderer.xr.enabled = true;

  // VR button
  createVRButton(renderer);

  // VR Chat panel (floating 3D panel)
  const vrChatPanel = new VRChatPanel();
  scene.add(vrChatPanel.mesh);

  // Controllers
  const controllers: THREE.Group[] = [];
  const controllerModelFactory = new XRControllerModelFactory();

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    scene.add(controller);

    // Controller grip model (visual representation)
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    // Ray line from controller
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -3),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.6,
    });
    const ray = new THREE.Line(lineGeo, lineMat);
    ray.name = 'controller-ray';
    controller.add(ray);

    // Select events
    controller.addEventListener('selectstart', () => {
      const line = controller.getObjectByName('controller-ray');
      if (line instanceof THREE.Line) {
        (line.material as THREE.LineBasicMaterial).color.set(0x4ade80);
      }
    });
    controller.addEventListener('selectend', () => {
      const line = controller.getObjectByName('controller-ray');
      if (line instanceof THREE.Line) {
        (line.material as THREE.LineBasicMaterial).color.set(0x818cf8);
      }
    });

    controllers.push(controller);
  }

  // Track presenting state and manage VR chat panel
  const ctx: VRContext = { vrChatPanel, controllers, isPresenting: false };

  renderer.xr.addEventListener('sessionstart', () => {
    ctx.isPresenting = true;
    vrChatPanel.show();
    // Hide DOM overlays in VR
    document.querySelectorAll('#chat-panel, #status, #debug-panel').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
  });

  renderer.xr.addEventListener('sessionend', () => {
    ctx.isPresenting = false;
    vrChatPanel.hide();
    // Restore DOM overlays
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) chatPanel.style.display = '';
    const status = document.getElementById('status');
    if (status) status.style.display = '';
  });

  return ctx;
}
