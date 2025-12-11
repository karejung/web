"use client"

import { useCallback, useRef, useEffect } from 'react'
import { useSceneStore } from '@/hook/sceneStore'

interface UseSceneNavigationOptions {
  scrollThreshold?: number
  cooldownTime?: number
}

/**
 * 휠/터치 스크롤로 씬 네비게이션을 처리하는 훅
 */
export function useSceneNavigation({
  scrollThreshold = 50,
  cooldownTime = 800
}: UseSceneNavigationOptions = {}) {
  const currentIndex = useSceneStore((state) => state.currentIndex)
  const totalScenes = useSceneStore((state) => state.totalScenes)
  const setCurrentScene = useSceneStore((state) => state.setCurrentScene)
  const setBlurred = useSceneStore((state) => state.setBlurred)

  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollTime = useRef(0)
  const accumulatedDelta = useRef(0)
  const isScrolling = useRef(false)
  
  // 터치 관련
  const touchStartY = useRef(0)
  
  // 트랙패드 감지를 위한 refs
  const lastWheelTime = useRef(0)
  const wheelEvents = useRef<number[]>([])

  // 트랙패드 vs 마우스 휠 구분
  const isTrackpad = useCallback((e: WheelEvent): boolean => {
    const isSmallDelta = Math.abs(e.deltaY) < 10
    const isPixelMode = e.deltaMode === 0
    const now = e.timeStamp
    
    if (lastWheelTime.current) {
      const timeDiff = now - lastWheelTime.current
      if (timeDiff < 100) {
        wheelEvents.current.push(timeDiff)
        if (wheelEvents.current.length > 4) {
          wheelEvents.current.shift()
        }
        
        if (wheelEvents.current.length >= 3) {
          const avg = wheelEvents.current.reduce((a, b) => a + b, 0) / wheelEvents.current.length
          const isConsistent = wheelEvents.current.every(t => Math.abs(t - avg) < 20)
          lastWheelTime.current = now
          return isPixelMode && isConsistent
        }
      } else {
        wheelEvents.current = []
      }
    }
    
    lastWheelTime.current = now
    return isPixelMode && isSmallDelta
  }, [])

  // 휠 스크롤 처리
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    const now = Date.now()
    if (isScrolling.current) return
    
    const usingTrackpad = isTrackpad(e)
    const timeThreshold = usingTrackpad ? 1000 : cooldownTime
    
    if (now - lastScrollTime.current < timeThreshold) return
    
    accumulatedDelta.current += Math.abs(e.deltaY)
    const deltaLimit = usingTrackpad ? 100 : scrollThreshold
    
    if (accumulatedDelta.current < deltaLimit) return
    
    const direction = e.deltaY > 0 ? 1 : -1
    const newIndex = currentIndex + direction
    
    if (newIndex >= 0 && newIndex < totalScenes) {
      isScrolling.current = true
      setBlurred(true)
      setCurrentScene(newIndex)
      lastScrollTime.current = now
      accumulatedDelta.current = 0
      
      // 스크롤 완료 후 블러 해제
      setTimeout(() => {
        isScrolling.current = false
        setBlurred(false)
      }, usingTrackpad ? 600 : 400)
    } else {
      accumulatedDelta.current = 0
    }
  }, [currentIndex, totalScenes, setCurrentScene, setBlurred, isTrackpad, cooldownTime, scrollThreshold])

  // 터치 시작
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setBlurred(true)
  }, [setBlurred])

  // 터치 이동
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const now = Date.now()
    if (now - lastScrollTime.current < cooldownTime) return
    
    const deltaY = touchStartY.current - e.touches[0].clientY
    const threshold = 30
    
    if (Math.abs(deltaY) > threshold) {
      const direction = deltaY > 0 ? 1 : -1
      const newIndex = currentIndex + direction
      
      if (newIndex >= 0 && newIndex < totalScenes) {
        e.preventDefault()
        setCurrentScene(newIndex)
        lastScrollTime.current = now
        touchStartY.current = e.touches[0].clientY
      }
    }
  }, [currentIndex, totalScenes, setCurrentScene, cooldownTime])

  // 터치 종료
  const handleTouchEnd = useCallback(() => {
    touchStartY.current = 0
    setTimeout(() => setBlurred(false), 200)
  }, [setBlurred])

  // 휠 이벤트 리스너 등록
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  return {
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}

