"use client";

import { useEffect, useRef, use } from "react";
import { useSceneStore } from "./sceneStore";
import { scenesData } from "@/data/scenes";

/**
 * 상세 페이지에서 사용하는 훅
 * URL 파라미터와 sceneStore 상태를 동기화합니다.
 */
export function useDetailPage(paramsPromise: Promise<{ id: string }>) {
  const params = use(paramsPromise);
  const { id } = params;
  
  const enterDetail = useSceneStore((state) => state.enterDetail);
  const setCurrentScene = useSceneStore((state) => state.setCurrentScene);
  
  // 이미 초기화되었는지 추적
  const initializedRef = useRef(false);

  useEffect(() => {
    // 이미 초기화되었으면 스킵
    if (initializedRef.current) {
      return;
    }

    // 유효한 모델 ID인지 확인
    const sceneIndex = scenesData.findIndex((scene) => scene.id === id);
    if (sceneIndex === -1) {
      console.warn(`Invalid model ID: ${id}`);
      return;
    }

    // 현재 씬 인덱스 설정
    setCurrentScene(sceneIndex);

    // 상세 모드 진입 (직접 URL로 접근한 경우 또는 클릭으로 접근한 경우)
    const { isDetailView, selectedModelId } = useSceneStore.getState();
    if (!isDetailView || selectedModelId !== id) {
      enterDetail(id);
    }

    initializedRef.current = true;
  }, [id, enterDetail, setCurrentScene]);

  // 컴포넌트 언마운트 시 ref 초기화
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  return { modelId: id };
}

