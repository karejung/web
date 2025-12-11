"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// 디바이스 정보 인터페이스
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
}

// 창 크기 인터페이스
interface WindowSize {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
}

// 반응형 정보 인터페이스
export interface ResponsiveInfo extends WindowSize {
  // 디바이스 유형
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  
  // 3D 모델용 계산 함수
  getModelScale: (baseScale: number) => number;
  getModelPosition: (basePosition: [number, number, number], index: number) => [number, number, number];
  getYSpacing: () => number;
  getCameraTarget: () => [number, number, number];
  getDetailYOffset: () => number;
}

/**
 * 정확한 뷰포트 크기를 측정하는 함수
 * 모바일 브라우저의 주소창 등을 고려한 실제 뷰포트 크기 측정
 */
function measureViewportSize(): { width: number; height: number } {
  if (typeof document === 'undefined') {
    return { width: 0, height: 0 };
  }

  // 임시 div 요소로 100vw, 100vh 측정
  const sizeViewport = document.createElement('div');
  sizeViewport.style.width = '100vw';
  sizeViewport.style.height = '100vh';
  sizeViewport.style.position = 'absolute';
  sizeViewport.style.top = '0';
  sizeViewport.style.left = '0';
  sizeViewport.style.pointerEvents = 'none';
  sizeViewport.style.visibility = 'hidden';

  document.body.appendChild(sizeViewport);
  const size = {
    width: sizeViewport.offsetWidth,
    height: sizeViewport.offsetHeight
  };
  document.body.removeChild(sizeViewport);

  return size;
}

/**
 * 통합된 반응형 기기 및 창 크기 감지 훅
 * - 실시간 리사이즈 반응
 * - 정확한 뷰포트 크기 측정
 * - 디바이스 유형 감지 (isMobile, isTablet, isDesktop)
 * - 3D 모델용 반응형 계산 함수
 */
export function useScreenSize(): ResponsiveInfo {
  // 창 크기 상태 (실제 뷰포트 크기 포함)
  const [windowSize, setWindowSize] = useState<WindowSize>(() => {
    const viewport = measureViewportSize();
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      viewportWidth: viewport.width || 1920,
      viewportHeight: viewport.height || 1080,
      pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
    };
  });

  // 디바이스 정보 상태
  const deviceInfo = useRef<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    userAgent: ''
  });

  // RAF를 사용한 리사이즈 핸들러 (실시간 반응)
  const rafId = useRef<number | undefined>(undefined);
  const isResizing = useRef<boolean>(false);
  
  const handleResize = useCallback(() => {
    if (isResizing.current) return;
    
    isResizing.current = true;
    
    // 이전 RAF 취소
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    // 다음 프레임에서 상태 업데이트
    rafId.current = requestAnimationFrame(() => {
      if (typeof window === 'undefined') {
        isResizing.current = false;
        return;
      }

      const viewport = measureViewportSize();
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize(prev => {
        // 실제로 변경된 경우에만 업데이트
        if (prev.width !== width || prev.height !== height || 
            prev.viewportWidth !== viewport.width || prev.viewportHeight !== viewport.height) {
          return {
            width,
            height,
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
          };
        }
        return prev;
      });
      
      isResizing.current = false;
    });
  }, []);

  // 창 크기 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // visualViewport의 리사이즈 이벤트도 리스닝 (모바일 주소창 등)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    
    // 초기 크기 설정
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
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
      isDesktop: !isMobileDevice && !isTabletDevice,
      userAgent
    };
  }, []);

  // 3D 모델 스케일 계산 (baseScale * scaleFactor)
  const getModelScale = useCallback((baseScale: number): number => {
    const { viewportWidth } = windowSize;
    let scaleFactor = 1;
    
    if (viewportWidth > 1440) scaleFactor = 1.2;
    else if (viewportWidth > 1024) scaleFactor = 1.05;
    else if (viewportWidth > 768) scaleFactor = 0.9;
    else if (viewportWidth > 480) scaleFactor = 0.8;
    else scaleFactor = 0.7;
    
    return baseScale * scaleFactor;
  }, [windowSize.viewportWidth]);

  // 3D 모델 위치 계산 (basePosition + yOffset + index spacing)
  const getModelPosition = useCallback((basePosition: [number, number, number], index: number): [number, number, number] => {
    const { viewportWidth, viewportHeight } = windowSize;
    
    // 실제 뷰포트 aspect ratio 계산
    const aspectRatio = viewportWidth / viewportHeight;
    
    // Y 오프셋 계산 - 다양한 화면 비율에 대응
    let yOffset = 0;
    
    // 1. 세로로 긴 화면 (모바일, 세로 태블릿 등) - aspect ratio < 1
    if (aspectRatio < 0.6) {
      // 매우 세로로 긴 화면 (예: 모바일 세로)
      yOffset = 0.8 + (0.6 - aspectRatio) * 3;
    } else if (aspectRatio < 0.75) {
      // 좁은 모바일 화면
      yOffset = 0.5 + (0.75 - aspectRatio) * 2;
    } else if (aspectRatio < 1) {
      // 약간 세로로 긴 화면
      yOffset = 0.3 + (1 - aspectRatio) * 0.8;
    }
    // 2. 정사각형에 가까운 화면 (1 ~ 1.3)
    else if (aspectRatio < 1.3) {
      yOffset = 0.2;
    }
    // 3. 일반적인 가로 화면 (1.3 ~ 1.5) - 예: 4:3
    else if (aspectRatio < 1.5) {
      yOffset = 0.1;
    }
    // 4. 와이드 화면 (1.5 ~ 1.8) - 예: 16:10
    else if (aspectRatio < 1.8) {
      yOffset = 0;
    }
    // 5. 매우 와이드 화면 (1.8 ~ 2.0) - 예: 16:9
    else if (aspectRatio < 2.0) {
      yOffset = -0.1;
    }
    // 6. 울트라 와이드 화면 (2.0+) - 예: 21:9
    else {
      yOffset = -0.2 - (aspectRatio - 2.0) * 0.2;
    }
    
    // 화면 높이에 따른 추가 조정 (작은 화면에서 더 섬세한 조정)
    if (viewportHeight < 600) {
      yOffset += 0.4;
    } else if (viewportHeight < 700) {
      yOffset += 0.25;
    } else if (viewportHeight < 800) {
      yOffset += 0.15;
    }
    
    // Y 간격 계산 (모델 간 거리) - 화면 크기와 비율 모두 고려
    let ySpacing = 6;
    if (viewportWidth <= 480) {
      ySpacing = 3.5;
    } else if (viewportWidth <= 768) {
      ySpacing = 4;
    } else if (viewportWidth <= 1024) {
      ySpacing = 4.5;
    } else if (viewportWidth <= 1440) {
      ySpacing = 5;
    } else if (viewportWidth <= 1920) {
      ySpacing = 5.5;
    }
    
    // aspect ratio가 매우 좁은 경우 간격 조정
    if (aspectRatio < 0.75) {
      ySpacing *= 0.85;
    }
    
    return [
      basePosition[0],
      basePosition[1] + yOffset + (index * -ySpacing),
      basePosition[2]
    ];
  }, [windowSize.viewportWidth, windowSize.viewportHeight]);

  // Y 간격만 반환 (그룹 애니메이션용)
  const getYSpacing = useCallback((): number => {
    const { viewportWidth, viewportHeight } = windowSize;
    const aspectRatio = viewportWidth / viewportHeight;
    
    let ySpacing = 6;
    if (viewportWidth <= 480) {
      ySpacing = 3.5;
    } else if (viewportWidth <= 768) {
      ySpacing = 4;
    } else if (viewportWidth <= 1024) {
      ySpacing = 4.5;
    } else if (viewportWidth <= 1440) {
      ySpacing = 5;
    } else if (viewportWidth <= 1920) {
      ySpacing = 5.5;
    }
    
    // aspect ratio가 매우 좁은 경우 간격 조정
    if (aspectRatio < 0.75) {
      ySpacing *= 0.85;
    }
    
    return ySpacing;
  }, [windowSize.viewportWidth, windowSize.viewportHeight]);

  // 카메라 타겟 위치 계산 (화면 비율에 따라 동적 조정)
  const getCameraTarget = useCallback((): [number, number, number] => {
    const { viewportWidth, viewportHeight } = windowSize;
    const aspectRatio = viewportWidth / viewportHeight;
    
    let targetY = 1.5; // 기본값
    
    // aspect ratio에 따라 카메라 타겟 Y 좌표 조정
    if (aspectRatio < 0.6) {
      // 매우 세로로 긴 화면
      targetY = 2.5;
    } else if (aspectRatio < 0.75) {
      // 좁은 모바일 화면
      targetY = 2.2;
    } else if (aspectRatio < 1) {
      // 약간 세로로 긴 화면
      targetY = 1.9;
    } else if (aspectRatio < 1.3) {
      // 정사각형에 가까운 화면
      targetY = 1.7;
    } else if (aspectRatio < 1.5) {
      // 일반적인 가로 화면
      targetY = 1.6;
    } else if (aspectRatio < 1.8) {
      // 와이드 화면
      targetY = 1.5;
    } else if (aspectRatio < 2.0) {
      // 매우 와이드 화면
      targetY = 1.4;
    } else {
      // 울트라 와이드 화면
      targetY = 1.3;
    }
    
    // 화면 높이에 따른 미세 조정
    if (viewportHeight < 600) {
      targetY += 0.3;
    } else if (viewportHeight < 700) {
      targetY += 0.2;
    } else if (viewportHeight < 800) {
      targetY += 0.1;
    }
    
    return [0, targetY, 0];
  }, [windowSize.viewportWidth, windowSize.viewportHeight]);

  // 상세 모드에서의 Y 오프셋 계산 (화면 크기에 따라 동적 조정)
  const getDetailYOffset = useCallback((): number => {
    const { viewportWidth, viewportHeight } = windowSize;
    const aspectRatio = viewportWidth / viewportHeight;
    
    let offset = -0.3; // 기본값
    
    // aspect ratio에 따른 조정
    if (aspectRatio < 0.6) {
      offset = 0;
    } else if (aspectRatio < 0.75) {
      offset = -0.05;
    } else if (aspectRatio < 1) {
      offset = -0.1;
    } else if (aspectRatio < 1.3) {
      offset = -0.15;
    } else if (aspectRatio < 1.5) {
      offset = -0.2;
    } else if (aspectRatio < 1.8) {
      offset = -0.25;
    } else if (aspectRatio < 2.0) {
      offset = -0.3;
    } else {
      offset = -0.35;
    }
    
    // 화면 높이에 따른 미세 조정
    if (viewportHeight < 600) {
      offset += 0.15;
    } else if (viewportHeight < 700) {
      offset += 0.1;
    } else if (viewportHeight < 800) {
      offset += 0.05;
    }
    
    return offset;
  }, [windowSize.viewportWidth, windowSize.viewportHeight]);

  // 통합된 반응형 정보 반환
  return {
    width: windowSize.width,
    height: windowSize.height,
    viewportWidth: windowSize.viewportWidth,
    viewportHeight: windowSize.viewportHeight,
    pixelRatio: windowSize.pixelRatio,
    isMobile: deviceInfo.current.isMobile,
    isTablet: deviceInfo.current.isTablet,
    isDesktop: deviceInfo.current.isDesktop,
    userAgent: deviceInfo.current.userAgent,
    getModelScale,
    getModelPosition,
    getYSpacing,
    getCameraTarget,
    getDetailYOffset
  };
}
