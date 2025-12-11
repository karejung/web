"use client";

import { useDetailPage } from "@/hook/useDetailPage";
import BackButton from "@/components/ui/BackButton";

interface DetailPageClientProps {
  params: Promise<{ id: string }>;
}

export default function DetailPageClient({ params }: DetailPageClientProps) {
  useDetailPage(params);

  return (
    <div className="relative z-10">
      <BackButton />
    </div>
  );
}

