import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const ChartCard = ({ data = [], title, dataKey = "value", xKey = "name" }) => (
  <section className="card chart-card">
    <h3>{title}</h3>
    <div className="chart-holder">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill="var(--brand)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default ChartCard;
