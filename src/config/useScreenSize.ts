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
  
  // 반응형 계산 함수
  getScaleFactor: () => number;
  getPositionYOffset: () => number;
  getResponsiveScale: (baseScale: number) => number;
  getResponsivePosition: (basePosition: [number, number, number]) => [number, number, number];
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

  // 화면 너비에 따른 스케일 팩터 계산
  const getScaleFactor = useCallback((): number => {
    const { width } = windowSize;
    if (width > 1440) return 1.2;
    if (width > 1024) return 1.05;
    if (width > 768) return 0.9;
    if (width > 480) return 0.8;
    return 0.7;
  }, [windowSize.width]);

  // 화면 너비에 따른 Y축 위치 오프셋 계산
  const getPositionYOffset = useCallback((): number => {
    const { width } = windowSize;
    if (width > 1440) return -0.3;
    if (width > 1024) return -0.2;
    if (width > 768) return -0.1;
    return 0;
  }, [windowSize.width]);

  // 화면 크기에 따라 스케일을 조정
  const getResponsiveScale = useCallback((baseScale: number): number => {
    const scaleFactor = getScaleFactor();
    return baseScale * scaleFactor;
  }, [getScaleFactor]);

  // 화면 크기에 따라 위치를 조정
  const getResponsivePosition = useCallback((basePosition: [number, number, number]): [number, number, number] => {
    const yOffset = getPositionYOffset();
    return [
      basePosition[0],
      basePosition[1] + yOffset,
      basePosition[2]
    ];
  }, [getPositionYOffset]);

  // 통합된 반응형 정보 반환
  return {
    width: windowSize.width,
    height: windowSize.height,
    pixelRatio: windowSize.pixelRatio,
    isMobile: deviceInfo.current.isMobile,
    isTablet: deviceInfo.current.isTablet,
    isDesktop: deviceInfo.current.isDesktop,
    getScaleFactor,
    getPositionYOffset,
    getResponsiveScale,
    getResponsivePosition
  };
}
