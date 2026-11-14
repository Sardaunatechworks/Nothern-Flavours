import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/home/HeroSection';
import RestaurantInfo from '../components/home/RestaurantInfo';
import MenuCatalog from '../components/menu/MenuCatalog';
import BasketDrawer from '../components/basket/BasketDrawer';
import Footer from '../components/layout/Footer';
import { menuService } from '../services/menuService';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const [cats, prods] = await Promise.all([
          menuService.getCategories(),
          menuService.getProducts(),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Failed to load menu data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  const handleExploreClick = () => {
    if (menuRef.current) {
      menuRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <Navbar />

      <main className="flex-1">
        <HeroSection onExploreClick={handleExploreClick} />
        <RestaurantInfo />

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-forest-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs uppercase font-bold tracking-widest text-stone-500">
              Loading Northern Flavors Menu...
            </p>
          </div>
        ) : (
          <MenuCatalog
            categories={categories}
            products={products}
            menuRef={menuRef}
          />
        )}
      </main>

      <BasketDrawer />
      <Footer />
    </div>
  );
}

