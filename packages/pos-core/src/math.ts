import { CartLineItem, TaxProfile, BillTotals } from './types';

/**
 * Rounds a number strictly to two decimal places
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item line total including modifiers, discounts, and taxes
 */
export function calculateLineItemTotal(
  unitPrice: number,
  qty: number,
  modifiers: { priceDelta: number; qty: number }[] = [],
  discountPercent = 0,
  taxRate = 5
): {
  modifiersTotal: number;
  discount: number;
  taxableValue: number;
  taxAmount: number;
  lineTotal: number;
} {
  const modsTotal = modifiers.reduce((acc, m) => acc + m.priceDelta * m.qty, 0);
  const baseTotal = (unitPrice + modsTotal) * qty;
  const discount = round2((baseTotal * discountPercent) / 100);
  const taxableValue = round2(baseTotal - discount);
  const taxAmount = round2((taxableValue * taxRate) / 100);
  const lineTotal = round2(taxableValue + taxAmount);

  return {
    modifiersTotal: round2(modsTotal * qty),
    discount,
    taxableValue,
    taxAmount,
    lineTotal,
  };
}

/**
 * Computes full order bill totals with CGST, SGST, IGST and Indian currency round-off
 */
export function computeOrderTotals(
  items: CartLineItem[],
  taxProfile: TaxProfile,
  orderDiscountPercent = 0,
  serviceChargePercent = 0
): BillTotals {
  let subtotal = 0;
  let itemsDiscount = 0;

  for (const item of items) {
    if (item.isVoid) continue;
    const baseLine = (item.unitPrice + (item.modifiersTotal / (item.qty || 1))) * item.qty;
    subtotal += baseLine;
    itemsDiscount += item.discount;
  }

  subtotal = round2(subtotal);
  itemsDiscount = round2(itemsDiscount);

  // Apply overall order-level discount if any
  const overallDiscount = round2((subtotal * orderDiscountPercent) / 100);
  const totalDiscount = round2(itemsDiscount + overallDiscount);

  // Net taxable subtotal
  const taxableAfterDiscount = Math.max(0, round2(subtotal - totalDiscount));

  // Service charge
  const serviceCharge = round2((taxableAfterDiscount * serviceChargePercent) / 100);

  const taxableValue = round2(taxableAfterDiscount + serviceCharge);

  // Determine GST: Intra-state (CGST + SGST) vs Inter-state (IGST)
  const isIntraState =
    !taxProfile.customerStateCode ||
    taxProfile.outletStateCode === taxProfile.customerStateCode;

  const gstRate = taxProfile.defaultGstRate || 5;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isIntraState) {
    const halfRate = gstRate / 2;
    cgst = round2((taxableValue * halfRate) / 100);
    sgst = round2((taxableValue * halfRate) / 100);
  } else {
    igst = round2((taxableValue * gstRate) / 100);
  }

  const rawGrandTotal = round2(taxableValue + cgst + sgst + igst);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = round2(grandTotal - rawGrandTotal);

  return {
    subtotal,
    discountTotal: totalDiscount,
    serviceCharge,
    taxableValue,
    cgst,
    sgst,
    igst,
    roundOff,
    grandTotal,
  };
}

