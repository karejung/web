"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { useSceneStore } from "@/config/sceneStore";
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

// 타겟 위치 상수
const TARGET_DEFAULT = new THREE.Vector3(0, 1.5, 0);
const TARGET_DETAIL = new THREE.Vector3(0, 2, 0);

// 반응형 카메라 컨트롤 컴포넌트
function ResponsiveOrbitControls({ 
  isDetailView 
}: { 
  isDetailView: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const rotateSpeedRef = useRef(0.1);
  const { camera } = useThree();
  
  // 애니메이션 상태
  const animatingRef = useRef(false);
  const targetPositionRef = useRef(TARGET_DEFAULT.clone());
  const currentPolarAngleRef = useRef(Math.PI / 3);
  const prevIsDetailViewRef = useRef(isDetailView);
  
  // 초기 카메라 위치 저장
  const initialCameraPositionRef = useRef(new THREE.Vector3(...CAMERA_CONFIG.position));
  
  const minAzimuth = isDetailView ? -Infinity : -Math.PI / -2;
  const maxAzimuth = isDetailView ? Infinity : Math.PI / -2;

  // isDetailView 변경 시 애니메이션 시작
  useEffect(() => {
    if (prevIsDetailViewRef.current !== isDetailView) {
      animatingRef.current = true;
      
      // DetailView에서 돌아올 때 (back) - 카메라 위치와 회전값 초기화
      if (!isDetailView && controlsRef.current) {
        // 카메라 위치를 초기값으로 되돌리기 위한 타겟 설정
        initialCameraPositionRef.current.set(...CAMERA_CONFIG.position);
      }
      
      prevIsDetailViewRef.current = isDetailView;
    }
  }, [isDetailView]);

  // 애니메이션 및 autoRotate 처리
  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    
    const controls = controlsRef.current;
    const lerpFactor = 1 - Math.pow(0.01, delta); // 부드러운 lerp (delta 기반)
    
    // 타겟 위치 애니메이션
    const targetGoal = isDetailView ? TARGET_DETAIL : TARGET_DEFAULT;
    targetPositionRef.current.lerp(targetGoal, lerpFactor);
    controls.target.copy(targetPositionRef.current);
    
    // minPolarAngle 애니메이션
    const targetPolarAngle = isDetailView ? 0 : Math.PI / 3;
    currentPolarAngleRef.current = THREE.MathUtils.lerp(
      currentPolarAngleRef.current,
      targetPolarAngle,
      lerpFactor
    );
    controls.minPolarAngle = currentPolarAngleRef.current;
    
    // DetailView에서 돌아올 때 카메라 위치 초기화 애니메이션
    if (!isDetailView && animatingRef.current) {
      // 애니메이션 중에는 autoRotate 비활성화
      controls.autoRotate = false;
      
      camera.position.lerp(initialCameraPositionRef.current, lerpFactor);
      
      // 애니메이션 완료 체크
      const distanceToTarget = camera.position.distanceTo(initialCameraPositionRef.current);
      const targetDistance = controls.target.distanceTo(TARGET_DEFAULT);
      
      if (distanceToTarget < 0.5 && targetDistance < 0.01) {
        animatingRef.current = false;
        // 애니메이션 완료 후 autoRotate 활성화
        controls.autoRotate = true;
      }
    } else if (!isDetailView) {
      // 애니메이션이 아닐 때 autoRotate 활성화 확인
      controls.autoRotate = true;
    } else {
      // DetailView일 때는 autoRotate 비활성화
      controls.autoRotate = false;
    }
    
    // autoRotate 방향 제어 (DetailView가 아니고 애니메이션 중이 아닐 때만)
    if (!isDetailView && !animatingRef.current) {
      const azimuth = controls.getAzimuthalAngle();
      
      if (azimuth >= maxAzimuth && rotateSpeedRef.current > 0) {
        rotateSpeedRef.current = -0.05;
      } else if (azimuth <= minAzimuth && rotateSpeedRef.current < 0) {
        rotateSpeedRef.current = 0.05;
      }
      
      controls.autoRotateSpeed = rotateSpeedRef.current;
    }
    
    controls.update();
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      autoRotateSpeed={rotateSpeedRef.current} 
      enableZoom={isDetailView}
      enablePan={false}
      enableDamping 
      dampingFactor={0.05}
      makeDefault 
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
      <div 
        className={`absolute inset-0 pointer-events-none backdrop-blur-xs transition-opacity duration-300 ${
          isBlurred ? 'opacity-100' : 'opacity-0'
        }`}
      />

    </div>
  );
}
