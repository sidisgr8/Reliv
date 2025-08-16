import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";
import PrimaryButton from "../components/PrimaryButton";

// --- Mock Data & Reusable Components (from previous step) ---

const medicalKits = [
  {
    id: 1,
    name: "First Aid Kit",
    description: "Essential supplies for common injuries.",
    price: 1200, // Using numbers for easier calculation
    stock: "In Stock",
    imageUrl: "https://via.placeholder.com/150/FF6347/FFFFFF?text=First+Aid",
  },
  {
    id: 2,
    name: "Diabetes Care Kit",
    description: "Monitor and manage blood sugar levels.",
    price: 2500,
    stock: "In Stock",
    imageUrl: "https://via.placeholder.com/150/4682B4/FFFFFF?text=Diabetes",
  },
  {
    id: 3,
    name: "Cold & Flu Kit",
    description: "Relief from seasonal cold and flu symptoms.",
    price: 850,
    stock: "Low Stock",
    imageUrl: "https://via.placeholder.com/150/3CB371/FFFFFF?text=Cold/Flu",
  },
  {
    id: 4,
    name: "Travel Health Kit",
    description: "Stay healthy and prepared on the go.",
    price: 1500,
    stock: "Out of Stock",
    imageUrl: "https://via.placeholder.com/150/6A5ACD/FFFFFF?text=Travel",
  },
];

const StockBadge = ({ stock }) => {
  const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
  let specificClasses = "";
  switch (stock) {
    case "In Stock": specificClasses = "bg-green-100 text-green-800"; break;
    case "Low Stock": specificClasses = "bg-yellow-100 text-yellow-800"; break;
    case "Out of Stock": specificClasses = "bg-red-100 text-red-800"; break;
    default: specificClasses = "bg-gray-100 text-gray-800";
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{stock}</span>;
};

const KitCard = ({ kit, onAddToCart }) => {
  const isOutOfStock = kit.stock === "Out of Stock";
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:border-orange-300">
      <div className="w-full h-40 bg-gray-100"><img src={kit.imageUrl} alt={kit.name} className="w-full h-full object-cover" /></div>
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-gray-800">{kit.name}</h3>
        <p className="text-sm text-gray-600 mt-1 flex-grow">{kit.description}</p>
        <div className="flex justify-between items-center mt-4">
          <p className="text-xl font-semibold text-orange-500">₹{kit.price}</p>
          <StockBadge stock={kit.stock} />
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


// --- Main Medicine Dispensing Page ---
export default function MedicineDispensing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState([]);

  // Check if we came from the payment gate
  const { fromPaymentGate } = location.state || {};

  const handleAddToCart = (kitToAdd) => {
    setCart((prevCart) => {
      const existingKit = prevCart.find((item) => item.id === kitToAdd.id);
      if (existingKit) {
        // If kit exists, update its quantity
        return prevCart.map((item) =>
          item.id === kitToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // If kit doesn't exist, add it to the cart
      return [...prevCart, { ...kitToAdd, quantity: 1 }];
    });
  };

  const { totalItems, totalPrice } = useMemo(() => {
    const items = cart.reduce((sum, item) => sum + item.quantity, 0);
    const price = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems: items, totalPrice: price };
  }, [cart]);

  const handleCheckout = () => {
    // Navigate to the checkout page and pass the cart state and the fromPaymentGate flag
    navigate('/checkout', { state: { cart, totalPrice, fromPaymentGate } });
  };

  return (
    <div className="relative min-h-screen bg-gray-50 font-sans pb-28"> {/* Added padding-bottom */}
      <TopEllipseBackground color="#FFF1EA" height="40%" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-3xl text-gray-700 hover:text-orange-500 transition-colors" aria-label="Go Back">←</button>
          <div className="text-center">
            <Logo />
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mt-2">Medicine Dispensing</h1>
            <p className="text-gray-600">Select a kit to add to your cart</p>
          </div>
          <div className="w-8"></div>
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
    </div>
  );
}