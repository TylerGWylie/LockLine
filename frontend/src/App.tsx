import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LeaguePage } from "./pages/LeaguePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { StandingsPage } from "./pages/StandingsPage";
import { WeekPage } from "./pages/WeekPage";
import { WhatIfPage } from "./pages/WhatIfPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId"
            element={
              <ProtectedRoute>
                <LeaguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/weeks/:weekId"
            element={
              <ProtectedRoute>
                <WeekPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/weeks/:weekId/standings"
            element={
              <ProtectedRoute>
                <StandingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/weeks/:weekId/whatif"
            element={
              <ProtectedRoute>
                <WhatIfPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
