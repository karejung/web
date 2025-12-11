"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// 디바이스 정보 인터페이스
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// 반응형 정보 인터페이스
export interface ResponsiveInfo {
  // 화면 크기
  width: number;
  height: number;
  pixelRatio: number;
  
  // 디바이스 유형
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // 3D 모델용 계산 함수
  getModelScale: (baseScale: number) => number;
  getModelPosition: (basePosition: [number, number, number], index: number) => [number, number, number];
  getYSpacing: () => number;
}

/**
 * 통합된 반응형 기기 및 창 크기 감지 훅
 * - 실시간 리사이즈 반응
 * - 디바이스 유형 감지 (isMobile, isTablet, isDesktop)
 * - 3D 모델용 반응형 계산 함수
 */
export function useScreenSize(): ResponsiveInfo {
  // 창 크기 상태
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  }));

  // 디바이스 정보 상태
  const deviceInfo = useRef<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  // RAF를 사용한 리사이즈 핸들러 (실시간 반응)
  const rafId = useRef<number | undefined>(undefined);
  
  const handleResize = useCallback(() => {
    // 이전 RAF 취소
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    // 다음 프레임에서 상태 업데이트
    rafId.current = requestAnimationFrame(() => {
      if (typeof window === 'undefined') return;

      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;

      setWindowSize(prev => {
        // 실제로 변경된 경우에만 업데이트
        if (prev.width !== width || prev.height !== height) {
          return {
            width,
            height,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
          };
        }
        return prev;
      });
    });
  }, []);

  // 창 크기 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', handleResize, { passive: true });
    
    // visualViewport의 리사이즈 이벤트도 리스닝
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    // 초기 크기 설정
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleResize]);

  // 디바이스 유형 감지
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const userAgent = navigator.userAgent;
    
    const isMobileDevice = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTabletDevice = /iPad/i.test(userAgent) || 
      (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent));
    
    deviceInfo.current = {
      isMobile: isMobileDevice && !isTabletDevice,
      isTablet: isTabletDevice,
      isDesktop: !isMobileDevice && !isTabletDevice
    };
  }, []);

  // 3D 모델 스케일 계산 (baseScale * scaleFactor)
  const getModelScale = useCallback((baseScale: number): number => {
    const { width } = windowSize;
    let scaleFactor = 1;
    
    if (width > 1440) scaleFactor = 1.2;
    else if (width > 1024) scaleFactor = 1.05;
    else if (width > 768) scaleFactor = 0.9;
    else if (width > 480) scaleFactor = 0.8;
    else scaleFactor = 0.7;
    
    return baseScale * scaleFactor;
  }, [windowSize.width]);

  // 3D 모델 위치 계산 (basePosition + yOffset + index spacing)
  const getModelPosition = useCallback((basePosition: [number, number, number], index: number): [number, number, number] => {
    const { width } = windowSize;
    
    // Y 오프셋 계산 (모바일 중앙 보정)
    let yOffset = 0;
    if (width < 640) yOffset = 0.6;
    else if (width < 1024) yOffset = 0.3;
    
    // Y 간격 계산 (모델 간 거리)
    let ySpacing = 6;
    if (width <= 768) ySpacing = 4;
    else if (width <= 1440) ySpacing = 5;
    
    return [
      basePosition[0],
      basePosition[1] + yOffset + (index * -ySpacing),
      basePosition[2]
    ];
  }, [windowSize.width]);

  // Y 간격만 반환 (그룹 애니메이션용)
  const getYSpacing = useCallback((): number => {
    const { width } = windowSize;
    if (width <= 768) return 4;
    if (width <= 1440) return 5;
    return 6;
  }, [windowSize.width]);

  // 통합된 반응형 정보 반환
  return {
    width: windowSize.width,
    height: windowSize.height,
    pixelRatio: windowSize.pixelRatio,
    isMobile: deviceInfo.current.isMobile,
    isTablet: deviceInfo.current.isTablet,
    isDesktop: deviceInfo.current.isDesktop,
    getModelScale,
    getModelPosition,
    getYSpacing
  };
}
