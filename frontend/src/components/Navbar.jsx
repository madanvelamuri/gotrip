import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  return (
    <header className="navbar">

      <div
        className="logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        Go<span>Trip</span>
      </div>

      <nav className="navLinks">

        <button
          type="button"
          onClick={() => navigate("/")}
        >
          Home
        </button>

        {token && (
          <>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => navigate("/bookings")}
            >
              Bookings
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>
          </>
        )}

        {!token ? (
          <>
            <button
              type="button"
              className="signinButton"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </button>

            <button
              type="button"
              className="signupButton"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            <span className="userName">
              {user?.name || "User"}
            </span>

            <button
              type="button"
              className="signupButton"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        )}

      </nav>

    </header>
  );
}