import { useMemo, useState } from "react";
import http from "../../api/http";
import useApi from "../../hooks/useApi";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import ChartCard from "../../components/ChartCard";

const AdminDashboard = () => {
  // Local form and filter state used by CRUD widgets on the same page.
  const [search, setSearch] = useState("");
  const [resellerForm, setResellerForm] = useState({ fullName: "", email: "", password: "", credits: 0 });
  const [packageForm, setPackageForm] = useState({ name: "", durationDays: 30, price: 0 });
  const [serverForm, setServerForm] = useState({ name: "", xtreamUrl: "", m3uUrl: "" });
  const [message, setMessage] = useState("");

  const dashboard = useApi(async () => (await http.get("/admin/dashboard")).data, []);
  const resellers = useApi(async () => (await http.get(`/admin/resellers?q=${encodeURIComponent(search)}`)).data, [search]);
  const packages = useApi(async () => (await http.get("/admin/packages")).data, [message]);
  const servers = useApi(async () => (await http.get("/admin/servers")).data, [message]);

  const salesChart = useMemo(() => {
    // Compact chart data transformed from recent sales payload.
    const sales = dashboard.data?.recentSales || [];
    const map = {};
    sales.forEach((sale) => {
      const day = new Date(sale.createdAt).toLocaleDateString();
      map[day] = (map[day] || 0) + (sale.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dashboard.data]);

  const createReseller = async (event) => {
    event.preventDefault();
    await http.post("/admin/resellers", { ...resellerForm, credits: Number(resellerForm.credits) });
    setResellerForm({ fullName: "", email: "", password: "", credits: 0 });
    setMessage("Reseller created");
    resellers.setData(await (await http.get("/admin/resellers")).data);
  };

  const createPackage = async (event) => {
    event.preventDefault();
    await http.post("/admin/packages", {
      ...packageForm,
      durationDays: Number(packageForm.durationDays),
      price: Number(packageForm.price),
      channelLists: []
    });
    setPackageForm({ name: "", durationDays: 30, price: 0 });
    setMessage("Package created");
  };

  const createServer = async (event) => {
    event.preventDefault();
    await http.post("/admin/servers", serverForm);
    setServerForm({ name: "", xtreamUrl: "", m3uUrl: "" });
    setMessage("Server created");
  };

  const downloadReport = async (format, reportType) => {
    const { data } = await http.get(`/admin/reports?format=${format}&reportType=${reportType}`, {
      responseType: "blob"
    });

    const blob = new Blob([data], {
      type: format === "pdf" ? "application/pdf" : "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-grid">
      <header className="hero-card card">
        <h2>Parent Company Control Center</h2>
        <p>Manage resellers, monitor subscription activity, and track multi-server IPTV operations.</p>
      </header>

      <section className="stats-grid">
        <StatCard title="Total Resellers" value={dashboard.data?.metrics?.totalResellers || 0} accent="var(--accent-1)" />
        <StatCard title="Total Clients" value={dashboard.data?.metrics?.totalClients || 0} accent="var(--accent-2)" />
        <StatCard title="Revenue" value={`$${dashboard.data?.metrics?.revenue || 0}`} accent="var(--accent-3)" />
        <StatCard
          title="Active Subscriptions"
          value={dashboard.data?.metrics?.activeSubscriptions || 0}
          accent="var(--brand)"
        />
      </section>

      <ChartCard title="Recent Sales Trend" data={salesChart} />

      <section className="split-grid">
        <article className="card">
          <h3>Create Reseller</h3>
          <form onSubmit={createReseller} className="form-grid">
            <input
              placeholder="Full name"
              value={resellerForm.fullName}
              onChange={(e) => setResellerForm((old) => ({ ...old, fullName: e.target.value }))}
              required
            />
            <input
              placeholder="Email"
              type="email"
              value={resellerForm.email}
              onChange={(e) => setResellerForm((old) => ({ ...old, email: e.target.value }))}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={resellerForm.password}
              onChange={(e) => setResellerForm((old) => ({ ...old, password: e.target.value }))}
              required
            />
            <input
              placeholder="Credits"
              type="number"
              value={resellerForm.credits}
              onChange={(e) => setResellerForm((old) => ({ ...old, credits: e.target.value }))}
            />
            <button type="submit">Create Reseller</button>
          </form>
        </article>

        <article className="card">
          <h3>Search Resellers</h3>
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <DataTable
            columns={[
              { key: "fullName", label: "Name" },
              { key: "email", label: "Email" },
              { key: "credits", label: "Credits" },
              { key: "isActive", label: "Status", render: (row) => (row.isActive ? "Active" : "Inactive") }
            ]}
            rows={resellers.data || []}
            emptyText="No resellers found"
          />
        </article>
      </section>

      <section className="split-grid">
        <article className="card">
          <h3>Create Package</h3>
          <form onSubmit={createPackage} className="form-grid">
            <input
              placeholder="Package name"
              value={packageForm.name}
              onChange={(e) => setPackageForm((old) => ({ ...old, name: e.target.value }))}
            />
            <input
              placeholder="Duration days"
              type="number"
              value={packageForm.durationDays}
              onChange={(e) => setPackageForm((old) => ({ ...old, durationDays: e.target.value }))}
            />
            <input
              placeholder="Price"
              type="number"
              value={packageForm.price}
              onChange={(e) => setPackageForm((old) => ({ ...old, price: e.target.value }))}
            />
            <button type="submit">Save Package</button>
          </form>

          <DataTable
            columns={[
              { key: "name", label: "Package" },
              { key: "durationDays", label: "Duration" },
              { key: "price", label: "Price" }
            ]}
            rows={packages.data || []}
            emptyText="No packages"
          />
        </article>

        <article className="card">
          <h3>Add Server</h3>
          <form onSubmit={createServer} className="form-grid">
            <input
              placeholder="Server name"
              value={serverForm.name}
              onChange={(e) => setServerForm((old) => ({ ...old, name: e.target.value }))}
            />
            <input
              placeholder="Xtream URL"
              value={serverForm.xtreamUrl}
              onChange={(e) => setServerForm((old) => ({ ...old, xtreamUrl: e.target.value }))}
            />
            <input
              placeholder="M3U URL"
              value={serverForm.m3uUrl}
              onChange={(e) => setServerForm((old) => ({ ...old, m3uUrl: e.target.value }))}
            />
            <button type="submit">Save Server</button>
          </form>

          <DataTable
            columns={[
              { key: "name", label: "Server" },
              { key: "status", label: "Status" },
              { key: "xtreamUrl", label: "Xtream" }
            ]}
            rows={servers.data || []}
            emptyText="No servers"
          />
        </article>
      </section>

      <section className="card split-actions">
        <h3>Reports</h3>
        <div>
          <button type="button" onClick={() => downloadReport("csv", "sales")}>Sales CSV</button>
          <button type="button" onClick={() => downloadReport("pdf", "sales")}>Sales PDF</button>
          <button type="button" onClick={() => downloadReport("csv", "clients")}>Clients CSV</button>
          <button type="button" onClick={() => downloadReport("pdf", "clients")}>Clients PDF</button>
        </div>
        {message ? <p className="success-text">{message}</p> : null}
      </section>
    </div>
  );
};

export default AdminDashboard;
