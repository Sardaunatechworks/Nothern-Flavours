/**
 * Reusable Calculation Utilities for Point of Sale & Customer Orders
 */

export const posCalculations = {
  /**
   * Calculate cart food items subtotal
   */
  calculateSubtotal(items = []) {
    return items.reduce((sum, item) => {
      const price = Number(item.price || item.unit_price || 0);
      const qty = Number(item.quantity || 0);
      return sum + price * qty;
    }, 0);
  },

  /**
   * Calculate total number of food item units in cart
   */
  calculateTotalItemsCount(items = []) {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  },

  /**
   * Calculate takeaway packaging fee based on order type and configuration
   * @param {string} orderType - 'dine_in' | 'takeaway' | 'delivery'
   * @param {Array} items - Cart items
   * @param {Object} settings - Restaurant settings with packaging config
   */
  calculatePackagingFee(orderType, items = [], settings = {}) {
    if (orderType !== 'takeaway') {
      return 0;
    }

    if (settings.takeaway_packaging_enabled === false) {
      return 0;
    }

    const baseFee = Number(settings.takeaway_packaging_fee ?? 500);
    const model = settings.takeaway_packaging_model || 'order';

    if (model === 'item') {
      const totalUnits = this.calculateTotalItemsCount(items);
      return baseFee * totalUnits;
    }

    // Default: 'order' (fixed fee per takeaway order)
    return baseFee;
  },

  /**
   * Calculate final grand total payable
   */
  calculateGrandTotal({ subtotal = 0, packagingFee = 0, deliveryFee = 0, discount = 0, tax = 0 }) {
    const total =
      Number(subtotal) +
      Number(packagingFee) +
      Number(deliveryFee) +
      Number(tax) -
      Number(discount);
    return Math.max(0, total);
  },

  /**
   * Calculate change due for cash transactions
   */
  calculateChangeDue(amountTendered, totalPayable) {
    const tendered = Number(amountTendered || 0);
    const total = Number(totalPayable || 0);
    return tendered > total ? tendered - total : 0;
  },

  /**
   * Validate split payment coverage
   */
  validatePaymentCoverage(payments = [], totalPayable) {
    const paidSum = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const diff = Number(totalPayable) - paidSum;
    return {
      totalPaid: paidSum,
      isFullyCovered: paidSum >= Number(totalPayable),
      remainingBalance: Math.max(0, diff),
    };
  },
};

