import React from "react";

interface EarningsGridProps {
  activeAdsCount: number; // 0 to 15
}

export const EarningsGrid: React.FC<EarningsGridProps> = ({
  activeAdsCount,
}) => {
  const slots = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-black rounded-lg">
      {slots.map((slot) => {
        const isFilled = slot < activeAdsCount;
        return (
          <div
            key={slot}
            className={`w-10 h-10 rounded-md transition-colors duration-300 ${
              isFilled
                ? "bg-[#eab308] shadow-[0_0_10px_#eab308]"
                : "bg-[#27272a]"
            }`}
            title={isFilled ? "Active Ad - RD$500" : "Empty Slot"}
          />
        );
      })}
    </div>
  );
};
