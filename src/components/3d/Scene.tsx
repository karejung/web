"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import { Model } from "./Model";
import { Reflector } from "./Reflector";
import * as THREE from "three/webgpu";
import { scenesData } from "@/data/scenes";
import { useSceneStore } from "@/store/sceneStore";
import { useSceneNavigation } from "@/config/useSceneNavigation";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useScreenSize } from "@/config/useScreenSize";
import type { ModelConfig, ReflectorConfig } from "@/data/scenes";

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

interface AnimatedModelWrapperProps {
  model: ModelConfig;
  reflector?: ReflectorConfig;
  index: number;
  isCurrentModel: boolean;
  scale: number;
  position: [number, number, number];
}

function AnimatedModelWrapper({ model, reflector, isCurrentModel, scale, position }: AnimatedModelWrapperProps) {
  const spring = useSpring({
    scale: scale,
    positionX: position[0],
    positionY: position[1],
    positionZ: position[2],
    config: SPRING_CONFIG
  });

  const handlePointerOver = () => {
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  return (
    <animated.group
      scale={spring.scale}
      position-x={spring.positionX}
      position-y={spring.positionY}
      position-z={spring.positionZ}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <Model 
        modelName={model.component}
        rotation={model.rotation}
        isCurrentModel={isCurrentModel}
      >
        {isCurrentModel && (
          <Reflector items={reflector?.items || []} />
        )}
      </Model>
    </animated.group>
  );
}

interface ModelGroupProps {
  getModelScale: (baseScale: number) => number;
  getModelPosition: (basePosition: [number, number, number], index: number) => [number, number, number];
  ySpacing: number;
}


function ModelGroup({ getModelScale, getModelPosition, ySpacing }: ModelGroupProps) {
  const currentIndex = useSceneStore((state) => state.currentIndex);
  
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
      {scenesData.map((scene, index) => {
        if (!visibleIndices.includes(index)) return null;
        
        // Scene에서 스케일/위치 계산
        const scale = getModelScale(scene.model.scale);
        const position = getModelPosition(scene.model.position, index);
        
        return (
          <Suspense key={`model-${index}`} fallback={null}>
            <AnimatedModelWrapper
              model={scene.model}
              reflector={scene.reflector}
              index={index}
              isCurrentModel={index === currentIndex}
              scale={scale}
              position={position}
            />
          </Suspense>
        );
      })}
    </animated.group>
  );
}

export default function Scene() {
  const isBlurred = useSceneStore((state) => state.isBlurred);
  const { getModelScale, getModelPosition, getYSpacing } = useScreenSize();
  const ySpacing = getYSpacing();
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
        
        <OrbitControls 
          autoRotate={true} 
          autoRotateSpeed={0.05} 
          enableZoom={false}
          enablePan={false}
          enableDamping 
          makeDefault 
          target={[0, 1.5, 0]}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 3}
          minAzimuthAngle={-Math.PI / -2}
          maxAzimuthAngle={Math.PI / -2}
        />
        
        <ModelGroup getModelScale={getModelScale} getModelPosition={getModelPosition} ySpacing={ySpacing} />
      </Canvas>
      <GradientOverlay position="top" />
      <GradientOverlay position="bottom" />
      <div 
        className={`absolute inset-0 pointer-events-none backdrop-blur-sm transition-opacity duration-300 ${
          isBlurred ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
