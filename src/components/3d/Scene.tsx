"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { useSceneStore } from "@/hook/sceneStore";
import { useSceneNavigation } from "@/hook/useSceneNavigation";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useScreenSize } from "@/hook/useScreenSize";
import { ModelGroup } from "./ModelGroup";

// 카메라 설정 상수
const CAMERA_CONFIG = {
  fov: 1,
  position: [5 * 29, 6.5 * 29, -10 * 29] as [number, number, number],
  near: 200,
  far: 1000,
  zoom: 1
};

// 반응형 카메라 컨트롤 컴포넌트
function ResponsiveOrbitControls({ 
  isDetailView 
}: { 
  isDetailView: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const rotateSpeedRef = useRef(0.05);
  const minAzimuth = isDetailView ? -Infinity : -Math.PI / -2;
  const maxAzimuth = isDetailView ? Infinity : Math.PI / -2;


  // autoRotate 방향을 한계에 도달하면 반대로 변경
  useFrame(() => {
    if (!isDetailView && controlsRef.current) {
      const azimuth = controlsRef.current.getAzimuthalAngle();
      
      // 한계에 도달하면 방향 반전
      if (azimuth >= maxAzimuth && rotateSpeedRef.current > 0) {
        rotateSpeedRef.current = -0.05;
      } else if (azimuth <= minAzimuth && rotateSpeedRef.current < 0) {
        rotateSpeedRef.current = 0.05;
      }
      
      controlsRef.current.autoRotateSpeed = rotateSpeedRef.current;
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      autoRotate={!isDetailView} 
      autoRotateSpeed={rotateSpeedRef.current} 
      enableZoom={isDetailView}
      enablePan={false}
      enableDamping 
      makeDefault 
      target={[0,2,0]}
      minPolarAngle={isDetailView ? 0 : Math.PI / 3}
      maxPolarAngle={Math.PI / 3}
      minAzimuthAngle={minAzimuth}
      maxAzimuthAngle={maxAzimuth}
    />
  );
}

export default function Scene() {
  const isBlurred = useSceneStore((state) => state.isBlurred);
  const isDetailView = useSceneStore((state) => state.isDetailView);
  const { getModelScale, getModelPosition, getYSpacing } = useScreenSize();
  
  // 반응형 값들을 메모이제이션
  const ySpacing = useMemo(() => getYSpacing(), [getYSpacing]);
  
  const { 
    containerRef, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd 
  } = useSceneNavigation();

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 w-screen h-[100dvh] -z-10"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
        <ResponsiveOrbitControls isDetailView={isDetailView} />
        <ModelGroup getModelScale={getModelScale} getModelPosition={getModelPosition} ySpacing={ySpacing} />
      </Canvas>
      <GradientOverlay position="top" />
      <GradientOverlay position="bottom" />
    </div>
  );
}
