import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
  progress: number; // 실제 로딩 진행률 (0~100)
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading, progress }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // 클라이언트 측에서만 마운트 여부 설정
  useEffect(() => {
    setIsMounted(true);
    startTimeRef.current = Date.now();
  }, []);

  // 실제 로딩 진행률을 부드럽게 따라가는 로직
  useEffect(() => {
    if (!isLoading || !startTimeRef.current) return;

    const MIN_DURATION = 500; // 최소 0.5초
    const elapsed = Date.now() - startTimeRef.current;
    const minTimeElapsed = elapsed >= MIN_DURATION;

    // 실제 로딩 완료 시
    if (progress >= 100) {
      if (minTimeElapsed) {
        // 최소 시간 경과 → 빠르게 100까지
        const fastFillInterval = setInterval(() => {
          setDisplayProgress(prev => {
            if (prev >= 100) {
              clearInterval(fastFillInterval);
              return 100;
            }
            // 0.3초 안에 100까지 도달하도록 조정
            return Math.min(prev + 5, 100);
          });
        }, 15);
        return () => clearInterval(fastFillInterval);
      } else {
        // 최소 시간 미경과 → 남은 시간 동안 천천히
        const remainingTime = MIN_DURATION - elapsed;
        const remainingProgress = 100 - displayProgress;
        const increment = remainingProgress / (remainingTime / 50);
        
        const slowFillInterval = setInterval(() => {
          setDisplayProgress(prev => {
            if (prev >= 100) {
              clearInterval(slowFillInterval);
              return 100;
            }
            return Math.min(prev + increment, 100);
          });
        }, 50);
        return () => clearInterval(slowFillInterval);
      }
    }

    // 일반 로딩 중 → 실제 progress를 부드럽게 따라감
    if (displayProgress < progress) {
      const followInterval = setInterval(() => {
        setDisplayProgress(prev => {
          if (prev >= progress) {
            clearInterval(followInterval);
            return prev;
          }
          // 부드럽게 증가
          const diff = progress - prev;
          const increment = Math.max(0.5, diff / 10);
          return Math.min(prev + increment, progress);
        });
      }, 30);
      return () => clearInterval(followInterval);
    }
  }, [isLoading, progress, displayProgress]);

  // 클라이언트 측에서만 렌더링
  if (!isMounted) return null;

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          className="fixed top-0 left-0 w-screen h-[100dvh] z-[9999] overflow-hidden"
          initial={{ 
            backgroundColor: 'rgba(0, 0, 0, 1)',
            opacity: 1,
            backdropFilter: 'blur(8px)' 
          }}
          exit={{ 
            backgroundColor: 'rgba(0, 0, 0, 0)',
            opacity: 0,
            backdropFilter: 'blur(0px)',
            transition: {
              backgroundColor: {
                duration: 0.8,
                ease: "easeInOut",
              },
              opacity: {
                duration: 0.5,
                delay: 0.8,
                ease: "easeInOut"
              },
              backdropFilter: {
                duration: 0.8,
                ease: "easeInOut"
              }
            }
          }}
          style={{
            userSelect: 'none',
            // GPU 가속을 위한 속성 추가
            willChange: 'opacity, backdrop-filter',
            transform: 'translateZ(0)'
          }}
        >
          <motion.div 
            className="fixed bottom-3 right-4 mix-blend-difference"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.8
            }}
            style={{ 
              willChange: 'opacity',
              transform: 'translateZ(0)'
            }}
          >
            <motion.div
              className="text-slate-50 font-geist-sans text-[12rem] leading-[0.8] font-light tracking-tighter text-right"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.5,
                // 부드러운 애니메이션을 위한 설정 추가
                type: 'spring',
                damping: 20,
                stiffness: 100
              }}
              style={{
                userSelect: 'none',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
            >
              {Math.floor(displayProgress)}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen; 