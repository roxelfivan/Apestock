import type { CSSProperties, ReactNode } from "react";

interface ChartViewportProps {
  height: number;
  className?: string;
  children: ReactNode;
}

export default function ChartViewport({ height, className = "", children }: ChartViewportProps) {
  const style: CSSProperties = { height };
  return (
    <div className={`relative w-full min-w-0 overflow-hidden ${className}`.trim()} style={style}>
      <div className="absolute inset-0 min-w-0">{children}</div>
    </div>
  );
}
