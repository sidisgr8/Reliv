import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";
import PrimaryButton from "../components/PrimaryButton";

// --- Default Data ---
const defaultKits = [
  {
    id: 1,
    name: "First Aid Kit",
    description: "Essential supplies for common injuries.",
    price: 1200,
    quantity: 10,
    imageUrl: "https://via.placeholder.com/150/FF6347/FFFFFF?text=First+Aid",
  },
  {
    id: 2,
    name: "Diabetes Care Kit",
    description: "Monitor and manage blood sugar levels.",
    price: 2500,
    quantity: 8,
    imageUrl: "https://via.placeholder.com/150/4682B4/FFFFFF?text=Diabetes",
  },
  {
    id: 3,
    name: "Cold & Flu Kit",
    description: "Relief from seasonal cold and flu symptoms.",
    price: 850,
    quantity: 3,
    imageUrl: "https://via.placeholder.com/150/3CB371/FFFFFF?text=Cold/Flu",
  },
  {
    id: 4,
    name: "Travel Health Kit",
    description: "Stay healthy and prepared on the go.",
    price: 1500,
    quantity: 0,
    imageUrl: "https://via.placeholder.com/150/6A5ACD/FFFFFF?text=Travel",
  },
];

// --- Helpers ---
const computeStockLabel = (qty) => {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
};

// --- Components ---
const StockBadge = ({ quantity }) => {
  const stock = computeStockLabel(quantity);
  const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
  let specificClasses = "";
  switch (stock) {
    case "In Stock":
      specificClasses = "bg-green-100 text-green-800";
      break;
    case "Low Stock":
      specificClasses = "bg-yellow-100 text-yellow-800";
      break;
    case "Out of Stock":
      specificClasses = "bg-red-100 text-red-800";
      break;
    default:
      specificClasses = "bg-gray-100 text-gray-800";
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{stock}</span>;
};

const KitCard = ({ kit, onAddToCart }) => {
  const isOutOfStock = kit.quantity <= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:border-orange-300">
      <div className="w-full h-40 bg-gray-100">
        <img src={kit.imageUrl} alt={kit.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-gray-800">{kit.name}</h3>
        <p className="text-sm text-gray-600 mt-1 flex-grow">{kit.description}</p>
        <div className="flex justify-between items-center mt-4">
          <p className="text-xl font-semibold text-orange-500">₹{kit.price}</p>
          <StockBadge quantity={kit.quantity} />
        </div>
        <PrimaryButton
          className="w-full justify-center mt-4"
          disabled={isOutOfStock}
          onClick={() => onAddToCart(kit)}
          aria-label={isOutOfStock ? `${kit.name} is out of stock` : `Add ${kit.name} to cart`}
        >
          {isOutOfStock ? "Unavailable" : "Add to Cart"}
        </PrimaryButton>
      </div>
    </div>
  );
};

// --- Main Component with Admin Panel ---
export default function MedicineDispensingWithAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fromPaymentGate } = location.state || {};

  // load kits from localStorage if present so admin changes persist, otherwise use defaults
  const [medicalKits, setMedicalKits] = useState(() => {
    try {
      const raw = localStorage.getItem("medicalKits_v1");
      return raw ? JSON.parse(raw) : defaultKits;
    } catch (e) {
      return defaultKits;
    }
  });

  useEffect(() => {
    localStorage.setItem("medicalKits_v1", JSON.stringify(medicalKits));
  }, [medicalKits]);

  // Cart state
  const [cart, setCart] = useState([]);

  const handleAddToCart = (kitToAdd) => {
    setCart((prevCart) => {
      const existingKit = prevCart.find((item) => item.id === kitToAdd.id);
      if (existingKit) {
        return prevCart.map((item) => (item.id === kitToAdd.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prevCart, { ...kitToAdd, quantity: 1 }];
    });
  };

  const { totalItems, totalPrice } = useMemo(() => {
    const items = cart.reduce((sum, item) => sum + item.quantity, 0);
    const price = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems: items, totalPrice: price };
  }, [cart]);

  const handleCheckout = () => {
    navigate("/checkout", { state: { cart, totalPrice, fromPaymentGate } });
  };

  // --- Admin Panel State ---
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  // admin email and password-reset states
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem("adminEmail_v1") || "");
  const [resetStage, setResetStage] = useState("request"); // 'request' | 'verify'
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // initialize admin credentials if missing
    if (!localStorage.getItem("adminPassword_v1")) localStorage.setItem("adminPassword_v1", "admin123");
    if (!localStorage.getItem("adminRecovery_v1")) localStorage.setItem("adminRecovery_v1", "medkit-reset");
    if (!localStorage.getItem("adminEmail_v1")) localStorage.setItem("adminEmail_v1", "");
  }, []);

  // helper: SHA-256 hex hash
  const hashString = async (str) => {
    if (!str) return "";
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleAdminToggle = () => {
    setIsAdminOpen((s) => !s);
    // reset login/reset state when opening
    setIsAuthenticated(false);
    setPasswordInput("");
    setShowForgot(false);
    setRecoveryInput("");
    setNewPassword("");
    setResetStage("request");
    setVerificationCodeInput("");
    setStatusMessage("");
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const stored = localStorage.getItem("adminPassword_v1") || "";
    if (passwordInput === stored) {
      setIsAuthenticated(true);
      setPasswordInput("");
    } else {
      alert("Incorrect password");
    }
  };

  // Request a password reset: generates a secure token, stores its hash + expiry, and attempts to send an email.
  const requestPasswordReset = async (e) => {
    e && e.preventDefault && e.preventDefault();
    // ensure an admin email exists
    const savedEmail = localStorage.getItem("adminEmail_v1") || "";
    if (!savedEmail) return alert("No admin email is set. Please have an authenticated admin set an email first.");

    // For security, require the user to type the admin email to confirm
    if (adminEmail.trim() === "" || adminEmail.trim() !== savedEmail.trim()) {
      return alert("Please enter the registered admin email to request a password reset.");
    }

    // generate a secure random token
    const rawToken = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const code = rawToken.split("-")[0]; // short code for email (demo-friendly)
    const tokenHash = await hashString(code);
    const expiry = Date.now() + 1000 * 60 * 15; // 15 minutes

    localStorage.setItem("adminResetHash_v1", tokenHash);
    localStorage.setItem("adminResetExpiry_v1", String(expiry));
    // store the actual code in localStorage only for demo/testing purposes (remove in production)
    localStorage.setItem("adminResetDemoCode_v1", code);

    // Try to send an email via a server endpoint (recommended). If not available, fall back to mailto: for demo.
    const sendPayload = { to: savedEmail, subject: "Admin password reset", text: `Your recovery code is: ${code}. It expires in 15 minutes.` };

    try {
      // NOTE: This endpoint is **not** provided here. Implement server-side (Supabase function, Netlify function, etc.)
      await fetch("/api/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendPayload),
      });
      setStatusMessage("A recovery email has been sent. Check your inbox.");
    } catch (err) {
      // fallback: open mail client with prefilled message (demo only)
      const mailto = `mailto:${encodeURIComponent(savedEmail)}?subject=${encodeURIComponent(sendPayload.subject)}&body=${encodeURIComponent(sendPayload.text)}`;
      window.location.href = mailto;
      setStatusMessage("Could not call server endpoint. Opened your mail client as a fallback with the recovery code (demo). If you want real emails, wire '/api/send-reset-email' to your backend/Supabase/SendGrid.");

    }

    setResetStage("verify");
  };

  const verifyAndResetPassword = async (e) => {
    e && e.preventDefault && e.preventDefault();
    const storedHash = localStorage.getItem("adminResetHash_v1");
    const expiry = Number(localStorage.getItem("adminResetExpiry_v1") || 0);
    if (!storedHash || Date.now() > expiry) return alert("The recovery code is invalid or has expired. Request a new one.");
    if (!verificationCodeInput) return alert("Enter the recovery code sent to the admin email.");
    const inputHash = await hashString(verificationCodeInput.trim());
    if (inputHash !== storedHash) return alert("Recovery code incorrect.");
    if (!newPassword) return alert("Enter a new password.");
    localStorage.setItem("adminPassword_v1", newPassword);
    // cleanup reset tokens
    localStorage.removeItem("adminResetHash_v1");
    localStorage.removeItem("adminResetExpiry_v1");
    localStorage.removeItem("adminResetDemoCode_v1");
    alert("Password reset successful. You can now log in with the new password.");
    setShowForgot(false);
    setResetStage("request");
    setVerificationCodeInput("");
    setNewPassword("");
    setStatusMessage("");
  };

  const handleForgotPassword = (e) => {
    // keep compatibility with older wiring
    requestPasswordReset(e);
  };

  // Allow authenticated admin to change the stored admin email
  const handleSaveAdminEmail = () => {
    localStorage.setItem("adminEmail_v1", adminEmail || "");
    alert("Admin email saved.");
  };

  // --- Admin kit operations ---
  const handleUpdateKitField = (id, field, value) => {
    setMedicalKits((prev) => prev.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  };

  const handleDeleteKit = (id) => {
    if (!window.confirm("Delete this kit? This is permanent.")) return;
    setMedicalKits((prev) => prev.filter((k) => k.id !== id));
  };

  const handleAddNewKit = () => {
    const nextId = Math.max(0, ...medicalKits.map((k) => k.id)) + 1;
    const newKit = {
      id: nextId,
      name: `New Kit ${nextId}`,
      description: "Description",
      price: 0,
      quantity: 0,
      imageUrl: "https://via.placeholder.com/150/CCCCCC/FFFFFF?text=New",
    };
    setMedicalKits((prev) => [newKit, ...prev]);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 font-sans pb-28">
      <TopEllipseBackground color="#FFF1EA" height="40%" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-3xl text-gray-700 hover:text-orange-500 transition-colors" aria-label="Go Back">←</button>
          <div className="text-center">
            <Logo />
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mt-2">Medicine Dispensing</h1>
            <p className="text-gray-600">Select a kit to add to your cart</p>
          </div>

          {/* Admin icon */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Admin</div>
            <button aria-label="Open admin panel" onClick={handleAdminToggle} className="bg-white p-2 rounded-full shadow hover:scale-105 transition-transform">
              <span role="img" aria-hidden>⚙️</span>
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicalKits.map((kit) => (
            <KitCard key={kit.id} kit={kit} onAddToCart={handleAddToCart} />
          ))}
        </main>
      </div>

      {/* Floating Cart / Checkout Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <button onClick={handleCheckout} className="w-full flex items-center justify-between bg-orange-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105">
            <span>{totalItems} item{totalItems > 1 ? 's' : ''} in cart</span>
            <span>Checkout (₹{totalPrice}) →</span>
          </button>
        </div>
      )}

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 flex items-start justify-center pt-20 px-4" style={{zIndex: 9999}}>
          <div className="absolute inset-0 bg-black/40" onClick={handleAdminToggle} style={{zIndex: 9998}}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6" style={{zIndex: 9999}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Admin Panel</h2>
              <button onClick={handleAdminToggle} className="text-gray-600">Close</button>
            </div>
{!isAuthenticated ? (
  <div>
    {!showForgot ? (
      // --- Normal login form ---
      <form onSubmit={handleAdminLogin} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Enter admin password"
        />
        <div className="flex items-center justify-between gap-4">
          <PrimaryButton type="submit">Log in</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setShowForgot(true);
              setResetStage("request");
              setAdminEmail(localStorage.getItem("adminEmail_v1") || "");
            }}
            className="text-sm text-blue-600"
          >
            Forgot password?
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          (Demo mode: default password is{" "}
          <span className="font-mono">admin123</span>; recovery code is{" "}
          <span className="font-mono">medkit-reset</span>)
        </p>
      </form>
    ) : (
      // --- Forgot/reset flow ---
      <div className="space-y-4">
        {resetStage === "request" ? (
          <form onSubmit={requestPasswordReset} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Registered Admin Email
            </label>
            <input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Enter admin email"
            />
            <div className="flex items-center gap-4">
              <PrimaryButton type="submit">Send recovery email</PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetStage("request");
                }}
                className="text-sm text-gray-600"
              >
                Back to login
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {statusMessage ||
                "(An email will be sent with a short recovery code. For demo, mailto: is used or a server endpoint /api/send-reset-email can be wired.)"}
            </p>
            <p className="text-xs text-gray-400">
              Demo recovery code (visible only in local/demo):{" "}
              <span className="font-mono">
                {localStorage.getItem("adminResetDemoCode_v1") || "—"}
              </span>
            </p>
          </form>
        ) : resetStage === "verify" ? (
          <form onSubmit={verifyAndResetPassword} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Recovery Code
            </label>
            <input
              value={verificationCodeInput}
              onChange={(e) => setVerificationCodeInput(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Enter the code you received via email"
            />
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Set a new password"
            />
            <div className="flex items-center gap-4">
              <PrimaryButton type="submit">Reset password</PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetStage("request");
                }}
                className="text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {resetStage === "request" && statusMessage && (
          <div className="text-sm text-green-600">{statusMessage}</div>
        )}
      </div>
    )}
  </div>
) : (
  // --- Authenticated admin panel ---
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Inventory</h3>
        <button
          onClick={handleAddNewKit}
          className="text-sm px-3 py-1 rounded-full border"
        >
          + New kit
        </button>
      </div>
      <div>
        <PrimaryButton
          onClick={() => {
            setIsAuthenticated(false);
            alert("Logged out");
          }}
        >
          Log out
        </PrimaryButton>
      </div>
    </div>

    <div className="mb-4 flex items-center gap-3">
      <label className="text-sm text-gray-600">Admin email</label>
      <input
        value={adminEmail}
        onChange={(e) => setAdminEmail(e.target.value)}
        className="rounded-md border px-2 py-1"
        placeholder="admin@example.com"
      />
      <button
        onClick={handleSaveAdminEmail}
        className="text-sm px-3 py-1 rounded-md border"
      >
        Save email
      </button>
    </div>

    <div className="space-y-4 max-h-96 overflow-auto pr-2">
      {medicalKits.map((kit) => (
        <div
          key={kit.id}
          className="border rounded-xl p-3 flex gap-4 items-start"
        >
          <img
            src={kit.imageUrl}
            alt=""
            className="w-20 h-20 object-cover rounded-md"
          />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <div className="md:col-span-1">
              <label className="text-xs text-gray-600">Name</label>
              <input
                value={kit.name}
                onChange={(e) =>
                  handleUpdateKitField(kit.id, "name", e.target.value)
                }
                className="w-full rounded-md border px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Description</label>
              <input
                value={kit.description}
                onChange={(e) =>
                  handleUpdateKitField(kit.id, "description", e.target.value)
                }
                className="w-full rounded-md border px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Price (₹)</label>
              <input
                type="number"
                value={kit.price}
                onChange={(e) =>
                  handleUpdateKitField(kit.id, "price", Number(e.target.value))
                }
                className="w-full rounded-md border px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={kit.quantity}
                  onChange={(e) =>
                    handleUpdateKitField(kit.id, "quantity", Number(e.target.value))
                  }
                  className="w-full rounded-md border px-2 py-1"
                />
                <button
                  onClick={() => handleDeleteKit(kit.id)}
                  className="text-sm px-3 py-1 rounded-md border text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <p className="text-xs text-gray-500 mt-3">
      Changes are saved locally and reflected in real-time on the main page.
    </p>
  </div>
)}

          </div>
        </div>
      )}
    </div>
  );
}
