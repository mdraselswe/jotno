"use client";

import { useEffect, useRef } from "react";
import {
  Color,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

/**
 * A soft, slowly breathing WebGL blob in the active species colour (behind the
 * home orbit). Loaded lazily by HeroOrbit; the CSS blob underneath is its
 * poster, so nothing changes if WebGL is missing, slow or turned off.
 * Pauses offscreen and in hidden tabs; one still frame with reduced motion.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormal;
  varying float vNoise;

  // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT).
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    float n = snoise(normal * 1.4 + uTime * 0.18);
    vNoise = n;
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position + normal * n * uAmp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGlow;
  varying vec3 vNormal;
  varying float vNoise;

  void main() {
    // Soft studio light from the top left, a warm rim, and gentle noise tint.
    float light = clamp(dot(vNormal, normalize(vec3(-0.5, 0.7, 0.6))) * 0.5 + 0.55, 0.0, 1.0);
    float rim = pow(1.0 - abs(vNormal.z), 2.2);
    vec3 col = mix(uColor * 0.88, uGlow, light * 0.55);
    col += rim * 0.18;
    col += vNoise * 0.03;
    float alpha = 0.92 - rim * 0.35;
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Any CSS colour (oklch too) → THREE.Color, through a 1×1 canvas. */
function cssToColor(css: string, ctx: CanvasRenderingContext2D): Color {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color(r / 255, g / 255, b / 255);
}

export default function BlobField({ cssVar, className }: { cssVar: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef<Color | null>(null);
  const probe = useRef<CanvasRenderingContext2D | null>(null);

  // The colour follows the active animal; resolved from the CSS variable so it fits light and dark.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    probe.current ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const ctx = probe.current;
    if (!ctx) return;
    const css = getComputedStyle(el).getPropertyValue(cssVar).trim();
    if (css) target.current = cssToColor(css, ctx);
  }, [cssVar]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the CSS poster stays.
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;opacity:0;transition:opacity 900ms";
    el.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.z = 4.6;
    const start = target.current ?? new Color(0.95, 0.8, 0.6);
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.22 },
      uColor: { value: start.clone() },
      uGlow: { value: new Color(1, 0.97, 0.92) },
    };
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
    });
    const geometry = new IcosahedronGeometry(1, 40);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const size = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    let raf = 0;
    let visible = true;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      uniforms.uTime.value += dt;
      mesh.rotation.y += dt * 0.08;
      mesh.rotation.x = Math.sin(uniforms.uTime.value * 0.2) * 0.15;
      if (target.current) uniforms.uColor.value.lerp(target.current, Math.min(1, dt * 2.5));
      renderer.render(scene, camera);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };
    const play = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting) && document.visibilityState === "visible";
      if (visible && !reduce) play();
    });
    io.observe(el);
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && !reduce) play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Still frame first, then fade the canvas in over the poster.
    uniforms.uTime.value = 3;
    renderer.render(scene, camera);
    requestAnimationFrame(() => (renderer.domElement.style.opacity = "1"));
    if (!reduce) play();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden="true" className={className} />;
}
