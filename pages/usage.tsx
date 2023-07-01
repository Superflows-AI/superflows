import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { timeFormat } from "d3-time-format";
import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  ComposedChart,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProfile } from "../components/contextManagers/profile";
import Headers from "../components/headers";
import { Navbar } from "../components/navbar";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

type IProps = {
  data: { [date: string]: number };
};

const formatDate = timeFormat("%Y-%m-%d");

const msToDay = 1000 * 60 * 60 * 24;

const DatesBarGraph: React.FC<IProps> = ({ data }) => {
  const chartData = useMemo(
    () =>
      Object.entries(data)
        .map(([date, value]) => ({
          date: Date.parse(date) / msToDay,
          value,
        }))
        .sort((a, b) => a.date - b.date),
    [data]
  );

  return (
    <ResponsiveContainer width="99%" aspect={2}>
      <ComposedChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 0,
        }}
        maxBarSize={50}
      >
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={["dataMin - 1", "dataMax + 1"]}
          tickFormatter={(date) => formatDate(new Date(date * msToDay))}
        />
        <YAxis>
          <Label
            value="Cost (USD)"
            angle={-90}
            position="insideLeft"
            offset={-5}
          />
        </YAxis>
        <Tooltip />
        <Bar dataKey="value" fill="#8884d8" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

function Dashboard() {
  const supabase = useSupabaseClient();
  const { profile, refreshProfile } = useProfile();
  const [cost, setCost] = useState({} as { [date: string]: number });

  useEffect(() => {
    (async () => {
      const res = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile?.org_id)
        .single();
      if (res.error) throw res.error;
      setCost(res.data.openai_usage);
    })();
  }, [profile, refreshProfile, supabase]);

  const sum = Object.values(cost).reduce(
    (previousValue: number, currentValue: number) =>
      previousValue + currentValue,
    0
  );

  return (
    <>
      <div className="min-h-screen bg-gray-800 h-ful">
        <Navbar current={"Usage"} />
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-12 bg-gray-850 rounded-md px-6 py-4">
            <h1 className="text-xl text-gray-100">Openai api usage </h1>
            <p className="text-gray-400 mt-2">
              {`The total cost to call the openai api for your organization is $${
                Math.round(sum * 100) / 100
              }`}
            </p>
            <DatesBarGraph data={cost} />
          </div>
        </div>
      </div>
    </>
  );
}
