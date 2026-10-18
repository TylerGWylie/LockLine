import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AccountMenu } from "./AccountMenu";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="nav">
        <Link to="/" className="brand">
          LOCK<span className="brand-accent">LINE</span>
        </Link>
        <AccountMenu />
      </header>
      {children}
    </div>
  );
}
