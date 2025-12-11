import { create } from 'zustand'
import { scenesData } from '@/data/scenes'

interface SceneState {
  // 상태
  currentIndex: number
  isBlurred: boolean
  totalScenes: number
  isDetailView: boolean
  selectedModelId: string | null
  isTransitioning: boolean
  
  // 액션
  setCurrentScene: (index: number) => void
  setBlurred: (blurred: boolean) => void
  goNext: () => void
  goPrev: () => void
  enterDetail: (modelId: string) => void
  exitDetail: () => void
  setTransitioning: (transitioning: boolean) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  // 초기 상태
  currentIndex: 0,
  isBlurred: false,
  totalScenes: scenesData.length,
  isDetailView: false,
  selectedModelId: null,
  isTransitioning: false,

  // 액션
  setCurrentScene: (index: number) => {
    const { totalScenes } = get()
    if (index >= 0 && index < totalScenes) {
      set({ currentIndex: index })
    }
  },

  setBlurred: (blurred: boolean) => set({ isBlurred: blurred }),

  goNext: () => {
    const { currentIndex, totalScenes } = get()
    if (currentIndex < totalScenes - 1) {
      set({ currentIndex: currentIndex + 1 })
    }
  },

  goPrev: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 })
    }
  },

  enterDetail: (modelId: string) => {
    set({ 
      isDetailView: true, 
      selectedModelId: modelId,
      isTransitioning: true 
    })
  },

  exitDetail: () => {
    set({ 
      isDetailView: false, 
      selectedModelId: null,
      isTransitioning: true 
    })
  },

  setTransitioning: (transitioning: boolean) => {
    set({ isTransitioning: transitioning })
  }
}))

// Selector 함수들
export const useCurrentIndex = () => useSceneStore((state) => state.currentIndex)
export const useIsBlurred = () => useSceneStore((state) => state.isBlurred)
export const useIsDetailView = () => useSceneStore((state) => state.isDetailView)
export const useSelectedModelId = () => useSceneStore((state) => state.selectedModelId)
export const useIsTransitioning = () => useSceneStore((state) => state.isTransitioning)

