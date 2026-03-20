"use client";

import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface ChurnDataPoint {
  date: string | Date;
  linesAdded: number;
  linesRemoved: number;
}

interface Props {
  data: ChurnDataPoint[];
}

export function ChurnChart({ data }: Props) {
  // Format dates for display
  const chartData = data.map(d => ({
    ...d,
    dateStr: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    added: d.linesAdded,
    removed: d.linesRemoved
  }));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRemoved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
             contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
             itemStyle={{ fontSize: "11px" }}
             labelStyle={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
          />
          <Area 
            type="monotone" 
            dataKey="added" 
            name="Lines Added"
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorAdded)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="removed" 
            name="Lines Removed"
            stroke="hsl(var(--destructive))" 
            fillOpacity={1} 
            fill="url(#colorRemoved)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
