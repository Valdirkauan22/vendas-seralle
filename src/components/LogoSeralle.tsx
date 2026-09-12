import React from "react";

interface LogoSeralleProps {
  variant?: "full" | "icon" | "horizontal" | "monochrome-white";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LogoSeralle({
  variant = "full",
  size = "md",
  className = "",
}: LogoSeralleProps) {
  // Brand color palette extracted directly from official identity
  const brandBlue = "#0082D7";
  const brandDarkGray = "#4A4A4A";

  const sizeMap = {
    xs: { icon: "w-6 h-6", text: "text-base", sub: "text-[8px] tracking-[0.25em]" },
    sm: { icon: "w-8 h-8", text: "text-xl", sub: "text-[9px] tracking-[0.3em]" },
    md: { icon: "w-10 h-10", text: "text-2xl", sub: "text-[11px] tracking-[0.35em]" },
    lg: { icon: "w-14 h-14", text: "text-3xl", sub: "text-[13px] tracking-[0.38em]" },
    xl: { icon: "w-20 h-20", text: "text-5xl", sub: "text-[16px] tracking-[0.42em]" },
  };

  const currentSize = sizeMap[size];

  // The official Serallê icon mark: Blue square with the distinctive white ribbon S wave
  const IconMark = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg
      viewBox="0 0 100 100"
      className={`${currentSize.icon} shrink-0 drop-shadow-xs select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Rounded Square */}
      <rect
        width="100"
        height="100"
        rx="8"
        fill={isWhite ? "#ffffff" : brandBlue}
      />
      {/* Characteristic S-Curve Ribbon */}
      <path
        d="M 54 0 C 44 14, 33 34, 34 50 C 35 66, 56 80, 48 100 L 40 100 C 48 81, 26 65, 25 50 C 24 35, 46 15, 46 0 Z"
        fill={isWhite ? brandBlue : "#ffffff"}
      />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}><IconMark /></div>;
  }

  if (variant === "monochrome-white") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <IconMark isWhite={true} />
        <div className="flex flex-col select-none leading-none">
          <span
            className={`font-semibold tracking-tight text-white ${currentSize.text}`}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}
          >
            Serallê
          </span>
          <span
            className={`font-medium uppercase text-blue-100 mt-1 ${currentSize.sub}`}
            style={{ letterSpacing: "0.35em" }}
          >
            calçados
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3.5 ${className}`}>
      <IconMark />
      <div className="flex flex-col select-none justify-center leading-none">
        <span
          className={`font-semibold tracking-tight ${currentSize.text}`}
          style={{
            color: brandBlue,
            fontFamily: "'Plus Jakarta Sans', 'Century Gothic', -apple-system, sans-serif",
            fontWeight: 500,
          }}
        >
          Serallê
        </span>
        <span
          className={`font-normal uppercase mt-1 ${currentSize.sub}`}
          style={{
            color: brandDarkGray,
            letterSpacing: "0.36em",
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          }}
        >
          calçados
        </span>
      </div>
    </div>
  );
}
