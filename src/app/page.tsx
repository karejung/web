"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useSceneStore } from "@/hook/sceneStore";
import BackButton from "@/components/ui/BackButton";
import Scene from "@/components/3d/Scene";
import { Nav } from "@/components/ui/Nav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import Logo from "@/components/ui/Logo";

export default function Home() {
  const isDetailView = useSceneStore((state) => state.isDetailView);
  const { active, progress } = useProgress();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
      <Scene />
      {isDetailView && (
        <div className="relative z-10">
          <BackButton />
        </div>
      )}
    </>
  );
}
