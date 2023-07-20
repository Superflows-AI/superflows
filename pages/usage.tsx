import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { timeFormat } from "d3-time-format";
import { useEffect, useState } from "react";
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
import { Database } from "../lib/database.types";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

const formatDate = timeFormat("%Y-%m-%d");

const msToDay = 1000 * 60 * 60 * 24;

function DatesBarGraph(props: { data: { date: string; usage: number }[] }) {
  if (!props.data || props.data.length == 0) return null;

  const chartData = props.data
    .map((d) => ({ date: Date.parse(d.date) / msToDay, value: d.usage }))
    .sort((a, b) => a.date - b.date);

  const xRange = chartData[chartData.length - 1].date - chartData[0].date;
  const offset = Math.ceil(xRange * 0.1);

  const intToDate = (date: number) => formatDate(new Date(date * msToDay));

  return (
    <>
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
            domain={[`dataMin - ${offset}`, `dataMax + ${offset}`]}
            tickFormatter={intToDate}
          />
          <YAxis>
            <Label
              value="Cost (USD)"
              angle={-90}
              position="insideLeft"
              offset={-5}
            />
          </YAxis>
          <Tooltip
            labelFormatter={intToDate}
            formatter={(value) =>
              `$${Math.round((value as number) * 100) / 100}`
            }
          />

          <Bar dataKey="value" fill="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

function Dashboard() {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [cost, setCost] = useState([{}] as { date: string; usage: number }[]);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await supabase
        .from("usage")
        .select("*")
        .eq("org_id", profile?.org_id);
      if (res.error) throw res.error;
      setCost(res.data.map((d) => ({ date: d.date, usage: d.usage })));
      setSum(res.data.reduce((acc, curr) => acc + curr.usage, 0));
      setLoading(false);
    })();
  }, [profile, refreshProfile, supabase]);
  return (
    <div className="bg-gray-800 min-h-screen">
      <Navbar current={"Usage"} />
      <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-gray-800  place-items-center">
        <div className="mt-12 bg-gray-850 rounded-md px-6 py-4 overflow-visible max-w-7xl w-full">
          <h1 className="text-xl text-gray-100">OpenAI API usage </h1>
          <p className="text-gray-400 mt-2">
            {`The total cost from the OpenAI API for your organization is $${
              Math.round(sum * 100) / 100
            }`}
          </p>
          {!loading && <DatesBarGraph data={cost} />}
        </div>
      </div>
    </div>
  );
}
