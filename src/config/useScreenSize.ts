"use client";

import { useState, useEffect } from "react";

interface ScreenSize {
  width: number;
  height: number;
}

interface ScaleConfig {
  main: number;  // Scene.tsx용
  test: number;  // test/Scene.tsx용
}

interface PositionConfig {
  main: [number, number, number];  // Scene.tsx용 [x, y, z]
  test: [number, number, number];  // test/Scene.tsx용 [x, y, z]
}

/**
 * 브라우저 화면 크기를 추적하고 반응형 스케일 및 위치 값을 반환하는 커스텀 훅
 * @returns {ScreenSize & { scale: ScaleConfig, position: PositionConfig }} 화면 크기, 스케일, 위치 설정
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    // 리사이즈 핸들러 - 모바일에서 실제 뷰포트 높이 사용
    const handleResize = () => {
      // visualViewport가 있으면 사용 (모바일에서 주소창/탭바 제외한 실제 높이)
      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      
      setScreenSize({
        width,
        height,
      });
    };

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    
    // visualViewport의 리사이즈 이벤트도 리스닝 (모바일 주소창 숨김/표시 감지)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // 초기 사이즈 설정
    handleResize();

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // 화면 크기에 따른 스케일 및 위치 값 계산
  const calculateResponsiveValues = (): { scale: ScaleConfig; position: PositionConfig } => {
    const { width, height } = screenSize;

    let mainScale = 1;     // Scene.tsx의 기본값
    let testScale = 10;    // test/Scene.tsx의 기본값
    let mainPosY = 0;      // Scene.tsx Y 위치
    let testPosY = -2;     // test/Scene.tsx Y 위치 (기본값)

    // 브레이크포인트에 따른 스케일 및 위치 조정
    // 모바일 (< 640px)
    if (width < 640) {
      mainScale = 0.6;   // 15/25 = 0.6
      testScale = 5;     // 50/100 * 10 = 5
      mainPosY = 0.6;    // 작아진만큼 위로 올림
      testPosY = -1.2;   // 작아진만큼 위로 올림
    } 
    // 태블릿 (640px ~ 1024px)
    else if (width < 1024) {
      mainScale = 0.8;   // 20/25 = 0.8
      testScale = 7.5;   // 75/100 * 10 = 7.5
      mainPosY = 0.3;    // 작아진만큼 위로 올림
      testPosY = -1.6;   // 작아진만큼 위로 올림
    }
    // 데스크톱 (>= 1024px)
    else {
      mainScale = 1;     // 25/25 = 1
      testScale = 10;    // 100/100 * 10 = 10
      mainPosY = 0;      // 기본 위치
      testPosY = -2;     // 기본 위치
    }

    // 실제 브라우저 높이에 따른 Y 위치 조정
    // 기준 높이(800px)보다 작으면 위로 올리고, 크면 아래로 내림
    const baseHeight = 800;
    const heightDiff = (height - baseHeight) / baseHeight;
    
    // heightDiff를 적용한 최종 Y 위치 계산
    // 높이가 작을수록 더 위로 올림 (모바일 하단바 고려)
    mainPosY += heightDiff * 0.5;  // main은 height 변화의 50%만 적용
    testPosY += heightDiff * 0.8;  // test는 height 변화의 80% 적용

    return {
      scale: {
        main: mainScale,
        test: testScale,
      },
      position: {
        main: [0, mainPosY, 0],
        test: [0, testPosY, 0],
      }
    };
  };

  const { scale, position } = calculateResponsiveValues();

  return {
    width: screenSize.width,
    height: screenSize.height,
    scale,
    position,
  };
}

