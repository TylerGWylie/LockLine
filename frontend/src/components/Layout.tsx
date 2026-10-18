import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AccountMenu } from "./AccountMenu";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="nav">
        <Link to="/" className="brand">
          Confidence League
        </Link>
        <AccountMenu />
      </header>
      {children}
    </div>
  );
}
