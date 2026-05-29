"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroWorkspace3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x10131f, 8, 24);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 2.4, 9.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 8, 6);
    scene.add(key);

    const teal = new THREE.PointLight(0x2dd4bf, 3.2, 16);
    teal.position.set(-4, 2, 5);
    scene.add(teal);

    const coral = new THREE.PointLight(0xfb7185, 2.8, 15);
    coral.position.set(4, 1.5, 3);
    scene.add(coral);

    const yellow = new THREE.PointLight(0xfacc15, 1.6, 10);
    yellow.position.set(0, 3.2, 1.5);
    scene.add(yellow);

    const matDesk = new THREE.MeshStandardMaterial({
      color: 0x202638,
      roughness: 0.62,
      metalness: 0.14,
    });
    const matDark = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.35,
    });
    const matScreen = new THREE.MeshStandardMaterial({
      color: 0x07111f,
      emissive: 0x123f4c,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });
    const matTeal = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x0f766e,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const matCoral = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xbe123c,
      emissiveIntensity: 0.75,
      roughness: 0.34,
    });
    const matYellow = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xa16207,
      emissiveIntensity: 0.55,
      roughness: 0.38,
    });
    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.18,
      roughness: 0.18,
      metalness: 0.05,
      transmission: 0.2,
    });

    const desk = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.22, 3.6), matDesk);
    desk.position.set(0, -1.25, -0.35);
    group.add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(4.3, 2.55, 0.16), matDark);
    monitor.position.set(0, 0.42, -0.55);
    group.add(monitor);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.15, 0.06), matScreen);
    screen.position.set(0, 0.42, -0.44);
    group.add(screen);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.1, 0.28), matDark);
    stand.position.set(0, -0.85, -0.55);
    group.add(stand);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.9), matDark);
    base.position.set(0, -1.33, -0.2);
    group.add(base);

    const laptop = new THREE.Group();
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 1.4), matDark);
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 0.08), matScreen);
    laptopBase.position.set(0, -0.05, 0);
    laptopScreen.position.set(0, 0.62, -0.64);
    laptopScreen.rotation.x = -0.24;
    laptop.add(laptopBase, laptopScreen);
    laptop.position.set(2.55, -1.06, 0.78);
    laptop.rotation.y = -0.5;
    group.add(laptop);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.74,
    });

    for (let row = 0; row < 8; row += 1) {
      const width = row % 3 === 0 ? 2.5 : row % 2 === 0 ? 1.75 : 2.15;
      const y = 1.22 - row * 0.24;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.7, y, -0.38),
        new THREE.Vector3(-1.7 + width, y, -0.38),
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      group.add(line);
    }

    const chips = [
      { x: -3.3, y: 1.6, z: -0.9, m: matTeal },
      { x: 3.1, y: 1.35, z: -0.8, m: matCoral },
      { x: -2.8, y: -0.05, z: 0.65, m: matYellow },
      { x: 2.95, y: -0.22, z: -0.05, m: matGlass },
      { x: 0.05, y: 2.15, z: -1.05, m: matGlass },
    ];

    const chipMeshes: THREE.Mesh[] = [];
    chips.forEach((chip, index) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.08), chip.m);
      mesh.position.set(chip.x, chip.y, chip.z);
      mesh.rotation.set(0.12 * index, -0.22 + index * 0.1, 0.08 * index);
      chipMeshes.push(mesh);
      group.add(mesh);
    });

    const connectorMaterial = new THREE.LineBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.22,
    });
    const connectorPoints = [
      new THREE.Vector3(-3.3, 1.6, -0.9),
      new THREE.Vector3(0, 0.42, -0.3),
      new THREE.Vector3(3.1, 1.35, -0.8),
      new THREE.Vector3(0.05, 2.15, -1.05),
      new THREE.Vector3(-2.8, -0.05, 0.65),
      new THREE.Vector3(2.95, -0.22, -0.05),
    ];
    const connectors = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(connectorPoints),
      connectorMaterial
    );
    group.add(connectors);

    const grid = new THREE.GridHelper(12, 18, 0x64748b, 0x334155);
    grid.position.y = -1.42;
    grid.position.z = -0.3;
    grid.material.transparent = true;
    (grid.material as THREE.Material).opacity = 0.18;
    group.add(grid);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.01;
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, pointer.x * 0.16, 0.04);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -pointer.y * 0.08, 0.04);
      chipMeshes.forEach((mesh, index) => {
        mesh.position.y += Math.sin(frame + index) * 0.0018;
      });
      monitor.rotation.y = Math.sin(frame * 0.7) * 0.025;
      laptop.rotation.z = Math.sin(frame * 0.8) * 0.015;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
