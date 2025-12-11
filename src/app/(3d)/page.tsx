"use client";

import { useEffect } from "react";
import { useSceneStore } from "@/hook/sceneStore";

export default function Home() {
  const exitDetail = useSceneStore((state) => state.exitDetail);

  // 메인 페이지 마운트 시 상세 모드 종료 (브라우저 뒤로가기 대응)
  useEffect(() => {
    const { isDetailView } = useSceneStore.getState();
    if (isDetailView) {
      exitDetail();
    }
  }, [exitDetail]);

  return null;
}

