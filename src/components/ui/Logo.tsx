'use client';

import Image from "next/image";
import { BASE_PATH } from "@/hook/basePath";

export default function Logo() {
  return (
    <div className='fixed top-3 left-3 mix-blend-difference text-slate-50 text-sm font-geist-sans z-[10000]'>
      <Image
        src={`${BASE_PATH}/image/logowhite.png`}
        alt="Logo"
        width={54}
        height={54}
        priority
        className="w-auto h-[48px] cursor-pointer"
        onClick={() => window.location.reload()}
      />
    </div>
  );
}
