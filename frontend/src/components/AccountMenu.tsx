import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
