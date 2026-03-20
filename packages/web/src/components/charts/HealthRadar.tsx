"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

interface HealthRadarProps {
  data: {
    stability: number;
    velocity: number;
    simplicity: number;
    coverage: number;
    decoupling: number;
  };
}

export function HealthRadar({ data }: HealthRadarProps) {
  const chartData = [
    { subject: "Stability", A: data.stability, fullMark: 100 },
    { subject: "Velocity", A: data.velocity, fullMark: 100 },
    { subject: "Simplicity", A: data.simplicity, fullMark: 100 },
    { subject: "Coverage", A: data.coverage, fullMark: 100 },
    { subject: "Decoupling", A: data.decoupling, fullMark: 100 },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: "bold" }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={false}
            axisLine={false}
          />
          <Tooltip 
             contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Radar
            name="Health"
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
