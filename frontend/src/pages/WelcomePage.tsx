import { Link } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";

export function WelcomePage() {
  return (
    <PublicLayout>
      <section className="hero">
        <p className="hero-eyebrow">Football Confidence Pools</p>
        <h1>
          LOCK<span className="brand-accent">LINE</span>
        </h1>
        <p>
          Pick every game against the spread, rank your confidence 1 to N, and find out who really
          knows ball. Weekly standings, season-long bragging rights, zero spreadsheets.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="filled">
            Create your league
          </Link>
          <Link to="/login" className="outline">
            Log in
          </Link>
        </div>
      </section>

      <section className="feature-strip">
        <div className="feature-card">
          <h3>Pick the slate</h3>
          <p>Your commissioner sets the week's games with real, frozen spreads — no pushes, ever.</p>
        </div>
        <div className="feature-card">
          <h3>Rank your confidence</h3>
          <p>Drag and drop every pick from most to least confident. Highest confidence, highest points.</p>
        </div>
        <div className="feature-card">
          <h3>Chase the title</h3>
          <p>Live scores, weekly standings, and a what-if calculator for when the season's on the line.</p>
        </div>
      </section>
    </PublicLayout>
  );
}
