'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const vert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = `
  #define NUM_OCTAVES 5
  uniform vec4 resolution;
  uniform vec3 color1;
  uniform vec3 color0;
  uniform float time;
  varying vec2 vUv;

  float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }

  float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
      mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
      mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
  }

  float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(x);
      x = rot * x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  vec3 rgbcol(float r, float g, float b) { return vec3(r/255.0,g/255.0,b/255.0); }

  float setOpacity(float r, float g, float b) {
    float tone = (r + g + b) / 3.0;
    return tone < 0.99 ? 0.0 : 1.0;
  }

  void main(){
    vec2 uv = vUv;
    // Flat flame front anchored to the card's bottom edge; no spherical mapping.
    float aspect = resolution.x / max(resolution.y, 1.0);
    vec2 p = vec2(uv.x * max(8.0, aspect * 6.0), uv.y * 5.0 - time * 0.0012);
    float turbulence = fbm(p + fbm(p + vec2(0.0, -time * 0.0003)));
    float flameHeight = 0.055 + turbulence * 0.42;
    float flame = 1.0 - smoothstep(flameHeight - 0.025, flameHeight + 0.025, uv.y);
    float heat = clamp(1.0 - uv.y / max(flameHeight, 0.01), 0.0, 1.0);
    vec3 edge = mix(color0 / 255.0, vec3(1.0, 0.28, 0.015), 0.85);
    vec3 core = mix(color1 / 255.0, vec3(1.0, 0.82, 0.25), 0.65);
    vec3 fireColor = mix(edge, core, heat);
    gl_FragColor = vec4(fireColor, flame * (0.6 + heat * 0.4));
  }

`;

export type FireSphereProps = {
  /** Bloom intensity (default 1.7) */
  bloomStrength?: number;
  /** Bloom radius (default 0.8) */
  bloomRadius?: number;
  /** Bloom threshold (default 0) */
  bloomThreshold?: number;
  /** Border RGB in 0–255 (default [74,30,0]) */
  color0?: [number, number, number];
  /** Base RGB in 0–255 (default [201,158,72]) */
  color1?: [number, number, number];
  /** Whether to animate (default true) */
  animate?: boolean;
  /** Optional extra classes for the wrapper */
  className?: string;
};

function FireSphereComponent({
  bloomStrength = 1.7,
  bloomRadius = 0.8,
  bloomThreshold = 0.0,
  color0 = [74, 30, 0],
  color1 = [201, 158, 72],
  animate = true,
  className = '',
}: FireSphereProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // keep refs to update when props change
  const apiRef = useRef<{
    uniforms?: {
      time: { value: number };
      resolution: { value: THREE.Vector4 };
      color1: { value: THREE.Vector3 };
      color0: { value: THREE.Vector3 };
    };
    bloomPass?: UnrealBloomPass;
    renderer?: THREE.WebGLRenderer;
    composer?: EffectComposer;
    scene?: THREE.Scene;
    camera?: THREE.Camera;
    cleanup?: () => void;
    clock?: THREE.Clock;
    raf?: number;
  }>({});

  const animateRef = useRef(animate);
  useEffect(() => { animateRef.current = animate; }, [animate]);

  // init
  useEffect(() => {
    if (!mountRef.current) return;
    let width = mountRef.current.clientWidth || 1;
    let height = mountRef.current.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 5;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      return; // The ranking remains readable on devices without WebGL.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    composer.addPass(bloomPass);

    const uniforms = {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector4(width, height, 1, 1) },
      color1: { value: new THREE.Vector3(...color1) },
      color0: { value: new THREE.Vector3(...color0) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: vert,
      fragmentShader: frag,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onResize = () => {
      if (!mountRef.current) return;
      width = mountRef.current.clientWidth || 1;
      height = mountRef.current.clientHeight || 1;
      renderer.setSize(width, height);
      composer.setSize(width, height);
      uniforms.resolution.value.set(width, height, 1, 1);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(mountRef.current);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (animateRef.current) {
        uniforms.time.value = clock.getElapsedTime() * 1000.0; // ms scale
      }
      composer.render();
    };
    tick();

    const cleanup = () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };

    apiRef.current = { uniforms, bloomPass, renderer, composer, scene, camera, cleanup, clock, raf };

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // push prop changes to GPU/PP without re-creating scene
  useEffect(() => {
    const api = apiRef.current;
    if (!api.uniforms) return;
    api.uniforms.color0.value.set(...color0);
    api.uniforms.color1.value.set(...color1);
  }, [color0, color1]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api.bloomPass) return;
    api.bloomPass.threshold = bloomThreshold;
    api.bloomPass.strength = bloomStrength;
    api.bloomPass.radius = bloomRadius;
  }, [bloomStrength, bloomRadius, bloomThreshold]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div ref={mountRef} className="absolute inset-0" />
    </div>
  );
}

export const FireSphere = memo(FireSphereComponent);
