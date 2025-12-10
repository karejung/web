"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import Scene from "@/components/3d/Scene";
import LoadingScreen from "@/components/ui/LoadingScreen";

function LoadingManager({ children }: { children: React.ReactNode }) {
  const { active, progress } = useProgress();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // progress가 100에 도달하고 active가 false가 되면 로딩 완료
    if (progress >= 100 && !active) {
      // LoadingScreen 내부의 최소 시간 로직이 완료될 때까지 기다림
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // 로딩 화면이 100에 도달한 후 약간의 여유
      return () => clearTimeout(timer);
    }
  }, [progress, active]);

  return (
    <>
      <LoadingScreen isLoading={isLoading} progress={progress} />
      {children}
    </>
  );
}

export default function Home() {
  return (
    <LoadingManager>
      {/* 3D Scene - 휠 스크롤로 모델 전환 */}
      <Scene />
    </LoadingManager>
  );
}
