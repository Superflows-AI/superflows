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
import { pageGetServerSideProps } from "../components/getServerSideProps";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const { profile } = useProfile();
  // The cloud version of the app is priced based on number of user queries.
  // The self-hosted version will cost per request to openai
  if (
    process.env.NEXT_PUBLIC_IS_IN_CLOUD &&
    process.env.NEXT_PUBLIC_IS_IN_CLOUD === "true"
  ) {
    // If premium, show usage in queries
    if (
      process.env.NODE_ENV === "development" ||
      profile?.organizations?.is_paid[0]?.is_premium
    ) {
      return <DashboardNumMessages />;
    } else {
      // Otherwise show upgrade message
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Navbar current={"Usage"} />
          <main className="flex flex-col items-center justify-start py-20 flex-1 px-20 text-center bg-gray-800 w-screen h-screen">
            <div className="bg-gray-850 rounded-md px-20 lg:px-40 py-10">
              <h1 className="text-4xl text-gray-200 font-medium">
                Upgrade to see usage
              </h1>
              <p className="mt-2 text-xl text-gray-400">
                View{" "}
                <a
                  href="https://superflows.ai/pricing"
                  className="text-blue-600 hover:underline"
                >
                  pricing page
                </a>
              </p>
            </div>
          </main>
        </div>
      );
    }
  }
  return <DashboardCost />;
}

const formatDate = timeFormat("%Y-%m-%d");

const msToDay = 1000 * 60 * 60 * 24;

function DatesBarGraph(props: {
  data: { date: string; value: number }[];
  ylabel: string;
}) {
  if (!props.data || props.data.length == 0) return null;

  const chartData = props.data
    .map((d) => ({ date: Date.parse(d.date) / msToDay, value: d.value }))
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
          <YAxis allowDecimals={false}>
            <Label
              value={props.ylabel}
              angle={-90}
              position="insideLeft"
              offset={-5}
            />
          </YAxis>
          <Tooltip
            labelFormatter={intToDate}
            formatter={(value) =>
              `${Math.round((value as number) * 100) / 100}`
            }
          />

          <Bar dataKey="value" fill="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

function DashboardNumMessages() {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [numUserMessages, setNumUserMessages] = useState([{}] as {
    date: string;
    value: number;
  }[]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const res = await supabase
        .from("usage")
        .select("*")
        .eq("org_id", profile?.org_id);
      if (res.error) throw res.error;
      setNumUserMessages(
        res.data.map((d) => ({ date: d.date, value: d.num_user_queries }))
      );
      setTotalMessages(
        res.data.reduce((acc, curr) => acc + curr.num_user_queries, 0)
      );
      setLoading(false);
    })();
  }, [profile, refreshProfile, supabase]);
  return (
    <div className="bg-gray-800 min-h-screen">
      <Navbar current={"Usage"} />
      <div className="h-[calc(100%-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-gray-800 pb-8 place-items-center">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4 overflow-visible max-w-7xl w-full">
          <div className="text-center">
            <h1 className="text-2xl text-gray-100">Superflows usage</h1>
            <p className="mt-2 text-xl font-bold text-purple-500">
              {!loading &&
                `Total user queries: ${Math.round(totalMessages * 100) / 100}`}
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            {!loading && (
              <DatesBarGraph
                data={numUserMessages}
                ylabel="Number of user queries"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCost() {
  // It's getting WET in here
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [cost, setCost] = useState([{}] as { date: string; value: number }[]);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const res = await supabase
        .from("usage")
        .select("*")
        .eq("org_id", profile?.org_id);
      if (res.error) throw res.error;
      setCost(res.data.map((d) => ({ date: d.date, value: d.usage })));
      setSum(res.data.reduce((acc, curr) => acc + curr.usage, 0));
      setLoading(false);
    })();
  }, [profile, refreshProfile, supabase]);
  return (
    <div className="bg-gray-800 min-h-screen">
      <Navbar current={"Usage"} />
      <div className="h-[calc(100%-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-gray-800 pb-8 place-items-center">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4 overflow-visible max-w-7xl w-full">
          <div className="place-items-center m-auto  text-center">
            <h1 className="text-2xl text-gray-100">OpenAI API usage </h1>
            <p className="text-gray-200 mt-2 text-xl font-bold text-purple-500">
              {`Total Cost $${Math.round(sum * 100) / 100}`}
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            {!loading && <DatesBarGraph data={cost} ylabel="Cost (USD)" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
