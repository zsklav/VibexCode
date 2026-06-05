"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, RoundedBox, Text } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const symbols = ["< />", "{ }", "=>", "npm", "git", "API"];

function AuroraField({ scroll }: { scroll: MutableRefObject<number> }) {
  const material = useRef<THREE.ShaderMaterial | null>(null);

  useFrame(({ clock, pointer }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uPointer.value.set(pointer.x, pointer.y);
    material.current.uniforms.uScroll.value = scroll.current;
  });

  return (
    <mesh position={[0, 0, -8]} scale={[18, 10, 1]}>
      <planeGeometry args={[1, 1, 96, 96]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uScroll: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec2 uPointer;
          uniform float uScroll;

          void main() {
            vUv = uv;
            vec3 p = position;
            float wave = sin((uv.x * 5.8) + uTime * .5 + uScroll * 1.4) * .24;
            wave += sin((uv.y * 7.5) - uTime * .34) * .14;
            p.z += wave + uPointer.x * .08;
            p.y += sin(uv.x * 8.0 + uTime * .22) * .08;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uScroll;

          float band(float y, float center, float width) {
            return smoothstep(width, 0.0, abs(y - center));
          }

          void main() {
            float flow = sin(vUv.x * 7.0 + uTime * .34 + uScroll * 1.8) * .07;
            float glow = band(vUv.y + flow, .45, .22) + band(vUv.y - flow, .62, .16);
            vec3 purple = vec3(.52, .17, 1.0);
            vec3 blue = vec3(.05, .38, 1.0);
            vec3 cyan = vec3(.0, .94, 1.0);
            vec3 color = mix(purple, blue, vUv.x);
            color = mix(color, cyan, smoothstep(.45, .95, sin(uTime * .18 + vUv.x * 2.5) * .5 + .5));
            float edgeFade = smoothstep(0.0, .22, vUv.x) * smoothstep(1.0, .78, vUv.x);
            float alpha = glow * edgeFade * .34;
            gl_FragColor = vec4(color * (1.0 + glow), alpha);
          }
        `}
      />
    </mesh>
  );
}

function ParticleCloud({ scroll }: { scroll: MutableRefObject<number> }) {
  const points = useRef<THREE.Points | null>(null);
  const count = 2600;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 18;
      data[i * 3 + 1] = (Math.random() - 0.5) * 9;
      data[i * 3 + 2] = (Math.random() - 0.5) * 13;
    }
    return data;
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!points.current) return;
    points.current.rotation.y = clock.elapsedTime * 0.018 + pointer.x * 0.035;
    points.current.rotation.x = pointer.y * -0.028;
    points.current.position.z = scroll.current * 0.9;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#77f7ff"
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function GlassHeadphones({ scroll }: { scroll: MutableRefObject<number> }) {
  const group = useRef<THREE.Group | null>(null);
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#dff8ff",
        roughness: 0.08,
        metalness: 0.05,
        transmission: 0.55,
        thickness: 1.2,
        transparent: true,
        opacity: 0.32,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    []
  );
  const rim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8cf8ff",
        emissive: "#29d9ff",
        emissiveIntensity: 0.7,
        roughness: 0.28,
        metalness: 0.45,
        transparent: true,
        opacity: 0.78,
      }),
    []
  );

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.28) * 0.18 + pointer.x * 0.18;
    group.current.rotation.x = -0.12 + pointer.y * -0.1;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.035;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.09;
    group.current.position.z = scroll.current * 0.38;
  });

  return (
    <Float speed={1.15} rotationIntensity={0.16} floatIntensity={0.24}>
      <group ref={group} position={[1.85, -0.05, -0.7]} scale={1.55}>
        <mesh material={glass} rotation={[0, 0, Math.PI / 2]} position={[0, 0.2, 0]}>
          <torusGeometry args={[1.42, 0.085, 24, 128, Math.PI]} />
        </mesh>
        <mesh material={rim} rotation={[0, 0, Math.PI / 2]} position={[0, 0.2, 0.01]}>
          <torusGeometry args={[1.45, 0.012, 12, 128, Math.PI]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 1.35, -0.48, 0]} rotation={[0, 0, side * 0.07]}>
            <RoundedBox args={[0.62, 1.05, 0.54]} radius={0.18} smoothness={8} material={glass} />
            <mesh material={rim} position={[0, 0, 0.29]}>
              <torusGeometry args={[0.31, 0.018, 10, 52]} />
            </mesh>
            <mesh material={glass} position={[0, 0, 0.33]}>
              <cylinderGeometry args={[0.24, 0.3, 0.08, 52]} />
            </mesh>
          </group>
        ))}
        <mesh material={glass} position={[0, -0.24, 0]}>
          <capsuleGeometry args={[0.08, 1.9, 8, 24]} />
        </mesh>
      </group>
    </Float>
  );
}

function CodeSymbols({ scroll }: { scroll: MutableRefObject<number> }) {
  const items = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        label: symbols[index % symbols.length],
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 6.5,
        z: -7 + Math.random() * 7,
        size: 0.18 + Math.random() * 0.12,
        speed: 0.16 + Math.random() * 0.34,
      })),
    []
  );

  return (
    <group>
      {items.map((item, index) => (
        <SymbolText key={`${item.label}-${index}`} item={item} index={index} scroll={scroll} />
      ))}
    </group>
  );
}

function SymbolText({
  item,
  index,
  scroll,
}: {
  item: { label: string; x: number; y: number; z: number; size: number; speed: number };
  index: number;
  scroll: MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Mesh | null>(null);
  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    ref.current.position.x = item.x + Math.sin(clock.elapsedTime * item.speed + index) * 0.22 + pointer.x * 0.18;
    ref.current.position.y = item.y + Math.cos(clock.elapsedTime * item.speed + index) * 0.14 + pointer.y * 0.12;
    ref.current.position.z = item.z + scroll.current * 2.5;
    ref.current.rotation.y = pointer.x * 0.16;
  });

  return (
    <Text
      ref={ref}
      position={[item.x, item.y, item.z]}
      fontSize={item.size}
      color="#d9fbff"
      anchorX="center"
      anchorY="middle"
      fillOpacity={0.34}
      outlineWidth={0.002}
      outlineColor="#69e7ff"
    >
      {item.label}
    </Text>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.35, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.15 + pointer.y * 0.18, 0.035);
    camera.lookAt(0, 0, -1.5);
  });
  return null;
}

export default function HeroWorkspace3D() {
  const scroll = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const onScroll = () => {
      scroll.current = Math.min(window.scrollY / 900, 1.8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!ready) {
    return <div className="absolute inset-0 bg-[#050505]" aria-hidden="true" />;
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.15, 7.2], fov: 43, near: 0.1, far: 80 }}
        dpr={[1, 1.75]}
        eventSource={document.body}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050505"]} />
        <fog attach="fog" args={["#050505", 8, 22]} />
        <ambientLight intensity={0.45} />
        <pointLight position={[-3.5, 2.6, 3]} intensity={7} color="#7c3cff" distance={13} />
        <pointLight position={[3.8, -0.7, 2.2]} intensity={6} color="#00e5ff" distance={12} />
        <spotLight position={[0, 4.5, 4]} angle={0.5} penumbra={0.85} intensity={5.8} color="#c6fbff" distance={18} />
        <AuroraField scroll={scroll} />
        <ParticleCloud scroll={scroll} />
        <CodeSymbols scroll={scroll} />
        <GlassHeadphones scroll={scroll} />
        <CameraRig />
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.18} luminanceThreshold={0.18} luminanceSmoothing={0.42} mipmapBlur />
          <DepthOfField focusDistance={0.035} focalLength={0.05} bokehScale={2.15} />
          <Vignette eskil={false} offset={0.18} darkness={0.65} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
