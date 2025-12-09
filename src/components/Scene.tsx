"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Model } from "./Model";
import { Reflector } from "./Reflector";
import * as THREE from "three/webgpu";
import { scenesData } from "../data/scenes";

// 카메라 설정 상수
const CAMERA_CONFIG = {
  fov: 1,
  position: [5 * 29, 6.5 * 29, -10 * 29] as [number, number, number],
  near: 100,
  far: 1000,
  zoom: 1
};

export default function Scene() {
  return (
    <div className="w-screen h-screen">
      <Canvas 
        camera={{
          position: CAMERA_CONFIG.position,
          fov: CAMERA_CONFIG.fov,
          near: CAMERA_CONFIG.near,
          far: CAMERA_CONFIG.far
        }}
        gl={async (canvasProps) => {
          const renderer = new THREE.WebGPURenderer({
            canvas: canvasProps.canvas as HTMLCanvasElement,
            antialias: true
          });
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1;
          await renderer.init();
          return renderer;
        }}
      >
        <color attach="background" args={["#111"]} />
        <Environment preset="city" environmentIntensity={0.75} />
        
        <Suspense fallback={null}>
          <Model config={scenesData[1].model}>
            <Reflector items={scenesData[1].reflector?.items || []} />
          </Model>
        </Suspense>

        <OrbitControls 
          autoRotate={true} 
          autoRotateSpeed={0.05} 
          enableDamping 
          makeDefault 
          target={[0, 1.5, 0]}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
 

