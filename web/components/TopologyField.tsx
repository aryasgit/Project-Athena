"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A slowly-breathing topological point cloud rendered in WebGL — the "living
 * system" made ambient. Monotone ash points; The Phosphor bleeds through only at
 * the peaks. The field drifts toward the cursor (gravity) and parallaxes with it.
 *
 * Discipline: all GL setup is in useEffect (SSR-safe), the RAF loop pauses when
 * the tab is hidden, and it renders nothing at all under reduced-motion.
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uSize;
  varying float vElev;

  void main() {
    vec3 p = position;
    // layered waves → a shifting topology
    float e =
      sin(p.x * 0.35 + uTime * 0.6) * 0.6 +
      cos(p.y * 0.30 - uTime * 0.5) * 0.6 +
      sin((p.x + p.y) * 0.18 + uTime * 0.3) * 0.9;

    // cursor gravity: lift points near the projected mouse
    float d = distance(p.xy, uMouse * 9.0);
    e += smoothstep(6.0, 0.0, d) * 1.6;

    vElev = e;
    p.z += e;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (1.0 / -mv.z) * (1.0 + clamp(e * 0.15, 0.0, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uAsh;
  uniform vec3 uPhosphor;
  varying float vElev;

  void main() {
    // round the point, soft edge
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.15, length(c));
    if (a < 0.02) discard;

    float peak = smoothstep(1.2, 2.4, vElev);   // only crests glow crimson
    vec3 col = mix(uAsh, uPhosphor, peak);
    float alpha = a * mix(0.35, 0.9, peak);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function TopologyField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 9.5, 15);
    camera.lookAt(0, 0, 0);

    // a flat grid of points; the shader gives it elevation
    const SIZE = 44;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 150, 150);
    geo.rotateX(-Math.PI / 2.15);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 46 },
      uAsh: { value: new THREE.Color(0x6a6a6e) },
      uPhosphor: { value: new THREE.Color(0xff003c) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const target = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      target.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("pointermove", onPointer);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const loop = () => {
      if (!running) return;
      uniforms.uTime.value = clock.getElapsedTime();
      // ease mouse gravity + parallax
      uniforms.uMouse.value.lerp(target, 0.045);
      points.rotation.z += 0.0004;
      camera.position.x += (target.x * 2.2 - camera.position.x) * 0.03;
      camera.position.y += (9.5 - target.y * 1.6 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      running = !document.hidden;
      if (running) {
        clock.getDelta();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
