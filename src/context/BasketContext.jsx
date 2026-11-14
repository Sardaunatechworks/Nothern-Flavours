import React, { createContext, useContext, useState, useEffect } from 'react';

const BasketContext = createContext(null);

export function BasketProvider({ children }) {
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem('nf_shopping_basket');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isBasketOpen, setIsBasketOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('nf_shopping_basket', JSON.stringify(basket));
    } catch (e) {
      console.error('Failed to persist basket to localStorage', e);
    }
  }, [basket]);

  const addToBasket = (product, qtyToAdd = 1) => {
    setBasket((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image_url: product.image_url,
          quantity: qtyToAdd,
        },
      ];
    });
    setIsBasketOpen(true);
  };

  const removeFromBasket = (productId) => {
    setBasket((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromBasket(productId);
      return;
    }
    setBasket((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const clearBasket = () => {
    setBasket([]);
    localStorage.removeItem('nf_shopping_basket');
  };

  const totalItems = basket.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <BasketContext.Provider
      value={{
        basket,
        addToBasket,
        removeFromBasket,
        updateQuantity,
        clearBasket,
        totalItems,
        subtotal,
        isBasketOpen,
        setIsBasketOpen,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
}
