import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div>
      <header className="public-nav">
        <Link to="/welcome" className="brand">
          LOCK<span className="brand-accent">LINE</span>
        </Link>
        <div className="public-nav-links">
          {pathname !== "/login" && <Link to="/login">Log In</Link>}
          {pathname !== "/signup" && (
            <Link to="/signup" className="filled">
              Sign Up
            </Link>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
