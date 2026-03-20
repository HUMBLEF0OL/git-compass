"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface HotspotFile {
  path: string;
  changeCount: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
}

interface Props {
  hotspots: HotspotFile[];
}

const RISK_COLORS = {
  critical: "hsl(var(--destructive))",
  high: "hsl(24, 95%, 53%)", // Orange-ish
  medium: "hsl(199, 89%, 48%)", // Blue-ish
  low: "hsl(142, 71%, 45%)", // Green-ish
} as const;

export function HotspotHeatmap({ hotspots }: Props) {
  const data = hotspots.slice(0, 20).map((h) => ({
    name: h.path.split("/").pop() ?? h.path,
    fullPath: h.path,
    size: h.changeCount,
    fill: RISK_COLORS[h.riskLevel ?? "low"],
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
        >
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                    <p className="font-bold">{data.name}</p>
                    <p className="text-muted-foreground">{data.fullPath}</p>
                    <p className="mt-1">Changes: {data.size}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
