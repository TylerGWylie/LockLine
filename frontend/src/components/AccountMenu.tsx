import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Team } from "../types";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Team[]>("/teams/mine")
      .then((teams) => setHasTeam(teams.length > 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="account-menu" ref={ref}>
      <button className="secondary" onClick={() => setOpen((o) => !o)}>
        {user?.displayName} ▾
      </button>
      {open && (
        <div className="account-menu-dropdown">
          <Link to="/commissioner" onClick={() => setOpen(false)}>
            League Commissioner
          </Link>
          <Link to="/team-settings" onClick={() => setOpen(false)}>
            Team Settings
          </Link>
          {hasTeam && (
            <Link to="/join-team" onClick={() => setOpen(false)}>
              Join another team
            </Link>
          )}
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
