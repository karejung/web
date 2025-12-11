"use client";

import { useState, useEffect, Suspense } from "react";
import { useProgress } from "@react-three/drei";
import Scene from "@/components/3d/Scene";
import LoadingScreen from "@/components/ui/LoadingScreen";

function LoadingManager({ children }: { children: React.ReactNode }) {
  const { active, progress } = useProgress();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로딩 완료 조건: progress가 100에 도달하거나, active가 false이고 progress > 0
    if (progress >= 100 && !active) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
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

export default function ThreeDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoadingManager>
      <Scene />
      {children}
    </LoadingManager>
  );
}

