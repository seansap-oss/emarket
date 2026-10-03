import React, { useState, useEffect } from "react";
import {
  Storefront,
  ArrowRight,
  Check,
  ShieldCheck,
  WhatsappLogo,
  ArrowLeft,
  SignOut,
} from "@phosphor-icons/react";
import { useMarket, Link } from "../lib/context";
import {
  configured,
  requireBackend,
  supabase,
  checkout,
  result,
  preview,
} from "../lib/backend";
import { Field, Upload, Empty } from "../components/UI";
import { money, slugify, socialUrl, whatsappUrl } from "../lib/utils";
export function AuthPage({ reset = false }) {
  const { session, navigate, notice } = useMarket();
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  useEffect(() => {
    if (session && !reset) navigate("/dashboard");
  }, [session, reset]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    try {
      const s = requireBackend();
      if (reset) {
        if (!session)
          throw Error("Open the password reset link sent to your email first.");
        await result(s.auth.updateUser({ password }));
        notice("Password updated");
        navigate("/dashboard");
      } else if (mode === "login") {
        await result(s.auth.signInWithPassword({ email, password }));
        navigate("/dashboard");
      } else if (mode === "signup") {
        const d = await result(
          s.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin + "/dashboard" },
          }),
        );
        if (d.session) navigate("/dashboard");
        else
          setDone(
            "Check your email to confirm your account, then return to sign in.",
          );
      } else {
        await result(
          s.auth.resetPasswordForEmail(email, {
            redirectTo: location.origin + "/reset-password",
          }),
        );
        setDone(
          "If this email has an account, a password reset link will arrive shortly.",
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page auth-layout">
      <div className="auth-story">
        <Storefront size={54} weight="light" />
        <span className="eyebrow">A PLACE FOR YOUR NEXT CHAPTER</span>
        <h1>
          Your people.
          <br />
          Your products.
          <br />
          Your own little corner.
        </h1>
        <p>Join a marketplace that feels like your neighbourhood.</p>
        <ul>
          <li>
            <Check /> Your first 3 listings, free
          </li>
          <li>
            <Check /> Your own shop link and identity
          </li>
          <li>
            <Check /> Enquiries straight to WhatsApp
          </li>
        </ul>
      </div>
      <div className="auth-form">
        <h2>
          {reset
            ? "Choose a new password"
            : mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Make yourself at home"
                : "Reset your password"}
        </h2>
        <p>
          {mode === "signup"
            ? "One account to discover, save and sell."
            : "Good things are waiting around the corner."}
        </p>
        {!configured && (
          <div className="notice-box">
            Account services are awaiting connection. You can explore the
            marketplace design, but sign-up is not live yet.
          </div>
        )}
        <form onSubmit={submit}>
          {!reset && (
            <Field
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}{" "}
          {(reset || mode !== "forgot") && (
            <Field
              label="Password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button
            className="button primary full"
            disabled={busy || !configured}
          >
            {busy
              ? "Please wait…"
              : reset
                ? "Update password"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create free account"
                    : "Send reset link"}
            <ArrowRight size={18} />
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {done && (
            <p className="notice-box" role="status">
              {done}
            </p>
          )}
        </form>
        {!reset && (
          <>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setDone("");
              }}
            >
              {mode === "login"
                ? "New here? Create an account"
                : "Already a member? Sign in"}
            </button>
            {mode === "login" && (
              <button
                className="text-button muted"
                onClick={() => setMode("forgot")}
              >
                Forgot your password?
              </button>
            )}
          </>
        )}
        <small>
          By creating an account, you agree to our{" "}
          <Link to="/terms">terms</Link> and{" "}
          <Link to="/privacy">privacy notice</Link>.
        </small>
      </div>
    </div>
  );
}
export function Guard({ children, adminOnly = false }) {
  const { session, authReady, admin } = useMarket();
  if (!authReady) return <div className="page">Checking your session…</div>;
  if (!session) return <AuthPage />;
  if (adminOnly && !admin)
    return (
      <div className="page">
        <Empty title="Administrator access required">
          This account does not have permission to manage the marketplace.
        </Empty>
      </div>
    );
  return children;
}
export function SellerForm({ existing, onSaved }) {
  const { session, refreshUser, notice } = useMarket();
  const [form, setForm] = useState(
      existing || {
        name: "",
        slug: "",
        type: "individual",
        theme: "general",
        description: "",
        location: "Imphal",
        whatsapp: "",
        logo: "",
        cover: "",
        socials: {},
      },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      className="editor-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          if (!/^[1-9]\d{7,14}$/.test(form.whatsapp))
            throw Error(
              "Enter WhatsApp number with country code, for example 91 followed by 10 digits.",
            );
          for (const u of Object.values(form.socials))
            if (u && !socialUrl(u))
              throw Error("Use a valid Instagram, Facebook or YouTube URL");
          const payload = {
            ...form,
            user_id: existing?.user_id || session.user.id,
          };
          delete payload.created_at;
          delete payload.suspended;
          await result(
            existing
              ? supabase.from("sellers").update(payload).eq("id", existing.id)
              : supabase.from("sellers").insert(payload),
          );
          await refreshUser();
          notice("Your seller profile is saved");
          onSaved?.();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{existing ? "Your shop identity" : "Let’s make it yours"}</h2>
      <p>Your own name, your own look. One local marketplace.</p>
      <div className="form-grid">
        <Field label="Sell as">
          <select
            value={form.type}
            onChange={(e) => change("type", e.target.value)}
          >
            <option value="individual">An individual</option>
            <option value="shop">A shop / business</option>
          </select>
        </Field>
        <Field label="Shop presentation">
          <select
            value={form.theme}
            onChange={(e) => change("theme", e.target.value)}
          >
            <option value="general">Neighbourhood · General</option>
            <option value="fashion">Atelier · Clothing & fashion</option>
            <option value="electronics">Circuit · Electronics</option>
            <option value="vehicles">Showroom · Vehicles</option>
          </select>
        </Field>
      </div>
      <Field
        label="Public name"
        required
        minLength={2}
        maxLength={80}
        value={form.name}
        onChange={(e) => {
          change("name", e.target.value);
          if (!existing) change("slug", slugify(e.target.value));
        }}
      />
      <Field
        label="Unique shop address"
        required
        pattern="[a-z0-9][a-z0-9-]{2,59}"
        value={form.slug}
        onChange={(e) => change("slug", slugify(e.target.value))}
      />
      <small>/seller/{form.slug || "your-name"}</small>
      <Field label="About your shop">
        <textarea
          rows={4}
          maxLength={2000}
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field
          label="Location"
          required
          value={form.location}
          onChange={(e) => change("location", e.target.value)}
        />
        <Field
          label="Public WhatsApp number (with country code)"
          type="tel"
          required
          placeholder="91…"
          value={form.whatsapp}
          onChange={(e) =>
            change("whatsapp", e.target.value.replace(/[\s()+-]/g, ""))
          }
        />
      </div>
      <div className="notice-box">
        <WhatsappLogo size={21} /> Buyers can contact this number. Their
        messages open in WhatsApp and are not stored here.
      </div>
      <h3>Your logo / profile photo</h3>
      <Upload value={form.logo} onChange={(v) => change("logo", v)} />
      <h3>Your cover photo</h3>
      <Upload value={form.cover} onChange={(v) => change("cover", v)} />
      <h3>Stay connected</h3>
      {["instagram", "facebook", "youtube"].map((k) => (
        <Field
          key={k}
          label={k + " profile URL"}
          type="url"
          value={form.socials[k] || ""}
          onChange={(e) =>
            change("socials", { ...form.socials, [k]: e.target.value })
          }
        />
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Save shop identity"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
export function Plans() {
  const { plans, seller, navigate, notice, settings } = useMarket();
  const [busy, setBusy] = useState("");
  return (
    <div className="page">
      <div className="pricing-intro">
        <span className="eyebrow">ROOM FOR YOUR NEXT CHAPTER</span>
        <h1>Start small. Grow your own way.</h1>
        <p>
          Every plan includes your own shop page, social links and WhatsApp
          enquiries.
          <br />
          Choose the space your products need.
        </p>
        <span className="pricing-pill">
          Simple 30-day packages · No sales commission
        </span>
      </div>
      <div className="plan-grid">
        {plans.map((p) => (
          <article
            className={"plan-card " + (p.id === "starter" ? "featured" : "")}
            key={p.id}
          >
            {p.id === "starter" && (
              <span className="plan-badge">A GREAT PLACE TO START</span>
            )}
            <span className="eyebrow">{p.name}</span>
            <h2>
              {money(p.price)}
              <small> / 30 days</small>
            </h2>
            <h3>{p.listing_limit.toLocaleString("en-IN")} active products</h3>
            <ul>
              <li>
                <Check /> Your own storefront
              </li>
              <li>
                <Check /> Logo, photos & shop collections
              </li>
              <li>
                <Check /> Social links & WhatsApp enquiries
              </li>
              <li>
                <Check /> Up to 8 photos per product
              </li>
              {p.price > 0 && (
                <li>
                  <Check /> CSV catalogue import
                </li>
              )}
            </ul>
            <button
              className={
                "button full " + (p.id === "starter" ? "primary" : "outline")
              }
              disabled={!!busy}
              onClick={async () => {
                if (!seller) return navigate("/sell");
                if (p.price === 0) return navigate("/dashboard");
                setBusy(p.id);
                try {
                  await checkout(p.id);
                  notice("Payment confirmed. Your package is active.");
                  navigate("/dashboard?tab=package");
                } catch (e) {
                  notice(e.message);
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === p.id
                ? "Opening payment…"
                : p.price
                  ? "Choose " + p.name
                  : "Start for free"}
              <ArrowRight size={18} />
            </button>
          </article>
        ))}
      </div>
      <div className="pricing-notes">
        <h2>A bigger spotlight for your shop</h2>
        <p>
          Sponsored homepage placement is purchased separately from your listing
          package. {settings.ads_price_note}
        </p>
        <Link className="button outline" to="/dashboard?tab=promotions">
          Explore featured advertising <ArrowRight />
        </Link>
        <p>
          <small>
            Packages renew manually. Payments are enabled after the payment
            account is connected. If a package expires, your catalogue is
            retained; your newest free allowance remains public. Pause unwanted
            listings to choose what stays visible.
          </small>
        </p>
      </div>
    </div>
  );
}
