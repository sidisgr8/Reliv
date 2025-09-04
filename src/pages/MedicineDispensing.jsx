import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";
import PrimaryButton from "../components/PrimaryButton";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import VirtualKeyboard from "../components/VirtualKeyboard";

// --- Default Data (for fallback if MongoDB is empty) ---
const defaultKits = [
  {
    id: 1,
    name: "First Aid Kit",
    description: "Essential supplies for common injuries.",
    price: 1200,
    quantity: 10,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/1NBwEAIbZQOmw92j-YfsLWTDwuD1fUnsk",
    expiryDate: "2025-12-31",
  },
  {
    id: 2,
    name: "Travel Health Kit",
    description: "Stay healthy and prepared on the go.",
    price: 1500,
    quantity: 12,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/1yH56TSxZg1qHKYuoLN2IFqts45pKXmYk",
    expiryDate: "2025-01-20",
  },
  {
    id: 3,
    name: "Women's Care Kit",
    description: "Essential supplies for women's health.",
    price: 1800,
    quantity: 7,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/1Q0BwqGowsnojqc4xS1M7XxW-DadQzPmS",
    expiryDate: "2026-03-31",
  },
  {
    id: 4,
    name: "Testing Kit",
    description: "Testing kits for health monitoring.",
    price: 2000,
    quantity: 5,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/1I8VQI1T43rEl_8XGt9x5BXAy8W_2GugF",
    expiryDate: "2025-11-30",
  },
  {
    id: 5,
    name: "Immunity Kit",
    description: "Boost immunity with these supplements.",
    price: 1000,
    quantity: 15,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/15r8V_unpnFThDuj6nsavTrYsvoj3CdTN",
    expiryDate: "2026-05-15",
  },
  {
    id: 6,
    name: "Safety Kit",
    description: "Personal safety and protection gear.",
    price: 1400,
    quantity: 9,
    imageUrl: "",
    folderUrl: "https://drive.google.com/drive/folders/19t-Mh_lXEpxtUh8UX7lLTPcpBLfkpsqC",
    expiryDate: "2025-09-30",
  },
];

// --- Helpers ---
const computeStockLabel = (qty, expiryDate) => {
  if (new Date(expiryDate) < new Date()) return "Expired";
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
};

// --- Components ---
const StockBadge = ({ quantity, expiryDate }) => {
  const stock = computeStockLabel(quantity, expiryDate);
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
    case "Expired":
      specificClasses = "bg-red-100 text-red-800";
      break;
    default:
      specificClasses = "bg-gray-100 text-gray-800";
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{stock}</span>;
};

const KitCard = ({ kit, onAddToCart, refreshStatus }) => {
  const isOutOfStock = kit.quantity <= 0 || new Date(kit.expiryDate) < new Date();
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:border-orange-300">
      <div className="w-full h-40 bg-gray-100 relative">
        {kit.imageUrl ? (
          <img src={kit.imageUrl} alt={kit.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}
        {refreshStatus && (
          <div className="absolute top-2 right-2 px-2 py-1 text-xs rounded-full bg-gray-800 text-white">
            {refreshStatus}
          </div>
        )}
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-gray-800">{kit.name}</h3>
        <p className="text-sm text-gray-600 mt-1 flex-grow">{kit.description}</p>
        <div className="flex justify-between items-center mt-4">
          <p className="text-xl font-semibold text-orange-500">₹{kit.price}</p>
          <StockBadge quantity={kit.quantity} expiryDate={kit.expiryDate} />
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
  const { fromPaymentGate, cart: cartFromPrevPage } = location.state || {};

  const [medicalKits, setMedicalKits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState(cartFromPrevPage || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatuses, setRefreshStatuses] = useState({}); // Per-kit refresh status
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem("adminEmail_v1") || "khanfaizan3234@gmail.com");
  const [resetStage, setResetStage] = useState("request");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isRunMode, setIsRunMode] = useState(() => localStorage.getItem("paymentMode") === "run");

  const [keyboardState, setKeyboardState] = useState({
    visible: false,
    inputName: "",
    inputs: {},
  });

  const handleInputFocus = (e) => {
    setKeyboardState({
      ...keyboardState,
      visible: true,
      inputName: e.target.name,
    });
  };

  const handleKeyboardChange = (inputName, value) => {
    setKeyboardState((prev) => ({
      ...prev,
      inputs: { ...prev.inputs, [inputName]: value },
    }));

    if (inputName === "passwordInput") {
      setPasswordInput(value);
    } else if (inputName === "newPassword") {
      setNewPassword(value);
    } else if (inputName === "verificationCodeInput") {
      setVerificationCodeInput(value);
    } else if (inputName.startsWith("kit-")) {
        const [_, id, field] = inputName.split("-");
        const newKits = medicalKits.map((k) => {
            if (k.id === Number(id)) {
                return { ...k, [field]: value };
            }
            return k;
        });
        setMedicalKits(newKits);
    }
  };

  const handleUpdateKitField = async (id, field, value) => {
      try {
        const response = await fetch(`http://localhost:5000/api/kits/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (!response.ok) throw new Error("Failed to update kit");
        setMedicalKits((prev) => prev.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
      } catch (err) {
        console.error("Error updating kit:", err);
        alert(`Failed to update kit: ${err.message}`);
      }
    };


  // Fetch kits from MongoDB on mount
  useEffect(() => {
    const fetchKits = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/kits");
        if (!response.ok) throw new Error("Failed to fetch kits");
        const kits = await response.json();
        setMedicalKits(kits.length > 0 ? kits : defaultKits);
      } catch (e) {
        console.error("Error fetching kits from MongoDB:", e);
        setMedicalKits(defaultKits);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKits();
  }, []);

  const { activeKits, expiredKits } = useMemo(() => {
    const today = new Date();
    const active = [];
    const expired = [];
    medicalKits.forEach(kit => {
      if (new Date(kit.expiryDate) < today) {
        expired.push(kit);
      } else {
        active.push(kit);
      }
    });
    return { activeKits: active, expiredKits: expired };
  }, [medicalKits]);

  const handleAddToCart = (kitToAdd) => {
    const existingCartItem = cart.find((item) => item.id === kitToAdd.id);
    const currentQuantityInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (currentQuantityInCart >= kitToAdd.quantity) {
      alert(`You cannot add more than the available stock of ${kitToAdd.quantity}.`);
      return;
    }

    setCart((prevCart) => {
      if (existingCartItem) {
        return prevCart.map((item) =>
          item.id === kitToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
        );
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
  useEffect(() => {
    if (!localStorage.getItem("adminPassword_v1")) localStorage.setItem("adminPassword_v1", "admin123");
    if (!localStorage.getItem("adminEmail_v1")) localStorage.setItem("adminEmail_v1", "khanfaizan3234@gmail.com");
  }, []);

  const handleAdminToggle = () => {
    setIsAdminOpen((s) => !s);
    setIsAuthenticated(false);
    setPasswordInput("");
    setShowForgot(false);
    setNewPassword("");
    setResetStage("request");
    setVerificationCodeInput("");
    setStatusMessage("");
    setRefreshStatuses({});
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const emailForLogin = localStorage.getItem("adminEmail_v1") || "khanfaizan3234@gmail.com";
    
    if (!navigator.onLine || window.location.hostname === 'localhost') {
      const storedPassword = localStorage.getItem("adminPassword_v1") || "admin123";
      if (passwordInput === storedPassword) {
        setIsAuthenticated(true);
        setPasswordInput("");
        return;
      }
    }

    try {
      const res = await fetch("http://localhost:5000/api/check-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForLogin, password: passwordInput }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPasswordInput("");
      } else {
        const data = await res.json();
        throw new Error(data.message || "Incorrect password");
      }
    } catch (err) {
      alert(`Login failed: ${err.message}. Ensure the server is running.`);
    }
  };

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setStatusMessage("Sending request...");
    try {
      const res = await fetch("http://localhost:5000/api/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: adminEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("A recovery email has been sent. Please check your inbox.");
        setResetStage("verify");
      } else {
        throw new Error(data.message || "Failed to send email.");
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const verifyAndResetPassword = async (e) => {
    e.preventDefault();
    setStatusMessage("Verifying...");
    try {
      const res = await fetch("http://localhost:5000/api/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          token: verificationCodeInput.trim(),
          newPassword: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("adminPassword_v1", newPassword);
        alert("Password has been reset successfully!");
        setShowForgot(false);
        setResetStage("request");
        setVerificationCodeInput("");
        setNewPassword("");
        setStatusMessage("");
      } else {
        throw new Error(data.message || "Failed to reset password.");
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleSaveAdminEmail = () => {
    localStorage.setItem("adminEmail_v1", adminEmail || "");
    alert("Admin email saved.");
  };

  const handleModeToggle = () => {
    const newMode = !isRunMode;
    setIsRunMode(newMode);
    localStorage.setItem("paymentMode", newMode ? "run" : "test");
    alert(`Payment mode set to ${newMode ? "Run Mode" : "Test Mode"}.`);
  };

  // --- Admin kit operations ---

  const handleDeleteKit = async (id) => {
    if (!window.confirm("Delete this kit? This is permanent.")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/kits/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete kit");
      setMedicalKits((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Error deleting kit:", err);
      alert(`Failed to delete kit: ${err.message}`);
    }
  };

  const handleAddNewKit = async () => {
    const nextId = Math.max(0, ...medicalKits.map((k) => k.id)) + 1;
    const newKit = {
      id: nextId,
      name: `New Kit ${nextId}`,
      description: "Description",
      price: 0,
      quantity: 0,
      imageUrl: "",
      folderUrl: "",
      expiryDate: new Date().toISOString().split("T")[0],
    };
    try {
      const response = await fetch("http://localhost:5000/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKit),
      });
      if (!response.ok) throw new Error("Failed to add new kit");
      setMedicalKits((prev) => [newKit, ...prev]);
    } catch (err) {
      console.error("Error adding new kit:", err);
      alert(`Failed to add new kit: ${err.message}`);
    }
  };

  const handleImageUpload = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const response = await fetch(`http://localhost:5000/api/kits/${id}/image`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: event.target.result }),
        });
        if (!response.ok) throw new Error("Failed to update image");
        handleUpdateKitField(id, "imageUrl", event.target.result);
      } catch (err) {
        console.error("Error uploading image:", err);
        alert(`Failed to upload image: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchGdriveImage = useCallback(async (url) => {
    if (!url || !url.includes("drive.google.com")) {
      return "";
    }
    try {
      const isFolder = url.includes('/drive/folders/');
      const regex = isFolder 
        ? /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/ 
        : /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/;
      const match = url.match(regex);
      if (!match || !match[1]) {
        return "";
      }
      const id = match[1];
      const endpoint = isFolder ? `gdrive-folder-image/${id}` : `gdrive-image/${id}`;

      const response = await fetch(`http://localhost:5000/api/${endpoint}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();

      if (!response.ok) {
        console.warn(`Failed to fetch image for ${isFolder ? 'folder' : 'file'} ${id}: ${data.message || 'Unknown error'}`);
        return "";
      }

      return data.imageUrl || "";
    } catch (error) {
      console.error("Error fetching GDrive image:", error);
      return "";
    }
  }, []);

  const handleRefreshGdriveImages = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshStatuses({}); // Clear previous statuses
    try {
      const updatedKits = [...medicalKits];
      const newStatuses = {};

      for (const kit of medicalKits) {
        if (kit.folderUrl && kit.folderUrl.includes("drive.google.com")) {
          newStatuses[kit.id] = "Refreshing...";
          setRefreshStatuses((prev) => ({ ...prev, [kit.id]: "Refreshing..." }));
          const newImageUrl = await fetchGdriveImage(kit.folderUrl);
          
          if (newImageUrl) {
            try {
              const response = await fetch(`http://localhost:5000/api/kits/${kit.id}/image`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: newImageUrl }),
              });
              if (!response.ok) throw new Error("Failed to update image in MongoDB");
              const index = updatedKits.findIndex((k) => k.id === kit.id);
              updatedKits[index] = { ...kit, imageUrl: newImageUrl };
              newStatuses[kit.id] = "Image refreshed";
            } catch (err) {
              console.error(`Error updating image for kit ${kit.id}:`, err);
              newStatuses[kit.id] = "Failed to fetch";
            }
          } else {
            try {
              const response = await fetch(`http://localhost:5000/api/kits/${kit.id}/image`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: "" }),
              });
              if (!response.ok) throw new Error("Failed to clear image in MongoDB");
              const index = updatedKits.findIndex((k) => k.id === kit.id);
              updatedKits[index] = { ...kit, imageUrl: "" };
              newStatuses[kit.id] = "No image found";
            } catch (err) {
              console.error(`Error clearing image for kit ${kit.id}:`, err);
              newStatuses[kit.id] = "Failed to fetch";
            }
          }
          setRefreshStatuses((prev) => ({ ...prev, [kit.id]: newStatuses[kit.id] }));
        } else {
          newStatuses[kit.id] = "No Google Drive link";
          setRefreshStatuses((prev) => ({ ...prev, [kit.id]: newStatuses[kit.id] }));
        }
      }

      setMedicalKits(updatedKits);
      setTimeout(() => setRefreshStatuses({}), 3000); // Clear statuses after 3 seconds
    } catch (error) {
      console.error("Error refreshing Google Drive images:", error);
      setRefreshStatuses((prev) => {
        const newStatuses = {};
        medicalKits.forEach((kit) => {
          newStatuses[kit.id] = prev[kit.id] || "Failed to fetch";
        });
        return newStatuses;
      });
      setTimeout(() => setRefreshStatuses({}), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }, [medicalKits, fetchGdriveImage]);

  if (isLoading) {
    return <div className="text-center py-10">Loading kits...</div>;
  }

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
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Admin</div>
            <button aria-label="Open admin panel" onClick={handleAdminToggle} className="bg-white p-2 rounded-full shadow hover:scale-105 transition-transform">
              <span role="img" aria-hidden>⚙️</span>
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicalKits.map((kit) => (
            <KitCard
              key={kit.id}
              kit={kit}
              onAddToCart={handleAddToCart}
              refreshStatus={refreshStatuses[kit.id]}
            />
          ))}
        </main>
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <button onClick={handleCheckout} className="w-full flex items-center justify-between bg-orange-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105">
            <span>{totalItems} item{totalItems > 1 ? 's' : ''} in cart</span>
            <span onClick={() => navigate("/checkout", { state: { cart, totalPrice, fromPaymentGate } })}>
              Checkout (₹{totalPrice}) →
            </span>
          </button>
        </div>
      )}

      {isAdminOpen && (
        <div className="fixed inset-0 flex items-start justify-center pt-20 px-4" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/40" onClick={handleAdminToggle} style={{ zIndex: 9998 }}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ zIndex: 9999 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Admin Panel</h2>
              <div className="flex items-center gap-4">
                <button onClick={handleAdminToggle} className="text-gray-600">Close</button>
              </div>
            </div>
            {!isAuthenticated ? (
              <div>
                {!showForgot ? (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      name="passwordInput"
                      value={passwordInput}
                      onFocus={handleInputFocus}
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
                      Login is now handled by the server. The default password is{" "}
                      <span className="font-mono">admin123</span> and the default email is{" "}
                      <span className="font-mono">khanfaizan3234@gmail.com</span>
                    </p>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {resetStage === "request" ? (
                      <form onSubmit={requestPasswordReset} className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Registered Admin Email
                        </label>
                        <input
                          value="khanfaizan3234@gmail.com"
                          readOnly
                          className="w-full rounded-md border px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
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
                        {statusMessage && <p className="text-xs text-gray-600">{statusMessage}</p>}
                      </form>
                    ) : resetStage === "verify" ? (
                      <form onSubmit={verifyAndResetPassword} className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Recovery Code
                        </label>
                        <input
                          name="verificationCodeInput"
                          value={verificationCodeInput}
                          onFocus={handleInputFocus}
                          onChange={(e) => setVerificationCodeInput(e.target.value)}
                          className="w-full rounded-md border px-3 py-2"
                          placeholder="Enter the code you received via email"
                        />
                        <label className="block text-sm font-medium text-gray-700">
                          New password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={newPassword}
                          onFocus={handleInputFocus}
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
                        {statusMessage && <p className="text-xs text-red-500">{statusMessage}</p>}
                      </form>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${!isRunMode ? 'text-orange-500' : 'text-gray-500'}`}>Test Mode</span>
                      <button
                        onClick={handleModeToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRunMode ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRunMode ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${isRunMode ? 'text-green-500' : 'text-gray-500'}`}>Run Mode</span>
                    </div>
                    <PrimaryButton
                      onClick={handleRefreshGdriveImages}
                      disabled={isRefreshing}
                      className={`${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''} text-sm px-3 py-1 bg-blue-500 text-white rounded-md`}
                    >
                      {isRefreshing ? "Refreshing..." : "Refresh Images"}
                    </PrimaryButton>
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
                <div className="space-y-4 max-h-96 overflow-auto pr-2">
                  {activeKits.map((kit) => (
                    <div
                      key={kit.id}
                      className="border rounded-xl p-3 flex gap-4 items-start"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                        {kit.imageUrl ? (
                          <img
                            src={kit.imageUrl}
                            alt=""
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">No Image</span>
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <div className="md:col-span-1">
                          <label className="text-xs text-gray-600">Name</label>
                          <input
                            name={`kit-${kit.id}-name`}
                            value={kit.name}
                            onFocus={handleInputFocus}
                            onChange={(e) =>
                              handleUpdateKitField(kit.id, "name", e.target.value)
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Description</label>
                          <input
                            name={`kit-${kit.id}-description`}
                            value={kit.description}
                            onFocus={handleInputFocus}
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
                            name={`kit-${kit.id}-price`}
                            value={kit.price}
                            onFocus={handleInputFocus}
                            onChange={(e) =>
                              handleUpdateKitField(kit.id, "price", Number(e.target.value))
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Quantity</label>
                          <input
                            type="number"
                            name={`kit-${kit.id}-quantity`}
                            value={kit.quantity}
                            onFocus={handleInputFocus}
                            onChange={(e) =>
                              handleUpdateKitField(kit.id, "quantity", Number(e.target.value))
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Expiry</label>
                          <input
                            type="date"
                            name={`kit-${kit.id}-expiryDate`}
                            value={kit.expiryDate}
                            onFocus={handleInputFocus}
                            onChange={(e) =>
                              handleUpdateKitField(kit.id, "expiryDate", e.target.value)
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-gray-600">Image</label>
                          <span className="text-xs text-gray-500 text-center">upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(kit.id, e.target.files[0])}
                            className="text-xs"
                          />
                          <button
                            onClick={() => handleDeleteKit(kit.id)}
                            className="text-sm px-3 py-1 rounded-md border text-red-600 mt-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {expiredKits.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-red-600">Expired Kits</h3>
                    <div className="space-y-2 mt-2">
                      {expiredKits.map((kit) => (
                        <div key={kit.id} className="border rounded-xl p-3 flex gap-4 items-start bg-red-50">
                          <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                            {kit.imageUrl ? (
                              <img src={kit.imageUrl} alt="" className="w-20 h-20 object-cover rounded-md opacity-50" />
                            ) : (
                              <span className="text-xs text-gray-500">No Image</span>
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                            <div className="md:col-span-1">
                              <label className="text-xs text-gray-600">Name</label>
                              <input
                                name={`kit-${kit.id}-name`}
                                value={kit.name}
                                onFocus={handleInputFocus}
                                onChange={(e) =>
                                  handleUpdateKitField(kit.id, "name", e.target.value)
                                }
                                className="w-full rounded-md border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Description</label>
                              <input
                                name={`kit-${kit.id}-description`}
                                value={kit.description}
                                onFocus={handleInputFocus}
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
                                name={`kit-${kit.id}-price`}
                                value={kit.price}
                                onFocus={handleInputFocus}
                                onChange={(e) =>
                                  handleUpdateKitField(kit.id, "price", Number(e.target.value))
                                }
                                className="w-full rounded-md border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Quantity</label>
                              <input
                                type="number"
                                name={`kit-${kit.id}-quantity`}
                                value={kit.quantity}
                                onFocus={handleInputFocus}
                                onChange={(e) =>
                                  handleUpdateKitField(kit.id, "quantity", Number(e.target.value))
                                }
                                className="w-full rounded-md border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Expiry</label>
                              <input
                                type="date"
                                name={`kit-${kit.id}-expiryDate`}
                                value={kit.expiryDate}
                                onFocus={handleInputFocus}
                                onChange={(e) =>
                                  handleUpdateKitField(kit.id, "expiryDate", e.target.value)
                                }
                                className="w-full rounded-md border px-2 py-1"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-xs text-gray-600">Image</label>
                              <span className="text-xs text-gray-500 text-center">upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(kit.id, e.target.files[0])}
                                className="text-xs"
                              />
                              <button
                                onClick={() => handleDeleteKit(kit.id)}
                                className="text-sm px-3 py-1 rounded-md border text-red-600 mt-2"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Changes are saved to the database and reflected in real-time on the main page.
                </p>
              </div>
            )}
          </div>
          {keyboardState.visible && (
            <VirtualKeyboard
              inputName={keyboardState.inputName}
              inputs={keyboardState.inputs}
              onChange={handleKeyboardChange}
              onClose={() => setKeyboardState({ ...keyboardState, visible: false })}
            />
          )}
        </div>
      )}
    </div>
  );
}