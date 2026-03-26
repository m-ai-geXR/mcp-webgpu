/**
 * SceneCanvas — the React Three Fiber scene.
 *
 * Reads scene state from the Zustand store and renders meshes, lights, and
 * camera. Animations are driven by a global `useFrame` tick that directly
 * mutates mesh refs for maximum performance (no React re-render per frame).
 */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { createXRStore, XR } from '@react-three/xr';
import * as THREE from 'three';
import { useSceneStore } from './store/sceneStore.js';
import { SceneObject, SceneLight } from './types.js';
import { VRChatPanel } from './vr/VRChatPanel.js';

// ── XR store (shared with App.tsx for "Enter VR" button) ──────────────────
export const xrStore = createXRStore();

// ── Easing helpers ─────────────────────────────────────────────────────────

function applyEasing(t: number, mode: string): number {
  switch (mode) {
    case 'easeIn':    return t * t * t;
    case 'easeOut':   return 1 - Math.pow(1 - t, 3);
    case 'easeInOut': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    default:          return t; // linear
  }
}

function lerpNum(a: number, b: number, t: number): number { return a + (b - a) * t; }

// ── Animation ticker ───────────────────────────────────────────────────────

/**
 * Runs outside the React render cycle — reads animations from store and
 * mutates registered mesh refs directly each frame.
 */
function AnimationTicker({ meshRefs }: { meshRefs: React.MutableRefObject<Map<string, THREE.Object3D>> }) {
  const stopAnimation = useSceneStore((s) => s.stopAnimation);

  useFrame(() => {
    const { animations } = useSceneStore.getState();
    for (const [id, anim] of Object.entries(animations)) {
      const mesh = meshRefs.current.get(id);
      if (!mesh) continue;

      const elapsed = performance.now() - anim.startTime;
      let t = Math.min(elapsed / anim.duration, 1);
      if (anim.loop && t >= 1) {
        // Restart the animation
        useSceneStore.setState((s) => ({
          animations: {
            ...s.animations,
            [id]: { ...anim, startTime: performance.now() },
          },
        }));
        t = 0;
      }

      const e = applyEasing(t, anim.easing);
      const x = lerpNum(anim.fromX, anim.toX, e);
      const y = lerpNum(anim.fromY, anim.toY, e);
      const z = lerpNum(anim.fromZ, anim.toZ, e);

      if (anim.property === 'position') mesh.position.set(x, y, z);
      else if (anim.property === 'scale') mesh.scale.set(x, y, z);
      else mesh.rotation.set(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z));

      if (t >= 1 && !anim.loop) stopAnimation(id);
    }
  });

  return null;
}

// ── Screenshot capturer ────────────────────────────────────────────────────

function ScreenshotCapturer({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const { gl, scene, camera } = useThree();

  useFrame(() => {
    const { pendingScreenshot, setPendingScreenshot } = useSceneStore.getState();
    if (pendingScreenshot === null) return;
    setPendingScreenshot(null);
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/png');
    onCapture(dataUrl);
  });

  return null;
}

// ── Material builder ───────────────────────────────────────────────────────

function useMaterial(def: SceneObject['material']) {
  return useMemo(() => {
    const color = def?.color ?? '#4488ff';
    if (def?.metalness !== undefined || def?.roughness !== undefined) {
      return (
        <meshStandardMaterial
          color={color}
          metalness={def?.metalness ?? 0.1}
          roughness={def?.roughness ?? 0.7}
          opacity={def?.opacity ?? 1}
          transparent={(def?.opacity ?? 1) < 1}
          wireframe={def?.wireframe ?? false}
        />
      );
    }
    return (
      <meshStandardMaterial
        color={color}
        emissive={def?.emissive ?? '#000000'}
        emissiveIntensity={def?.emissiveIntensity ?? 1}
        opacity={def?.opacity ?? 1}
        transparent={(def?.opacity ?? 1) < 1}
        wireframe={def?.wireframe ?? false}
      />
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(def)]);
}

// ── Geometry builder ───────────────────────────────────────────────────────

function ObjectGeometry({ obj }: { obj: SceneObject }) {
  const w = obj.width  ?? 1;
  const h = obj.height ?? 1;
  const d = obj.depth  ?? 1;
  const r = obj.radius ?? 0.5;

  switch (obj.type) {
    case 'sphere':   return <sphereGeometry     args={[r, 32, 32]} />;
    case 'cylinder': return <cylinderGeometry   args={[r, r, h, 32]} />;
    case 'cone':     return <coneGeometry       args={[r, h, 32]} />;
    case 'torus':    return <torusGeometry      args={[r, r * 0.4, 16, 32]} />;
    case 'plane':    return <planeGeometry      args={[w, h]} />;
    case 'capsule':  return <capsuleGeometry    args={[r, h, 8, 16]} />;
    default:         return <boxGeometry        args={[w, h, d]} />;
  }
}

// ── GLTF mesh ─────────────────────────────────────────────────────────────--

function GltfMesh({ url, meshRef }: { url: string; meshRef: React.Ref<THREE.Object3D> }) {
  const { scene } = useGLTF(url);
  return <primitive ref={meshRef} object={scene.clone()} />;
}

// ── Single scene object ────────────────────────────────────────────────────

function SceneObjectMesh({
  obj,
  registerRef,
}: {
  obj: SceneObject;
  registerRef: (id: string, ref: THREE.Object3D | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMaterial(obj.material);

  // Register ref for animation ticker
  const callbackRef = (node: THREE.Mesh | null) => {
    (ref as React.MutableRefObject<THREE.Mesh | null>).current = node;
    registerRef(obj.id, node);
  };

  const pos = obj.position;
  const rot = obj.rotation ?? { x: 0, y: 0, z: 0 };
  const sc  = obj.scale    ?? { x: 1, y: 1, z: 1 };

  if (obj.type === 'gltf' && obj.url) {
    return (
      <group
        position={[pos.x, pos.y, pos.z]}
        rotation={[THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), THREE.MathUtils.degToRad(rot.z)]}
        scale={[sc.x, sc.y, sc.z]}
        visible={obj.visible !== false}
      >
        <GltfMesh url={obj.url} meshRef={callbackRef as React.Ref<THREE.Object3D>} />
      </group>
    );
  }

  return (
    <mesh
      ref={callbackRef}
      position={[pos.x, pos.y, pos.z]}
      rotation={[THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), THREE.MathUtils.degToRad(rot.z)]}
      scale={[sc.x, sc.y, sc.z]}
      visible={obj.visible !== false}
      castShadow={obj.castShadow !== false}
      receiveShadow={obj.receiveShadow !== false}
    >
      <ObjectGeometry obj={obj} />
      {material}
    </mesh>
  );
}

// ── Single scene light ─────────────────────────────────────────────────────

function SceneLightComponent({ light }: { light: SceneLight }) {
  const pos = light.position ?? { x: 5, y: 10, z: 5 };
  const col = light.color;

  switch (light.lightType) {
    case 'ambient':
    case 'hemisphere':
      return (
        <hemisphereLight
          color={col}
          groundColor={light.groundColor ?? '#404060'}
          intensity={light.intensity}
        />
      );
    case 'point':
      return (
        <pointLight
          color={col}
          intensity={light.intensity}
          position={[pos.x, pos.y, pos.z]}
          distance={light.distance ?? 0}
          decay={light.decay ?? 2}
          castShadow={light.castShadow ?? false}
        />
      );
    case 'spot': {
      const tgt = light.target ?? { x: 0, y: 0, z: 0 };
      return (
        <spotLight
          color={col}
          intensity={light.intensity}
          position={[pos.x, pos.y, pos.z]}
          target-position={[tgt.x, tgt.y, tgt.z]}
          angle={light.angle ?? Math.PI / 4}
          penumbra={light.penumbra ?? 0.1}
          distance={light.distance ?? 0}
          castShadow={light.castShadow ?? false}
        />
      );
    }
    default: {
      const tgt = light.target ?? { x: 0, y: 0, z: 0 };
      return (
        <directionalLight
          color={col}
          intensity={light.intensity}
          position={[pos.x, pos.y, pos.z]}
          target-position={[tgt.x, tgt.y, tgt.z]}
          castShadow={light.castShadow ?? false}
        />
      );
    }
  }
}

// ── Camera sync ────────────────────────────────────────────────────────────

function CameraSync() {
  const cam = useSceneStore((s) => s.camera);
  const { camera } = useThree();

  if (cam.position) {
    camera.position.set(cam.position.x, cam.position.y, cam.position.z);
  }
  if (cam.fov && (camera as THREE.PerspectiveCamera).fov !== undefined) {
    (camera as THREE.PerspectiveCamera).fov = cam.fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }
  return null;
}

// ── Main scene canvas ──────────────────────────────────────────────────────

export function SceneCanvas({
  onScreenshot,
  vrMessages,
}: {
  onScreenshot: (requestId: string, dataUrl: string) => void;
  vrMessages?: Array<{ role: 'user' | 'ai'; text: string }>;
}) {
  const objects    = useSceneStore((s) => s.objects);
  const lights     = useSceneStore((s) => s.lights);
  const env        = useSceneStore((s) => s.environment);

  // Mesh refs map — shared with AnimationTicker
  const meshRefsMap = useRef<Map<string, THREE.Object3D>>(new Map());

  const registerRef = (id: string, node: THREE.Object3D | null) => {
    if (node) meshRefsMap.current.set(id, node);
    else meshRefsMap.current.delete(id);
  };

  const bgColor = env.background ?? '#1a1a2e';

  const handleScreenshot = (dataUrl: string) => {
    const { pendingScreenshot } = useSceneStore.getState();
    if (pendingScreenshot) onScreenshot(pendingScreenshot, dataUrl);
  };

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      shadows
      camera={{ position: [5, 5, 10], fov: 60, near: 0.1, far: 2000 }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <XR store={xrStore}>
        {/* Background colour */}
        <color attach="background" args={[bgColor]} />

        {/* Fog */}
        {env.fog && (
          <fog attach="fog" args={[env.fog.color, env.fog.near, env.fog.far]} />
        )}

        {/* Camera sync when store changes */}
        <CameraSync />

        {/* Orbit controls */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        {/* Grid removed — clean background only */}

        {/* Default lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 7]} intensity={0.8} castShadow />

        {/* Lights */}
        {Object.values(lights).map((l) => (
          <SceneLightComponent key={l.id} light={l} />
        ))}

        {/* Objects */}
        {Object.values(objects).map((o) => (
          <SceneObjectMesh key={o.id} obj={o} registerRef={registerRef} />
        ))}

        {/* VR chat panel */}
        <VRChatPanel messages={vrMessages ?? []} />

        {/* Animation ticker (runs in useFrame, outside React re-renders) */}
        <AnimationTicker meshRefs={meshRefsMap} />

        {/* Screenshot capturer */}
        <ScreenshotCapturer onCapture={handleScreenshot} />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.8}
            luminanceSmoothing={0.3}
            intensity={0.4}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </XR>
    </Canvas>
  );
}
