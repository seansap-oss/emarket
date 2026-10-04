import Categories from "./pages/Categories";
import Templates from "./pages/Templates";
import React, { Suspense, lazy, useEffect } from "react";
import { MarketProvider, useMarket } from "./lib/context";
import { Layout } from "./components/Layout";
import {
  Home,
  Search,
  Shops,
  SellerPage,
  ProductPage,
} from "./pages/Marketplace";
import { AuthPage, Guard, Plans } from "./pages/Account";
import { Information } from "./pages/Information";
import { Empty } from "./components/UI";
import { preview } from "./lib/backend";
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Admin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.Admin })),
);
function Router() {
  const { path } = useMarket();
  const p = path.split("?")[0];
  useEffect(() => {
    document.title =
      (p === "/"
        ? "Your neighbourhood. Every shop."
        : p.startsWith("/admin")
          ? "Marketplace administration"
          : p.startsWith("/dashboard")
            ? "Your seller workspace"
            : "Explore your local marketplace") + " | Onlinekeithel";
  }, [p]);
  useEffect(() => {
    if (p.startsWith("/seller/")) {
      history.replaceState({}, "", "/shop/" + p.slice(8));
      dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [p]);
  let page;
  if (p === "/") page = <Home />;
  else if (p === "/search" || p === "/saved")
    page = <Search key={p} saved={p === "/saved"} />;
  else if (p === "/shops") page = <Shops />;
  else if (p.startsWith("/shop/") || p.startsWith("/seller/"))
    page = <SellerPage key={p} slug={decodeURIComponent(p.split("/")[2])} />;
  else if (p.startsWith("/listing/"))
    page = <ProductPage key={p} id={decodeURIComponent(p.split("/")[2])} />;
  else if (p === "/login" || p === "/reset-password")
    page = <AuthPage reset={p === "/reset-password"} />;
  else if (p === "/dashboard" || p === "/sell")
    page = (
      <Guard>
        <Dashboard startSell={p === "/sell"} />
      </Guard>
    );
  else if (p === "/plans") page = <Plans />;
  else if (p === "/admin")
    page = (
      <Guard adminOnly>
        <Admin />
      </Guard>
    );
  else if (p === "/categories") page = <Categories />;
  else if (p === "/templates") page = <Templates />;
  else if (preview && p === "/preview/seller") page = <Dashboard visual />;
  else if (preview && p === "/preview/admin") page = <Admin visual />;
  else if (["/help", "/privacy", "/terms"].includes(p))
    page = <Information kind={p.slice(1)} />;
  else
    page = (
      <div className="page">
        <Empty title="This page has wandered off">
          Use the menu to return to the marketplace.
        </Empty>
      </div>
    );
  return (
    <Layout>
      <Suspense fallback={<div className="page">Loading…</div>}>
        {page}
      </Suspense>
    </Layout>
  );
}
export function App() {
  return (
    <MarketProvider>
      <Router />
    </MarketProvider>
  );
}
