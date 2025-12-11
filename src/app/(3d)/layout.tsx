"use client";

import Scene from "@/components/3d/Scene";

export default function ThreeDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Scene />
      {children}
    </>
  );
}

