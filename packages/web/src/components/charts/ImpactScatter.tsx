"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface HotspotPoint {
  path: string;
  changeCount: number;
  riskScore: number;
  authors: number;
  linesImpacted: number;
}

interface ImpactScatterProps {
  data: HotspotPoint[];
}

export function ImpactScatter({ data }: ImpactScatterProps) {
  const chartData = data.map(d => ({
    name: d.path.split(/[\\/]/).pop(),
    fullPath: d.path,
    x: d.changeCount,
    y: d.riskScore,
    z: d.authors,
    impact: d.linesImpacted
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Changes" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: 'Frequency (Changes)', position: 'insideBottom', offset: -10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Risk Score" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: 'Risk Score (Complexity)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name="Authors" />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-card p-3 rounded-lg shadow-neumo-flat border-0 text-[10px]">
                    <p className="font-black text-primary mb-1">{item.name}</p>
                    <p className="text-muted-foreground">{item.fullPath}</p>
                    <div className="mt-2 space-y-1">
                        <p>Changes: <span className="font-bold text-foreground">{item.x}</span></p>
                        <p>Churn Volume: <span className="font-bold text-foreground">+{item.impact} lines</span></p>
                        <p>Risk Score: <span className="font-bold text-foreground">{item.y}</span></p>
                        <p>Unique Authors: <span className="font-bold text-foreground">{item.z}</span></p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name="Hotspots" 
            data={chartData} 
            fill="hsl(var(--primary))"
            fillOpacity={0.6}
            stroke="hsl(var(--primary))"
            strokeWidth={1}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
