// src/App.tsx
import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuthUser } from "./hooks/useAuthUser";
import { useWebPushNotifications } from "./hooks/useWebPushNotifications";

import LoginPage from "./pages/LoginPage";
import CalendarPage from "./pages/CalendarPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import StatsPage from "./pages/StatsPage";
import FacultyPage from "./pages/FacultyPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuthUser();
  useWebPushNotifications(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF5F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-3xl bg-gradient-to-tr from-[#D48C9E] to-[#EAA8B8] flex items-center justify-center text-white font-extrabold text-lg shadow-lg animate-pulse">
            CN
          </div>
          <p className="text-xs text-[#826F84] font-bold">Cargando Caro Nails...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

export default function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      <Route path="/">
        <Redirect to="/calendar" />
      </Route>

      <Route path="/calendar">
        {() => <ProtectedRoute component={CalendarPage} />}
      </Route>

      <Route path="/appointments">
        {() => <ProtectedRoute component={AppointmentsPage} />}
      </Route>

      <Route path="/clients">
        {() => <ProtectedRoute component={ClientsPage} />}
      </Route>

      <Route path="/clients/:clientId">
        {() => <ProtectedRoute component={ClientDetailPage} />}
      </Route>

      <Route path="/stats">
        {() => <ProtectedRoute component={StatsPage} />}
      </Route>

      <Route path="/faculty">
        {() => <ProtectedRoute component={FacultyPage} />}
      </Route>

      {/* Fallback */}
      <Route>
        <Redirect to="/calendar" />
      </Route>
    </Switch>
  );
}
