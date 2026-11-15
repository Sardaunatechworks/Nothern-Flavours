import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cashierService } from '../services/cashierService';
import { useAuth } from '../../../context/AuthContext';

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [error, setError] = useState(null);

  const refreshShift = useCallback(async () => {
    if (!user) {
      setActiveShift(null);
      setLoadingShift(false);
      return null;
    }

    try {
      setLoadingShift(true);
      setError(null);
      const shift = await cashierService.getActiveShift();
      setActiveShift(shift);
      return shift;
    } catch (err) {
      console.error('Error refreshing cashier shift:', err);
      setError(err.message || 'Failed to load active shift');
      return null;
    } finally {
      setLoadingShift(false);
    }
  }, [user]);

  useEffect(() => {
    refreshShift();
  }, [refreshShift]);

  const openShift = async ({ openingCash = 0, notes = '' }) => {
    try {
      const res = await cashierService.openShift({ openingCash, notes });
      await refreshShift();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const closeShift = async ({ closingCash = 0, notes = '' }) => {
    if (!activeShift) throw new Error('No active shift to close');
    try {
      const res = await cashierService.closeShift({
        shiftId: activeShift.id,
        closingCash,
        notes,
      });
      await refreshShift();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const recordCashMovement = async ({ movementType, amount, reason, reference }) => {
    if (!activeShift) throw new Error('No active shift to record cash movement');
    try {
      const res = await cashierService.recordCashMovement({
        shiftId: activeShift.id,
        movementType,
        amount,
        reason,
        reference,
      });
      await refreshShift();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    activeShift,
    isShiftOpen: Boolean(activeShift),
    loadingShift,
    error,
    refreshShift,
    openShift,
    closeShift,
    recordCashMovement,
  };

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    return {
      activeShift: null,
      isShiftOpen: false,
      loadingShift: false,
      error: null,
      refreshShift: async () => null,
      openShift: async () => {},
      closeShift: async () => {},
      recordCashMovement: async () => {},
    };
  }
  return context;
}

