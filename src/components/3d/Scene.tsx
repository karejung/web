"use client";

import { Suspense, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import { useRouter } from "next/navigation";
import { Model } from "./Model";
import { Reflector } from "./Reflector";
import * as THREE from "three/webgpu";
import { scenesData } from "@/data/scenes";
import { useSceneStore } from "@/hook/sceneStore";
import { useSceneNavigation } from "@/hook/useSceneNavigation";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useScreenSize } from "@/hook/useScreenSize";
import type { ModelConfig, ReflectorConfig } from "@/data/scenes";

// 카메라 설정 상수
const CAMERA_CONFIG = {
  fov: 1,
  position: [5 * 29, 6.5 * 29, -10 * 29] as [number, number, number],
  near: 200,
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
  sceneId: string;
  isCurrentModel: boolean;
  scale: number;
  position: [number, number, number];
  isDetailView: boolean;
  isSelectedModel: boolean;
  onModelClick: (sceneId: string) => void;
  onFadeOutComplete: () => void;
}

function AnimatedModelWrapper({ 
  model, 
  reflector, 
  sceneId,
  isCurrentModel, 
  scale, 
  position,
  isDetailView,
  isSelectedModel,
  onModelClick,
  onFadeOutComplete
}: AnimatedModelWrapperProps) {
  const { getDetailYOffset } = useScreenSize();
  
  // 상세 모드에서 선택된 모델은 1.2배, 아닌 모델은 opacity 0
  const targetScale = isDetailView && isSelectedModel ? scale * 1.2 : scale;
  const targetOpacity = isDetailView && !isSelectedModel ? 0 : 1;
  
  // 상세 모드에서 모델을 화면 중앙으로 이동 (Y축 아래로 조정) - 화면 크기에 따라 동적으로 계산
  const detailYOffset = isDetailView && isSelectedModel ? getDetailYOffset() : 0;

  const spring = useSpring({
    scale: targetScale,
    positionX: position[0],
    positionY: position[1] + detailYOffset,
    positionZ: position[2],
    opacity: targetOpacity,
    config: SPRING_CONFIG,
    onRest: (result) => {
      // 상세 모드에서 페이드아웃 완료 시에만 콜백 호출
      if (isDetailView && !isSelectedModel && result.value.opacity === 0) {
        onFadeOutComplete();
      }
    }
  });

  const handlePointerOver = () => {
    if (!isDetailView) {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  const handleClick = () => {
    if (!isDetailView && isCurrentModel) {
      onModelClick(sceneId);
    }
  };

  return (
    <animated.group
      scale={spring.scale}
      position-x={spring.positionX}
      position-y={spring.positionY}
      position-z={spring.positionZ}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <Model 
        modelName={model.component}
        rotation={model.rotation}
        isCurrentModel={isCurrentModel || isSelectedModel}
        opacity={spring.opacity}
      >
        {(isCurrentModel || isSelectedModel) && (
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

// 반응형 카메라 컨트롤 컴포넌트
function ResponsiveOrbitControls({ 
  cameraTarget, 
  isDetailView 
}: { 
  cameraTarget: [number, number, number]; 
  isDetailView: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const rotateSpeedRef = useRef(0.05);
  const minAzimuth = isDetailView ? -Infinity : -Math.PI / -2;
  const maxAzimuth = isDetailView ? Infinity : Math.PI / -2;

  // target이 변경될 때마다 OrbitControls 업데이트
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      controlsRef.current.update();
    }
  }, [cameraTarget]);

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
      target={cameraTarget}
      minPolarAngle={isDetailView ? 0 : Math.PI / 3}
      maxPolarAngle={Math.PI / 3}
      minAzimuthAngle={minAzimuth}
      maxAzimuthAngle={maxAzimuth}
    />
  );
}


function ModelGroup({ getModelScale, getModelPosition, ySpacing }: ModelGroupProps) {
  const router = useRouter();
  const currentIndex = useSceneStore((state) => state.currentIndex);
  const isDetailView = useSceneStore((state) => state.isDetailView);
  const selectedModelId = useSceneStore((state) => state.selectedModelId);
  const enterDetail = useSceneStore((state) => state.enterDetail);
  const setTransitioning = useSceneStore((state) => state.setTransitioning);
  
  // 페이드아웃 완료된 모델 추적 (상세 모드에서만 사용)
  const [fadedOutModels, setFadedOutModels] = useState<Set<string>>(new Set());
  
  // 이전 상세 모드 상태 추적
  const [wasDetailView, setWasDetailView] = useState(false);

  // 상세 모드 전환 감지 및 fadedOutModels 초기화
  useEffect(() => {
    if (wasDetailView && !isDetailView) {
      // 상세 모드에서 일반 모드로 전환됨 - 즉시 초기화
      setFadedOutModels(new Set());
    }
    setWasDetailView(isDetailView);
  }, [isDetailView, wasDetailView]);
  
  // 그룹 Y 위치 스프링 애니메이션
  const { y } = useSpring({
    y: currentIndex * ySpacing,
    config: SPRING_CONFIG
  });

  // 보이는 모델만 렌더링 (성능 최적화)
  const visibleIndices = useMemo(() => {
    // 일반 모드: 현재 모델 ±1 범위만 렌더링
    if (!isDetailView) {
      const range = 1;
      return scenesData
        .map((_, i) => i)
        .filter(i => Math.abs(i - currentIndex) <= range);
    }
    // 상세 모드: 선택된 모델 + 아직 페이드아웃 중인 모델만 표시
    return scenesData
      .map((scene, i) => ({ index: i, id: scene.id }))
      .filter(({ id }) => id === selectedModelId || !fadedOutModels.has(id))
      .map(({ index }) => index);
  }, [currentIndex, isDetailView, selectedModelId, fadedOutModels]);

  const handleModelClick = useCallback((sceneId: string) => {
    enterDetail(sceneId);
    router.push(`/${sceneId}`);
  }, [enterDetail, router]);

  const handleFadeOutComplete = useCallback((sceneId: string) => {
    // 상세 모드에서만 페이드아웃 완료 처리
    if (!isDetailView) return;
    
    setFadedOutModels(prev => new Set(prev).add(sceneId));
    // 모든 비선택 모델이 페이드아웃 완료되면 전환 완료
    const nonSelectedModels = scenesData.filter(s => s.id !== selectedModelId);
    const allFadedOut = nonSelectedModels.every(s => 
      fadedOutModels.has(s.id) || s.id === sceneId
    );
    if (allFadedOut) {
      setTransitioning(false);
    }
  }, [isDetailView, selectedModelId, fadedOutModels, setTransitioning]);

  return (
    <animated.group position-y={y}>
      {scenesData.map((scene, index) => {
        if (!visibleIndices.includes(index)) return null;
        
        // Scene에서 스케일/위치 계산
        const scale = getModelScale(scene.model.scale);
        const position = getModelPosition(scene.model.position, index);
        const isSelectedModel = scene.id === selectedModelId;
        
        return (
          <Suspense key={`model-${index}`} fallback={null}>
            <AnimatedModelWrapper
              model={scene.model}
              reflector={scene.reflector}
              index={index}
              sceneId={scene.id}
              isCurrentModel={index === currentIndex}
              scale={scale}
              position={position}
              isDetailView={isDetailView}
              isSelectedModel={isSelectedModel}
              onModelClick={handleModelClick}
              onFadeOutComplete={() => handleFadeOutComplete(scene.id)}
            />
          </Suspense>
        );
      })}
    </animated.group>
  );
}

export default function Scene() {
  const isBlurred = useSceneStore((state) => state.isBlurred);
  const isDetailView = useSceneStore((state) => state.isDetailView);
  const { getModelScale, getModelPosition, getYSpacing, getCameraTarget, viewportWidth, viewportHeight } = useScreenSize();
  
  // 반응형 값들을 메모이제이션
  const ySpacing = useMemo(() => getYSpacing(), [getYSpacing]);
  const cameraTarget = useMemo(() => getCameraTarget(), [getCameraTarget]);
  
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
        
        <ResponsiveOrbitControls cameraTarget={cameraTarget} isDetailView={isDetailView} />
        
        <ModelGroup getModelScale={getModelScale} getModelPosition={getModelPosition} ySpacing={ySpacing} />
      </Canvas>
      <GradientOverlay position="top" />
      <GradientOverlay position="bottom" />
      <div 
        className={`absolute inset-0 pointer-events-none backdrop-blur-xs transition-opacity duration-300 ${
          isBlurred ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
