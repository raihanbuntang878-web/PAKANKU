import React, { useState, useEffect } from 'react';
import { 
  Home, Grid, ShoppingCart, ClipboardList, User, Search, 
  Star, ChevronLeft, Plus, Minus, Trash2, Package, 
  CheckCircle, Clock, Truck, ShieldCheck, LogOut, Wallet, 
  MapPin, Store, MessageSquare, Leaf, Edit2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  updateDoc, deleteDoc, onSnapshot, query, orderBy 
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCIS1GZk6x89ITAIAaxaHxg_w00mcv2J-k",
  authDomain: "pakanku-app.firebaseapp.com",
  projectId: "pakanku-app",
  storageBucket: "pakanku-app.firebasestorage.app",
  messagingSenderId: "600847552162",
  appId: "1:600847552162:web:7c2e8b5c4612554ca291fb",
  measurementId: "G-EZMM4VZWD8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const categories = [
  { id: 'c1', name: 'Ayam', icon: '🐔' },
  { id: 'c2', name: 'Ikan', icon: '🐟' },
  { id: 'c3', name: 'Sapi', icon: '🐄' },
  { id: 'c4', name: 'Burung', icon: '🐦' },
  { id: 'c5', name: 'Kucing', icon: '🐱' },
  { id: 'c6', name: 'Lainnya', icon: '🐾' },
];

export default function App() {
  // --- GLOBAL STATE ---
  const [user, setUser] = useState(null); 
  const [authLoading, setAuthLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [activeView, setActiveView] = useState('auth');
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ambil data tambahan (name, role) dari Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() });
          setActiveView('main');
        }
      } else {
        setUser(null);
        setActiveView('auth');
      }
      setAuthLoading(false);
    });

    // 2. Real-time Products Listener
    const qProducts = query(collection(db, "products"), orderBy("timestamp", "desc"));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });

    // 3. Real-time Orders Listener
    const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ords);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  // --- HELPER FUNCTIONS ---
  const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const navigateTo = (view, tab = 'home') => {
    setActiveView(view);
    if (view === 'main') setActiveTab(tab);
  };

  // --- CART FUNCTIONS ---
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('Maaf, stok produk habis!');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          alert('Tidak bisa melebihi stok yang tersedia!');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    alert('Produk ditambahkan ke keranjang!');
  };

  const updateCartQty = (id, delta) => {
    const product = products.find(p => p.id === id);
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > product?.stock) {
          alert('Tidak bisa melebihi stok yang tersedia!');
          return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeCartItem = (id) => setCart(prev => prev.filter(item => item.id !== id));
  const getCartTotal = () => cart.reduce((total, item) => total + (item.price * item.qty), 0);

  // --- ORDER & CHECKOUT FUNCTION ---
  const handleCheckout = async (paymentMethod) => {
    try {
      // 1. Buat pesanan baru di Firestore
      const newOrder = {
        date: new Date().toLocaleDateString('id-ID'),
        timestamp: new Date().getTime(),
        items: [...cart],
        total: getCartTotal() + 15000,
        status: 'Menunggu Pembayaran',
        paymentMethod,
        buyerId: user.id,
        buyerName: user.name
      };
      
      await addDoc(collection(db, "orders"), newOrder);

      // 2. Kurangi stok produk di Firestore secara real-time
      for (const item of cart) {
        const prodRef = doc(db, "products", item.id);
        const prodDoc = await getDoc(prodRef);
        if (prodDoc.exists()) {
          const currentStock = prodDoc.data().stock;
          await updateDoc(prodRef, { stock: currentStock - item.qty });
        }
      }

      setCart([]);
      navigateTo('main', 'orders');
      alert("Pesanan berhasil dibuat!");
    } catch (error) {
      alert("Gagal melakukan checkout: " + error.message);
    }
  };

  // --- VIEWS ---

  const AuthView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'buyer' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        if (isLogin) {
          // Firebase Login
          await signInWithEmailAndPassword(auth, formData.email, formData.password);
        } else {
          // Firebase Register
          if (!formData.name) throw new Error("Nama Lengkap harus diisi!");
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          
          // Simpan data tambahan ke Firestore
          await setDoc(doc(db, "users", userCredential.user.uid), {
            name: formData.name,
            role: formData.role,
            email: formData.email,
            createdAt: new Date().getTime()
          });
        }
      } catch (err) {
        // Format pesan error agar ramah pengguna
        if (err.code === 'auth/email-already-in-use') setError('Email sudah terdaftar!');
        else if (err.code === 'auth/invalid-credential') setError('Email atau password salah!');
        else if (err.code === 'auth/weak-password') setError('Password minimal 6 karakter!');
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (authLoading) return <div className="flex h-full items-center justify-center bg-green-600 text-white font-bold">Memuat Pakanku...</div>;

    return (
      <div className="flex flex-col items-center justify-center h-full bg-green-600 text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-700 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="w-24 h-24 bg-[#FFF8E1] rounded-full flex items-center justify-center mb-4 shadow-lg z-10">
          <Leaf className="text-green-600 w-12 h-12" />
        </div>
        <h1 className="text-4xl font-bold mb-2 z-10">Pakanku</h1>
        <p className="mb-8 text-green-100 text-center z-10">Marketplace Pakan Ternak<br/><span className="text-sm opacity-80">Dari Peternak, Untuk Peternak</span></p>
        
        <div className="w-full max-w-sm space-y-4 bg-[#FFF8E1] p-6 rounded-3xl shadow-2xl text-amber-900 z-10 border border-amber-200">
          <h2 className="font-bold text-center text-xl mb-4">{isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}</h2>
          
          {error && <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm text-center font-bold">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <input 
                type="text" placeholder="Nama Lengkap / Nama Toko" required
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            )}
            <input 
              type="email" placeholder="Email" required
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <input 
              type="password" placeholder="Password (Min. 6 Karakter)" required minLength="6"
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            />
            
            {!isLogin && (
              <div className="flex gap-2 pt-2">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition ${formData.role === 'buyer' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-amber-200 text-amber-700'}`}>
                  <input type="radio" name="role" className="hidden" checked={formData.role === 'buyer'} onChange={() => setFormData({...formData, role: 'buyer'})} />
                  🛒 Pembeli
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition ${formData.role === 'seller' ? 'bg-amber-100 border-amber-600 text-amber-800' : 'bg-white border-amber-200 text-amber-700'}`}>
                  <input type="radio" name="role" className="hidden" checked={formData.role === 'seller'} onChange={() => setFormData({...formData, role: 'seller'})} />
                  🏪 Penjual
                </label>
              </div>
            )}
            
            <button type="submit" disabled={loading} className="w-full bg-green-600 disabled:bg-gray-400 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition shadow-md mt-4">
              {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
            </button>
          </form>

          <p className="text-center text-sm font-bold text-amber-800 mt-4">
            {isLogin ? "Belum punya akun?" : "Sudah punya akun?"} 
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-green-600 font-bold ml-1 hover:underline">
              {isLogin ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>
    );
  };

  const HomeTab = () => (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F4F1EA] pb-20">
      <div className="bg-green-600 p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-xl flex items-center px-4 py-2 shadow-inner">
            <Search size={20} className="text-gray-400" />
            <input type="text" placeholder="Cari pakan ternak..." className="ml-2 w-full outline-none text-sm text-amber-900" />
          </div>
          <button className="bg-green-700 p-2.5 rounded-xl text-white hover:bg-green-800 transition shadow-sm">
            <MessageSquare size={20} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 rounded-2xl h-36 flex items-center p-5 text-white shadow-lg relative overflow-hidden">
          <div className="z-10">
            <h3 className="font-bold text-xl mb-1">Panen Berkah!</h3>
            <p className="text-sm text-amber-100 mb-3">Pakan berkualitas untuk ternak Anda</p>
          </div>
          <Leaf size={100} className="absolute -right-6 -bottom-6 text-amber-600 opacity-40 rotate-12" />
        </div>
      </div>

      <div className="bg-white px-4 py-5 mb-2 grid grid-cols-4 gap-y-6 shadow-sm border-y border-amber-100">
        {categories.slice(0, 8).map(cat => (
          <div key={cat.id} className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition">
            <div className="w-14 h-14 bg-[#FFF8E1] rounded-2xl flex items-center justify-center text-3xl border border-amber-200 shadow-sm">
              {cat.icon}
            </div>
            <span className="text-xs font-bold text-amber-900 text-center">{cat.name}</span>
          </div>
        ))}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2 text-lg">
          <span className="bg-green-600 w-1.5 h-6 rounded-full"></span> Pilihan Peternak
        </h3>
        
        {products.length === 0 ? (
          <div className="text-center py-10 text-amber-700/50 font-bold">Belum ada produk pakan yang dijual.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <div 
                key={product.id} 
                onClick={() => { setSelectedProduct(product); navigateTo('product'); }}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100 cursor-pointer transition-transform relative ${product.stock <= 0 ? 'opacity-70' : 'hover:shadow-md'}`}
              >
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg">Habis Terjual</span>
                  </div>
                )}
                <div className="relative">
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }} />
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} className="fill-yellow-400 text-yellow-400"/> {product.rating || "Baru"}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-bold text-amber-900 line-clamp-2 leading-tight mb-1.5 min-h-[2.5rem]">{product.name}</h4>
                  <p className="text-green-600 font-bold text-base mb-2">{formatRp(product.price)}</p>
                  <div className="flex items-center justify-between text-xs text-amber-700/70 font-bold">
                    <span>Sisa: {product.stock}</span>
                    <span>Terjual {product.sold}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const ProductDetailView = () => {
    if (!selectedProduct) return null;
    const isOutOfStock = selectedProduct.stock <= 0;

    return (
      <div className="flex flex-col h-full bg-[#F4F1EA]">
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button onClick={() => navigateTo('main')} className="bg-black/40 p-2.5 rounded-full text-white backdrop-blur-md shadow-lg hover:bg-black/60 transition">
            <ChevronLeft size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="relative">
            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full aspect-square object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }} />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-red-600 text-white font-bold px-6 py-2 rounded-full text-lg shadow-2xl border-2 border-white/20">STOK HABIS</span>
              </div>
            )}
          </div>
          
          <div className="bg-white p-5 mb-2 shadow-sm border-b border-amber-100 rounded-b-3xl">
            <div className="text-green-600 font-bold text-3xl mb-2">{formatRp(selectedProduct.price)}</div>
            <h1 className="text-xl text-amber-900 font-bold leading-snug mb-4">{selectedProduct.name}</h1>
            <div className="flex items-center gap-4 text-sm font-bold text-amber-700/80">
              <span className="flex items-center gap-1.5"><Star size={18} className="text-yellow-400 fill-yellow-400" /> {selectedProduct.rating || 0}</span>
              <span className="w-1 h-1 rounded-full bg-amber-200"></span>
              <span>Terjual {selectedProduct.sold || 0}</span>
              <span className="w-1 h-1 rounded-full bg-amber-200"></span>
              <span className={isOutOfStock ? 'text-red-500 font-bold' : ''}>Stok: {selectedProduct.stock}</span>
            </div>
          </div>

          <div className="bg-white p-4 mb-2 flex items-center gap-4 shadow-sm border-y border-amber-100">
            <div className="w-14 h-14 bg-[#FFF8E1] border border-amber-200 rounded-full flex items-center justify-center shadow-inner">
              <Store size={28} className="text-amber-800" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-lg">{selectedProduct.seller}</h3>
              <p className="text-xs font-bold text-amber-700/70 flex items-center gap-1 mt-0.5"><MapPin size={12}/> Peternakan Lokal</p>
            </div>
          </div>

          <div className="bg-white p-5 shadow-sm border-t border-amber-100">
            <h3 className="font-bold text-amber-900 mb-3 text-lg">Deskripsi Pakan</h3>
            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line font-medium">{selectedProduct.desc}</p>
          </div>
        </div>

        <div className="bg-white border-t border-amber-100 p-3 flex gap-2 fixed bottom-0 w-full max-w-md shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)] z-30">
          <button 
            disabled={isOutOfStock}
            onClick={() => addToCart(selectedProduct)}
            className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition border-2 ${isOutOfStock ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
            <ShoppingCart size={20} /> Keranjang
          </button>
          <button 
            disabled={isOutOfStock}
            onClick={() => { addToCart(selectedProduct); if(!isOutOfStock) navigateTo('main', 'cart'); }}
            className={`flex-1 font-bold py-3.5 rounded-xl shadow-md transition ${isOutOfStock ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
            Beli Sekarang
          </button>
        </div>
      </div>
    );
  };

  const CartTab = () => (
    <div className="flex flex-col h-full bg-[#F4F1EA]">
      <div className="bg-white p-4 text-center font-bold text-lg text-amber-900 border-b border-amber-100 sticky top-0 z-10 shadow-sm">Keranjang Belanja</div>
      
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-amber-700/50 gap-4 mt-24">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner border border-amber-100">
              <ShoppingCart size={48} className="text-amber-200" />
            </div>
            <p className="font-bold text-lg">Keranjang masih kosong</p>
            <button onClick={() => setActiveTab('home')} className="mt-2 px-8 py-3 bg-green-600 text-white rounded-full font-bold shadow-md hover:bg-green-700 transition">Beli Pakan Dulu</button>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map(item => {
              const productData = products.find(p => p.id === item.id);
              const isExceeding = item.qty > (productData?.stock || 0);

              return (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex gap-4">
                  <img src={item.image} alt={item.name} className="w-24 h-24 rounded-xl object-cover border border-amber-50" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }}/>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 line-clamp-2 leading-tight mb-1">{item.name}</h4>
                      <p className="text-green-600 font-bold text-base">{formatRp(item.price)}</p>
                    </div>
                    {isExceeding && <p className="text-xs font-bold text-red-500 mt-1">Stok sisa {productData?.stock || 0}!</p>}
                    <div className="flex items-center justify-between mt-2">
                      <button onClick={() => removeCartItem(item.id)} className="text-amber-300 hover:text-red-500 transition"><Trash2 size={20} /></button>
                      <div className="flex items-center gap-3 bg-[#FFF8E1] border border-amber-200 rounded-lg px-2 py-1 shadow-inner">
                        <button onClick={() => updateCartQty(item.id, -1)} className="text-amber-800 p-1 hover:bg-amber-100 rounded-md transition"><Minus size={16} /></button>
                        <span className="text-sm font-bold w-6 text-center text-amber-900">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="text-amber-800 p-1 hover:bg-amber-100 rounded-md transition"><Plus size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="bg-white border-t border-amber-100 p-4 pb-20 fixed bottom-0 w-full max-w-md flex items-center justify-between shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)] z-20">
          <div>
            <p className="text-xs font-bold text-amber-700/70 mb-0.5">Total Harga</p>
            <p className="text-xl font-bold text-green-600">{formatRp(getCartTotal())}</p>
          </div>
          <button 
            onClick={() => navigateTo('checkout')}
            disabled={cart.some(item => item.qty > (products.find(p=>p.id===item.id)?.stock || 0))}
            className="bg-green-600 disabled:bg-gray-400 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-green-700 transition">
            Checkout ({cart.reduce((a,b)=>a+b.qty,0)})
          </button>
        </div>
      )}
    </div>
  );

  const CheckoutView = () => {
    const [method, setMethod] = useState('Transfer Bank');
    const [isProcessing, setIsProcessing] = useState(false);
    const subtotal = getCartTotal();
    const ongkir = 15000;
    const total = subtotal + ongkir;

    return (
      <div className="flex flex-col h-full bg-[#F4F1EA]">
        <div className="bg-white p-4 flex items-center gap-3 border-b border-amber-100 sticky top-0 z-10 shadow-sm">
          <button onClick={() => navigateTo('main', 'cart')} className="text-amber-900"><ChevronLeft size={24} /></button>
          <h1 className="font-bold text-lg text-amber-900">Checkout</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
          <div className="bg-white p-5 mb-2 shadow-sm border-b border-amber-100">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3"><MapPin size={20} className="text-green-600" /> Alamat Kandang / Rumah</h3>
            <div className="bg-[#FFF8E1] p-4 rounded-xl border border-amber-200">
              <p className="text-sm font-bold text-amber-900 mb-1">{user?.name}</p>
              <p className="text-xs font-bold text-amber-800 leading-relaxed">Jl. Peternakan No. 123, Desa Makmur, Kab. Pertanian</p>
            </div>
          </div>

          <div className="bg-white p-5 mb-2 shadow-sm border-y border-amber-100">
            <h3 className="font-bold text-amber-900 mb-4 text-lg">Pesanan Pakan</h3>
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 mb-4 border-b border-amber-100 pb-4 last:border-0 last:pb-0">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-amber-50 shadow-sm" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }}/>
                <div className="flex-1 flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-amber-900 line-clamp-1 mb-1">{item.name}</h4>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-amber-700/70">{item.qty} x {formatRp(item.price)}</p>
                    <p className="text-sm font-bold text-amber-900">{formatRp(item.qty * item.price)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-5 mb-2 shadow-sm border-y border-amber-100">
            <h3 className="font-bold text-amber-900 mb-4 text-lg">Metode Pembayaran</h3>
            <div className="space-y-3">
              {['Transfer Bank', 'COD (Bayar di Tempat)', 'E-Wallet (OVO/Dana)'].map(m => (
                <label key={m} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition shadow-sm ${method === m ? 'border-green-600 bg-green-50' : 'border-amber-100 bg-white hover:border-amber-300'}`}>
                  <input type="radio" name="payment" checked={method === m} onChange={() => setMethod(m)} className="text-green-600 focus:ring-green-600 w-4 h-4 accent-green-600" />
                  <span className={`text-sm font-bold ${method === m ? 'text-green-800' : 'text-amber-900'}`}>{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-amber-100 p-4 fixed bottom-0 w-full max-w-md flex items-center justify-between shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)] z-20">
          <div>
            <p className="text-xs font-bold text-amber-700/70 mb-0.5">Total Pembayaran</p>
            <p className="text-xl font-bold text-green-600">{formatRp(total)}</p>
          </div>
          <button 
            disabled={isProcessing}
            onClick={async () => { setIsProcessing(true); await handleCheckout(method); setIsProcessing(false); }} 
            className="bg-green-600 text-white disabled:bg-gray-400 px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-green-700 transition">
            {isProcessing ? 'Memproses...' : 'Buat Pesanan'}
          </button>
        </div>
      </div>
    );
  };

  const OrdersTab = () => {
    const [statusFilter, setStatusFilter] = useState('Semua');
    const statuses = ['Semua', 'Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai'];

    // Filter cerdas: Buyer lihat belanjaannya, Seller lihat pesanan produknya
    const userOrders = orders.filter(o => {
      if (user?.role === 'buyer') return o.buyerId === user.id;
      if (user?.role === 'seller') return o.items.some(item => item.sellerId === user.id);
      return false;
    });

    const filteredOrders = statusFilter === 'Semua' ? userOrders : userOrders.filter(o => o.status === statusFilter);

    return (
      <div className="flex flex-col h-full bg-[#F4F1EA]">
        <div className="bg-white p-4 text-center font-bold text-lg text-amber-900 border-b border-amber-100 sticky top-0 z-20 shadow-sm">Pesanan</div>
        
        <div className="bg-white border-b border-amber-100 flex overflow-x-auto hide-scrollbar sticky top-[60px] z-10 shadow-sm">
          {statuses.map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`whitespace-nowrap px-5 py-3.5 text-sm font-bold border-b-4 transition ${statusFilter === status ? 'border-green-600 text-green-600' : 'border-transparent text-amber-700/60 hover:text-amber-900'}`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center text-amber-700/50 mt-16 font-bold">Belum ada pesanan di kategori ini.</div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-amber-100/60">
                  <div className="flex items-center gap-2">
                    <Store size={18} className="text-amber-800" />
                    <span className="font-bold text-sm text-amber-900">{user?.role === 'seller' ? `Pembeli: ${order.buyerName}` : (order.items[0]?.seller || 'Toko Pakan')}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wide ${
                    order.status === 'Selesai' ? 'bg-green-100 text-green-700 border border-green-200' : 
                    order.status === 'Menunggu Pembayaran' ? 'bg-red-100 text-red-700 border border-red-200' : 
                    'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 mb-3 last:mb-0">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-amber-50" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }}/>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900 line-clamp-1 mb-1">{item.name}</h4>
                      <p className="text-xs font-bold text-amber-700/70">{item.qty} karung/pack x {formatRp(item.price)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 border-t border-amber-100/60 mt-4">
                  <p className="text-xs font-bold text-amber-700/80">Total Pesanan</p>
                  <p className="font-bold text-green-600 text-lg">{formatRp(order.total)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const AccountTab = () => (
    <div className="flex flex-col h-full bg-[#F4F1EA] pb-20 overflow-y-auto">
      <div className="bg-green-600 p-6 pt-10 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-[#FFF8E1] rounded-full flex items-center justify-center text-green-600 overflow-hidden border-4 border-green-500 shadow-inner">
            <User size={40} />
          </div>
          <div>
            <h2 className="font-bold text-2xl mb-1">{user?.name}</h2>
            <p className="text-sm font-bold text-green-100 mb-1">{user?.email}</p>
            <span className="text-[10px] bg-green-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{user?.role === 'seller' ? 'Mitra Penjual' : 'Pembeli'}</span>
          </div>
        </div>
      </div>

      {user?.role === 'seller' && (
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 p-5 mb-2 shadow-sm cursor-pointer hover:opacity-95 transition mx-4 mt-6 rounded-2xl relative overflow-hidden" onClick={() => navigateTo('seller_dashboard')}>
          <Leaf size={60} className="absolute -right-2 -bottom-2 text-white opacity-10" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Store className="text-white" size={28} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg mb-0.5">Toko Saya</h3>
                <p className="text-xs text-amber-100/80 font-bold">Masuk Dashboard Penjual</p>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-white/50" />
          </div>
        </div>
      )}

      <div className="bg-white mt-6 shadow-sm border-y border-amber-100 mx-4 rounded-2xl overflow-hidden">
        <div 
          className="p-4 flex items-center justify-between text-red-600 hover:bg-red-50 cursor-pointer transition"
          onClick={async () => { await signOut(auth); }}>
          <div className="flex items-center gap-3 font-bold"><LogOut size={20} /> Keluar Akun</div>
        </div>
      </div>
    </div>
  );

  const SellerDashboardView = () => {
    const [viewMode, setViewMode] = useState('list');
    const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'Ayam', desc: '', image: '' });
    const [editId, setEditId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Filter produk khusus untuk penjual ini
    const myProducts = products.filter(p => p.sellerId === user.id);

    const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        if (viewMode === 'add') {
          const newProduct = {
            ...formData,
            sellerId: user.id,
            seller: user.name,
            price: parseInt(formData.price),
            stock: parseInt(formData.stock),
            rating: 0, 
            sold: 0,
            timestamp: new Date().getTime()
          };
          await addDoc(collection(db, "products"), newProduct);
        } else {
          const prodRef = doc(db, "products", editId);
          await updateDoc(prodRef, { 
            ...formData, 
            price: parseInt(formData.price), 
            stock: parseInt(formData.stock) 
          });
        }
        setViewMode('list');
      } catch (error) {
        alert("Gagal menyimpan produk: " + error.message);
      } finally {
        setIsSaving(false);
      }
    };

    const handleEdit = (prod) => {
      setFormData({
        name: prod.name, price: prod.price, stock: prod.stock, 
        category: prod.category, desc: prod.desc, image: prod.image
      });
      setEditId(prod.id);
      setViewMode('edit');
    };

    const handleDelete = async (id) => {
      if(confirm('Yakin hapus produk ini?')) {
        try {
          await deleteDoc(doc(db, "products", id));
        } catch(err) {
          alert("Gagal menghapus produk: " + err.message);
        }
      }
    };

    if (viewMode !== 'list') {
      return (
        <div className="flex flex-col h-full bg-[#F4F1EA]">
          <div className="bg-amber-900 p-4 flex items-center gap-3 text-white sticky top-0 z-10 shadow-md">
            <button onClick={() => setViewMode('list')}><ChevronLeft size={24} /></button>
            <h1 className="font-bold text-lg">{viewMode === 'add' ? 'Tambah Produk' : 'Edit Produk'}</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-20">
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div><label className="text-sm font-bold text-amber-900">Nama Pakan</label>
              <input required type="text" className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/></div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="text-sm font-bold text-amber-900">Harga (Rp)</label>
                <input required type="number" min="0" className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})}/></div>
                <div className="flex-1"><label className="text-sm font-bold text-amber-900">Stok</label>
                <input required type="number" min="0" className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white" value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})}/></div>
              </div>
              <div><label className="text-sm font-bold text-amber-900">Kategori</label>
                <select className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white font-bold" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-bold text-amber-900">URL Gambar (Link Web)</label>
              <input required type="url" className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white text-xs" placeholder="https://..." value={formData.image} onChange={e=>setFormData({...formData, image: e.target.value})}/></div>
              <div><label className="text-sm font-bold text-amber-900">Deskripsi Lengkap</label>
              <textarea required rows="4" className="w-full mt-1 p-3 rounded-xl border border-amber-200 bg-white" value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})}/></div>
              <button type="submit" disabled={isSaving} className="w-full bg-green-600 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl shadow mt-6">
                {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-[#F4F1EA]">
        <div className="bg-amber-900 p-4 flex items-center gap-3 text-white sticky top-0 z-10 shadow-md">
          <button onClick={() => navigateTo('main', 'account')}><ChevronLeft size={24} /></button>
          <h1 className="font-bold text-lg">Dashboard Penjual</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-green-600">
              <p className="text-sm font-bold text-amber-700/60 mb-1">Katalog Anda</p>
              <p className="text-3xl font-bold text-amber-900">{myProducts.length} <span className="text-sm">Produk</span></p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-amber-600">
              <p className="text-sm font-bold text-amber-700/60 mb-1">Pesanan Toko</p>
              <p className="text-3xl font-bold text-amber-900">{orders.filter(o => o.items.some(item => item.sellerId === user.id)).length}</p>
            </div>
          </div>

          <button 
            onClick={() => { setFormData({name:'', price:'', stock:'', category:'Ayam', desc:'', image:''}); setViewMode('add'); }}
            className="w-full bg-[#FFF8E1] border-2 border-green-600 text-green-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border-dashed hover:bg-green-50 transition shadow-sm">
            <Plus size={20} /> Tambah Pakan Ke Etalase
          </button>

          <div>
            <h3 className="font-bold text-amber-900 mb-4 text-lg">Etalase Toko</h3>
            {myProducts.length === 0 ? (
              <p className="text-center text-amber-700/50 mt-10 font-bold">Toko masih kosong. Tambahkan pakan pertama Anda!</p>
            ) : (
              myProducts.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 mb-3 flex gap-4">
                  <img src={p.image} alt={p.name} className="w-20 h-20 rounded-xl object-cover border border-amber-50" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&q=80&w=300&h=300" }} />
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 line-clamp-1">{p.name}</h4>
                      <p className="text-green-600 font-bold text-sm mt-0.5">{formatRp(p.price)}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs font-bold px-2 py-1 rounded ${p.stock > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>Stok: {p.stock}</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const BottomNav = () => (
    <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-amber-100 flex justify-around items-center h-[70px] text-[11px] font-bold text-amber-700/50 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)] z-40 rounded-t-2xl">
      <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-green-600' : 'hover:text-amber-800'}`}>
        <Home size={24} className={activeTab === 'home' ? 'fill-green-100/50' : ''} /> Beranda
      </button>
      <button onClick={() => setActiveTab('categories')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'categories' ? 'text-green-600' : 'hover:text-amber-800'}`}>
        <Grid size={24} className={activeTab === 'categories' ? 'fill-green-100/50' : ''} /> Kategori
      </button>
      <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center gap-1 relative transition-colors ${activeTab === 'cart' ? 'text-green-600' : 'hover:text-amber-800'}`}>
        <div className="relative">
          <ShoppingCart size={24} className={activeTab === 'cart' ? 'fill-green-100/50' : ''} />
          {cart.length > 0 && <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cart.reduce((a,b)=>a+b.qty,0)}</span>}
        </div>
        Keranjang
      </button>
      <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'orders' ? 'text-green-600' : 'hover:text-amber-800'}`}>
        <ClipboardList size={24} className={activeTab === 'orders' ? 'fill-green-100/50' : ''} /> Pesanan
      </button>
      <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'account' ? 'text-green-600' : 'hover:text-amber-800'}`}>
        <User size={24} className={activeTab === 'account' ? 'fill-green-100/50' : ''} /> Akun
      </button>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#D7CCC8] font-sans">
      <div className="w-full max-w-md h-screen sm:h-[850px] bg-white relative flex flex-col sm:rounded-[2.5rem] sm:border-[10px] border-amber-900 shadow-2xl overflow-hidden">
        {activeView === 'auth' && <AuthView />}
        {activeView === 'product' && <ProductDetailView />}
        {activeView === 'checkout' && <CheckoutView />}
        {activeView === 'seller_dashboard' && <SellerDashboardView />}
        
        {activeView === 'main' && (
          <>
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'categories' && <HomeTab />}
            {activeTab === 'cart' && <CartTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'account' && <AccountTab />}
            <BottomNav />
          </>
        )}
      </div>
    </div>
  );
}
