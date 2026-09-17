"use client";

import { FormEvent, useState } from "react";

function CellMark() {
  return (
    <div className="cell-mark" aria-hidden="true">
      <span className="cell-mark__ring cell-mark__ring--outer" />
      <span className="cell-mark__ring cell-mark__ring--inner" />
      <span className="cell-mark__crystal" />
      <span className="cell-mark__flare" />
    </div>
  );
}

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Account authentication is ready to be connected.");
  }

  return (
    <main className="login-shell">
      <div className="world" aria-hidden="true">
        <div className="world__moon" />
        <div className="world__mountain world__mountain--one" />
        <div className="world__mountain world__mountain--two" />
        <div className="world__mountain world__mountain--three" />
        <div className="world__ruin world__ruin--left" />
        <div className="world__ruin world__ruin--right" />
        <div className="world__bridge" />
        <div className="world__crystal world__crystal--one" />
        <div className="world__crystal world__crystal--two" />
        <div className="world__crystal world__crystal--three" />
        <div className="world__mist world__mist--one" />
        <div className="world__mist world__mist--two" />
      </div>

      <header className="topbar">
        <div className="brand-mini">
          <CellMark />
          <span>CELLBOUND</span>
        </div>
        <div className="world-status"><span /> Worlds online</div>
      </header>

      <section className="hero-copy">
        <div className="hero-copy__eyebrow"><span /> THE WORLD REMEMBERS</div>
        <h1>Power is not learned.<br /><strong>It is unlocked.</strong></h1>
        <p>
          Hunt ancient bosses. Claim rare Cells. Unlock the skills that define your journey.
        </p>
        <div className="hero-copy__rule" />
        <p className="hero-copy__small">Every Cell changes what your character can become.</p>
      </section>

      <section className="login-card" aria-label="Cellbound account login">
        <div className="login-card__glow" aria-hidden="true" />
        <div className="login-card__crest"><CellMark /></div>
        <p className="login-card__kicker">RETURN TO THE BOUND WORLD</p>
        <h2>Enter Cellbound</h2>
        <p className="login-card__intro">Sign in to continue your journey.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <div className="field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.75 12 13l9-6.25M4.5 19h15A1.5 1.5 0 0 0 21 17.5v-11A1.5 1.5 0 0 0 19.5 5h-15A1.5 1.5 0 0 0 3 6.5v11A1.5 1.5 0 0 0 4.5 19Z" /></svg>
            <input id="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </div>

          <div className="label-row">
            <label htmlFor="password">Password</label>
            <button className="text-button" type="button">Forgot password?</button>
          </div>
          <div className="field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12a1 1 0 0 1 1 1v8H5v-8a1 1 0 0 1 1-1Zm6 3v3" /></svg>
            <input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" required />
            <button className="eye-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show or hide password">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label className="remember">
            <input type="checkbox" />
            <span>Keep me signed in on this device</span>
          </label>

          <button className="enter-button" type="submit">
            <span>ENTER THE WORLD</span>
            <b>→</b>
          </button>
        </form>

        {message && <p className="login-card__message">{message}</p>}

        <div className="divider"><span>NEW TO CELLBOUND?</span></div>
        <button className="create-button" type="button">CREATE AN ACCOUNT</button>

        <p className="legal">By continuing, you agree to the Terms of Service and Privacy Policy.</p>
      </section>

      <footer>
        <span>© 2026 CELLBOUND</span>
        <span className="footer-rune">◇</span>
        <span>PRE-ALPHA</span>
      </footer>
    </main>
  );
}
