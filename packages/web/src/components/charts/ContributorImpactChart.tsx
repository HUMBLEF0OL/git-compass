"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ContributorImpactProps {
  data: any[]; // Expecting array of { date, [authorName]: linesAdded, ... }
}

export function ContributorImpactChart({ data }: ContributorImpactProps) {
  // Get all unique authors from the entire dataset
  const authors = Array.from(
    new Set(
      data.flatMap(d => Object.keys(d)).filter(key => key !== 'date' && key !== 'dateStr')
    )
  );

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "#f59e0b", // yellow-500
    "#10b981", // emerald-500
    "#6366f1", // indigo-500
    "#ec4899", // pink-500
  ];

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="dateStr" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Tooltip 
             contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }}
          />
          {authors.map((author, index) => (
            <Area
              key={author}
              type="monotone"
              dataKey={author}
              stackId="1"
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
