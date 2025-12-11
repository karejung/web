"use client";

import { useRouter } from "next/navigation";
import { useSceneStore } from "@/hook/sceneStore";

export default function BackButton() {
  const router = useRouter();
  const exitDetail = useSceneStore((state) => state.exitDetail);

  const handleBack = () => {
    exitDetail();
    router.push("/");
  };

  return (
    <button
      onClick={handleBack}
      className="fixed top-6 right-6 z-[10001] flex items-center gap-2 px-4 py-2 
                 bg-white/10 backdrop-blur-md rounded-full
                 text-white text-sm font-medium
                 hover:bg-white/20 transition-all duration-300
                 border border-white/20"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

