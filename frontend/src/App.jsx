import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/Signup";

import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  if (!token) {
    return (
      <Navigate
        to="/signin"
        replace
      />
    );
  }

  const role = (
    user?.role || "customer"
  ).toLowerCase();

  if (role !== "admin") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =========================
            HOME
        ========================= */}

        <Route
          path="/"
          element={<Home />}
        />

        {/* =========================
            SIGN IN
        ========================= */}

        <Route
          path="/signin"
          element={<SignIn />}
        />

        {/* =========================
            SIGN UP
        ========================= */}

        <Route
          path="/signup"
          element={<SignUp />}
        />

        {/* =========================
            CUSTOMER DASHBOARD
        ========================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================
            BOOKINGS
        ========================= */}

        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />

        {/* =========================
            PROFILE
        ========================= */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ADMIN DASHBOARD
        ========================= */}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* =========================
            UNKNOWN PAGE
        ========================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;