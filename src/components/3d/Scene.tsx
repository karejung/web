"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import { Model } from "./Model";
import { Reflector } from "./Reflector";
import * as THREE from "three/webgpu";
import { scenesData } from "@/data/scenes";
import { useSceneStore } from "@/store/sceneStore";
import { useSceneNavigation } from "@/hooks/useSceneNavigation";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useScreenSize } from "@/config/useScreenSize";

// 카메라 설정 상수
const CAMERA_CONFIG = {
  fov: 1,
  position: [5 * 29, 6.5 * 29, -10 * 29] as [number, number, number],
  near: 100,
  far: 1000,
  zoom: 1
};

// 스프링 설정
const SPRING_CONFIG = {
  tension: 280,
  friction: 60,
  precision: 0.001
};

interface ModelGroupProps {
  screenWidth: number;
}

/**
 * 모델 그룹 컴포넌트 - Canvas 내부에서 사용
 */
function ModelGroup({ screenWidth }: ModelGroupProps) {
  const currentIndex = useSceneStore((state) => state.currentIndex);
  
  // 화면 크기에 따른 Y 간격 계산
  const ySpacing = useMemo(() => {
    if (screenWidth <= 768) return 4;
    if (screenWidth <= 1440) return 5;
    return 6;
  }, [screenWidth]);
  
  // 그룹 Y 위치 스프링 애니메이션
  const { y } = useSpring({
    y: currentIndex * ySpacing,
    config: SPRING_CONFIG
  });

  // 보이는 모델만 렌더링 (성능 최적화)
  const visibleIndices = useMemo(() => {
    const range = 1; // 현재 모델 ±1 범위만 렌더링
    return scenesData
      .map((_, i) => i)
      .filter(i => Math.abs(i - currentIndex) <= range);
  }, [currentIndex]);

  return (
    <animated.group position-y={y}>
      {scenesData.map((scene, index) => (
        visibleIndices.includes(index) && (
          <Suspense key={`model-${index}`} fallback={null}>
            <Model 
              config={scene.model} 
              index={index}
              currentIndex={currentIndex}
              screenWidth={screenWidth}
            >
              {/* 현재 모델일 때만 Reflector 렌더링 */}
              {index === currentIndex && (
                <Reflector items={scene.reflector?.items || []} />
              )}
            </Model>
          </Suspense>
        )
      ))}
    </animated.group>
  );
}

export default function Scene() {
  const isBlurred = useSceneStore((state) => state.isBlurred);
  const { width } = useScreenSize(); // Canvas 외부에서 호출
  const { 
    containerRef, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd 
  } = useSceneNavigation();

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 w-screen h-screen -z-10"
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
        
        <ModelGroup screenWidth={width} />
      </Canvas>
      
      {/* 그라디언트 오버레이 */}
      <GradientOverlay position="top" />
      <GradientOverlay position="bottom" />
      
      {/* 블러 레이어 */}
      <div 
        className={`absolute inset-0 pointer-events-none backdrop-blur-sm transition-opacity duration-300 ${
          isBlurred ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
