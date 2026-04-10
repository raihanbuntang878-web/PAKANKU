import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

// 🔥 FIREBASE CONFIG (PUNYA KAMU)
const firebaseConfig = {
  apiKey: "AIzaSyCIS1GZk6x89ITAIAaxaHxg_w00mcv2J-k",
  authDomain: "pakanku-app.firebaseapp.com",
  projectId: "pakanku-app",
  storageBucket: "pakanku-app.firebasestorage.app",
  messagingSenderId: "600847552162",
  appId: "1:600847552162:web:7c2e8b5c4612554ca291fb",
  measurementId: "G-EZMM4VZWD8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔐 AUTH + PROFILE
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setUserProfile(null);
      } else {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }

      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // 📦 FETCH PRODUCTS
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "products");

    const unsub = onSnapshot(ref, (snap) => {
      setProducts(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, [user]);

  // 🔐 LOGIN
  const login = async () => {
    await signInWithEmailAndPassword(auth, "test@mail.com", "123456");
  };

  // 📝 REGISTER
  const register = async () => {
    const userCred = await createUserWithEmailAndPassword(
      auth,
      "test@mail.com",
      "123456"
    );

    await setDoc(doc(db, "users", userCred.user.uid), {
      name: "User Demo",
      role: "buyer",
      email: "test@mail.com",
    });
  };

  // ➕ ADD PRODUCT
  const addProduct = async () => {
    await setDoc(doc(collection(db, "products")), {
      name: "Pakan Ayam",
      price: 5000,
      stock: 10,
      sellerId: user.uid,
      sellerName: userProfile?.name || "Seller",
    });
  };

  // 🛒 CART
  const addToCart = (p) => {
    setCart((prev) => [...prev, { ...p, qty: 1 }]);
  };

  // 💳 CHECKOUT
  const checkout = async () => {
    if (cart.length === 0) return;

    const orderRef = doc(collection(db, "orders"));

    await setDoc(orderRef, {
      items: cart,
      total: cart.reduce((a, b) => a + b.price * b.qty, 0),
      buyerId: user.uid,
      date: new Date().toISOString(),
      status: "pending",
    });

    setCart([]);
    alert("Pesanan berhasil!");
  };

  // ⏳ LOADING
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  // 🔐 LOGIN SCREEN
  if (!user) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-green-500 text-white">
        <h1 className="text-2xl mb-4">Pakanku</h1>
        <button onClick={login} className="bg-white text-green-500 px-4 py-2 mb-2">
          Login Demo
        </button>
        <button onClick={register} className="bg-white text-green-500 px-4 py-2">
          Register Demo
        </button>
      </div>
    );
  }

  // 🏠 MAIN APP
  return (
    <div className="p-4 bg-green-100 min-h-screen">
      <h1 className="text-xl font-bold mb-4">Pakanku</h1>

      <button onClick={() => signOut(auth)} className="bg-red-500 text-white px-3 py-1 mb-2">
        Logout
      </button>

      <button onClick={addProduct} className="bg-green-500 text-white px-3 py-1 mb-4">
        Tambah Produk
      </button>

      <div className="grid grid-cols-2 gap-2">
        {products.map((p) => (
          <div key={p.id} className="bg-white p-3 rounded shadow">
            <h3 className="font-bold">{p.name}</h3>
            <p>Rp {p.price}</p>
            <button
              onClick={() => addToCart(p)}
              className="bg-green-500 text-white px-2 mt-2"
            >
              Beli
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={checkout}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2"
      >
        Checkout ({cart.length})
      </button>
    </div>
  );
}
