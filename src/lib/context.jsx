import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, configured, preview, result } from "./backend";
const Context = createContext(null);
export const useMarket = () => useContext(Context);
export function MarketProvider({ children }) {
  const [path, setPath] = useState(location.pathname + location.search),
    [session, setSession] = useState(null),
    [authReady, setAuthReady] = useState(!configured),
    [seller, setSeller] = useState(null),
    [admin, setAdmin] = useState(false),
    [categories, setCategories] = useState([]),
    [plans, setPlans] = useState([]),
    [settings, setSettings] = useState({
      name: "Leikai Market",
      hero_title: "Your neighbourhood. Every shop.",
      hero_description:
        "Discover products and independent shops across Manipur.",
      hero_image: "/images/hero-handloom.webp",
    }),
    [fixtures, setFixtures] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [dataReady, setDataReady] = useState(false);
  const navigate = useCallback((p) => {
    history.pushState({}, "", p);
    setPath(p);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const f = () => setPath(location.pathname + location.search);
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const loadUser = useCallback(async (user) => {
    setSeller(null);
    setAdmin(false);
    if (!user) return;
    try {
      const [s, a] = await Promise.all([
        result(
          supabase
            .from("sellers")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ),
        result(supabase.rpc("is_admin")),
      ]);
      setSeller(s);
      setAdmin(a);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data?.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") navigate("/reset-password");
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    loadUser(session?.user);
  }, [session?.user?.id, loadUser]);
  const refresh = useCallback(async () => {
    try {
      if (configured) {
        const [cats, ps, st] = await Promise.all([
          result(supabase.from("categories").select("*").order("position")),
          result(supabase.from("plans").select("*").order("price")),
          result(
            supabase
              .from("settings")
              .select("value")
              .eq("id", "marketplace")
              .single(),
          ),
        ]);
        setCategories(cats);
        setPlans(ps);
        setSettings(st.value);
      } else if (import.meta.env.DEV && preview) {
        const d = await import("./preview-data.js");
        setFixtures(d);
        setCategories(d.categories);
        setPlans(d.plans);
        setSettings(d.settings);
      }
      setDataReady(true);
    } catch (e) {
      setError(e.message);
      setDataReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        path,
        navigate,
        session,
        authReady,
        seller,
        admin,
        categories,
        plans,
        settings,
        fixtures,
        notice: setNotice,
        refresh,
        refreshUser: () => loadUser(session?.user),
        dataReady,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
    </Context.Provider>
  );
}
export function Link({ to, children, onClick, ...props }) {
  const { navigate } = useMarket();
  return (
    <a
      href={to}
      {...props}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          navigate(to);
          onClick?.(e);
        }
      }}
    >
      {children}
    </a>
  );
}
