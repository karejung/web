"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import LoadingScreen from "@/components/ui/LoadingScreen";
import Logo from "@/components/ui/Logo";
import { Nav } from "@/components/ui/Nav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
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
      <Logo />
      <Nav />
      {children}
    </>
  );
}
