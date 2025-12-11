"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import LoadingScreen from "@/components/ui/LoadingScreen";
import Logo from "@/components/ui/Logo";
import { Nav } from "@/components/ui/Nav";

const LOADING_COMPLETED_KEY = "alt_loading_completed";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { active, progress } = useProgress();
  
  // sessionStorage에서 이미 로딩이 완료되었는지 확인
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(LOADING_COMPLETED_KEY) !== "true";
  });

  useEffect(() => {
    // 이미 로딩이 완료된 적이 있으면 스킵
    if (sessionStorage.getItem(LOADING_COMPLETED_KEY) === "true") {
      setIsLoading(false);
      return;
    }

    // 로딩 완료 조건: progress가 100에 도달하거나, active가 false이고 progress > 0
    if (progress >= 100 && !active) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        // sessionStorage에 로딩 완료 표시 (세션 동안 유지)
        sessionStorage.setItem(LOADING_COMPLETED_KEY, "true");
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
