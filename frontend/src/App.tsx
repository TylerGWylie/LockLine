import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CommissionerLeaguePage } from "./pages/CommissionerLeaguePage";
import { CommissionerLeaguesPage } from "./pages/CommissionerLeaguesPage";
import { CommissionerWeekPage } from "./pages/CommissionerWeekPage";
import { HomePage } from "./pages/HomePage";
import { JoinInvitePage } from "./pages/JoinInvitePage";
import { JoinTeamPage } from "./pages/JoinTeamPage";
import { LeaguePage } from "./pages/LeaguePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { StandingsPage } from "./pages/StandingsPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";
import { WeekPage } from "./pages/WeekPage";
import { WelcomePage } from "./pages/WelcomePage";
import { WhatIfPage } from "./pages/WhatIfPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join/:code" element={<JoinInvitePage />} />
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
          <Route
            path="/commissioner"
            element={
              <ProtectedRoute>
                <CommissionerLeaguesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/commissioner/:leagueId"
            element={
              <ProtectedRoute>
                <CommissionerLeaguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/commissioner/:leagueId/weeks/:weekId"
            element={
              <ProtectedRoute>
                <CommissionerWeekPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-settings"
            element={
              <ProtectedRoute>
                <TeamSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join-team"
            element={
              <ProtectedRoute>
                <JoinTeamPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
