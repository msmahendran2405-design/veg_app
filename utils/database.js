import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import XLSX from 'xlsx';
import { formatDate, parseDate, getDateRange, getWeekDays, isSameDay } from './helpers';

const DB_FILE = FileSystem.documentDirectory ? (FileSystem.documentDirectory + 'vegtrack_data.xlsx') : '';
const WEB_STORAGE_KEY = 'VEGTRACK_EXCEL_DATA';

const SHEETS = {
  STOCK: 'Stock',
  SALES: 'Sales',
  WASTAGE: 'Wastage',
  INVENTORY: 'Inventory',
};

const HEADERS = {
  STOCK: ['ID', 'Date', 'Vegetable', 'Quantity_kg', 'BuyPrice_per_kg', 'SellPrice_per_kg', 'Supplier', 'TotalCost'],
  SALES: ['ID', 'Date', 'Vegetable', 'QtySold_kg', 'SellPrice_per_kg', 'TotalAmount', 'CostPrice_per_kg', 'Profit'],
  WASTAGE: ['ID', 'Date', 'Vegetable', 'WastedQty_kg', 'Reason', 'LossAmount'],
  INVENTORY: ['Vegetable', 'CurrentStock_kg', 'AvgBuyPrice', 'AvgSellPrice', 'LastUpdated'],
};

/**
 * Generate a unique ID using timestamp + random chars
 */
export function generateId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`;
}

/**
 * Create Excel file with all 4 sheets if it does not exist.
 */
export async function initDatabase() {
  try {
    if (Platform.OS === 'web') {
      const existing = await AsyncStorage.getItem(WEB_STORAGE_KEY);
      if (!existing) {
        const wb = XLSX.utils.book_new();
        Object.keys(SHEETS).forEach((key) => {
          const ws = XLSX.utils.aoa_to_sheet([HEADERS[key]]);
          XLSX.utils.book_append_sheet(wb, ws, SHEETS[key]);
        });
        await saveWorkbook(wb);
      }
      return true;
    }

    const info = await FileSystem.getInfoAsync(DB_FILE);
    if (!info.exists) {
      const wb = XLSX.utils.book_new();
      Object.keys(SHEETS).forEach((key) => {
        const ws = XLSX.utils.aoa_to_sheet([HEADERS[key]]);
        XLSX.utils.book_append_sheet(wb, ws, SHEETS[key]);
      });
      await saveWorkbook(wb);
    }
    return true;
  } catch (err) {
    console.error('initDatabase error:', err);
    try {
      const wb = XLSX.utils.book_new();
      Object.keys(SHEETS).forEach((key) => {
        const ws = XLSX.utils.aoa_to_sheet([HEADERS[key]]);
        XLSX.utils.book_append_sheet(wb, ws, SHEETS[key]);
      });
      await saveWorkbook(wb);
    } catch (e) {}
    return true;
  }
}

/**
 * Read the Excel file and return workbook object.
 */
export async function getWorkbook() {
  try {
    if (Platform.OS === 'web') {
      const b64 = await AsyncStorage.getItem(WEB_STORAGE_KEY);
      if (!b64) {
        await initDatabase();
        const fresh = await AsyncStorage.getItem(WEB_STORAGE_KEY);
        return fresh ? XLSX.read(fresh, { type: 'base64' }) : XLSX.utils.book_new();
      }
      return XLSX.read(b64, { type: 'base64' });
    }

    const info = await FileSystem.getInfoAsync(DB_FILE);
    if (!info.exists) {
      await initDatabase();
    }
    const b64 = await FileSystem.readAsStringAsync(DB_FILE, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const wb = XLSX.read(b64, { type: 'base64' });
    return wb;
  } catch (err) {
    console.error('getWorkbook error:', err);
    await initDatabase();
    if (Platform.OS === 'web') {
      const fresh = await AsyncStorage.getItem(WEB_STORAGE_KEY);
      return fresh ? XLSX.read(fresh, { type: 'base64' }) : XLSX.utils.book_new();
    }
    const b64 = await FileSystem.readAsStringAsync(DB_FILE, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return XLSX.read(b64, { type: 'base64' });
  }
}

/**
 * Write workbook back to file or web storage.
 */
export async function saveWorkbook(wb) {
  try {
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(WEB_STORAGE_KEY, wbout);
      return true;
    }
    await FileSystem.writeAsStringAsync(DB_FILE, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return true;
  } catch (err) {
    console.error('saveWorkbook error:', err);
    if (Platform.OS === 'web') {
      try {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        await AsyncStorage.setItem(WEB_STORAGE_KEY, wbout);
        return true;
      } catch (e) {}
    }
    throw err;
  }
}

/**
 * Read a sheet as array of objects (JSON).
 */
function sheetToJSON(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/**
 * Write array of objects back to a sheet (replacing contents).
 */
function jsonToSheet(wb, sheetName, data, headers) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  wb.Sheets[sheetName] = ws;
}

/**
 * Update inventory for a vegetable after stock / sale / wastage changes.
 */
function updateInventory(wb, vegetable) {
  const stocks = sheetToJSON(wb, SHEETS.STOCK);
  const sales = sheetToJSON(wb, SHEETS.SALES);
  const wastage = sheetToJSON(wb, SHEETS.WASTAGE);
  const inventory = sheetToJSON(wb, SHEETS.INVENTORY);

  const vegStocks = stocks.filter((s) => s.Vegetable === vegetable);
  const vegSales = sales.filter((s) => s.Vegetable === vegetable);
  const vegWastage = wastage.filter((w) => w.Vegetable === vegetable);

  const totalBought = vegStocks.reduce((sum, s) => sum + (parseFloat(s.Quantity_kg) || 0), 0);
  const totalSold = vegSales.reduce((sum, s) => sum + (parseFloat(s.QtySold_kg) || 0), 0);
  const totalWasted = vegWastage.reduce((sum, w) => sum + (parseFloat(w.WastedQty_kg) || 0), 0);
  const currentStock = Math.max(0, totalBought - totalSold - totalWasted);

  let avgBuy = 0;
  let avgSell = 0;
  if (vegStocks.length > 0) {
    avgBuy = vegStocks.reduce((sum, s) => sum + (parseFloat(s.BuyPrice_per_kg) || 0), 0) / vegStocks.length;
    avgSell = vegStocks.reduce((sum, s) => sum + (parseFloat(s.SellPrice_per_kg) || 0), 0) / vegStocks.length;
  }

  const idx = inventory.findIndex((inv) => inv.Vegetable === vegetable);
  const entry = {
    Vegetable: vegetable,
    CurrentStock_kg: parseFloat(currentStock.toFixed(2)),
    AvgBuyPrice: parseFloat(avgBuy.toFixed(2)),
    AvgSellPrice: parseFloat(avgSell.toFixed(2)),
    LastUpdated: formatDate(new Date()),
  };
  if (idx >= 0) {
    inventory[idx] = entry;
  } else {
    inventory.push(entry);
  }

  jsonToSheet(wb, SHEETS.INVENTORY, inventory, HEADERS.INVENTORY);
}

/**
 * Add a new stock entry and update inventory.
 */
export async function addStockEntry({ vegetable, quantity, buyPrice, sellPrice, supplier, date }) {
  try {
    const wb = await getWorkbook();
    const data = sheetToJSON(wb, SHEETS.STOCK);

    const qty = parseFloat(quantity);
    const buy = parseFloat(buyPrice);
    const sell = parseFloat(sellPrice);

    const entry = {
      ID: generateId(),
      Date: formatDate(date || new Date()),
      Vegetable: vegetable,
      Quantity_kg: qty,
      BuyPrice_per_kg: buy,
      SellPrice_per_kg: sell,
      Supplier: supplier || '',
      TotalCost: parseFloat((qty * buy).toFixed(2)),
    };

    data.push(entry);
    jsonToSheet(wb, SHEETS.STOCK, data, HEADERS.STOCK);
    updateInventory(wb, vegetable);
    await saveWorkbook(wb);
    return entry;
  } catch (err) {
    console.error('addStockEntry error:', err);
    throw err;
  }
}

/**
 * Add a sale entry and update inventory.
 */
export async function addSaleEntry({ vegetable, quantity, sellPrice, date }) {
  try {
    const wb = await getWorkbook();
    const salesData = sheetToJSON(wb, SHEETS.SALES);
    const inventory = sheetToJSON(wb, SHEETS.INVENTORY);

    const qty = parseFloat(quantity);
    const sell = parseFloat(sellPrice);

    const invItem = inventory.find((i) => i.Vegetable === vegetable);
    const costPrice = invItem ? parseFloat(invItem.AvgBuyPrice) || 0 : 0;

    const entry = {
      ID: generateId(),
      Date: formatDate(date || new Date()),
      Vegetable: vegetable,
      QtySold_kg: qty,
      SellPrice_per_kg: sell,
      TotalAmount: parseFloat((qty * sell).toFixed(2)),
      CostPrice_per_kg: costPrice,
      Profit: parseFloat(((sell - costPrice) * qty).toFixed(2)),
    };

    salesData.push(entry);
    jsonToSheet(wb, SHEETS.SALES, salesData, HEADERS.SALES);
    updateInventory(wb, vegetable);
    await saveWorkbook(wb);
    return entry;
  } catch (err) {
    console.error('addSaleEntry error:', err);
    throw err;
  }
}

/**
 * Add a wastage entry and update inventory.
 */
export async function addWastageEntry({ vegetable, quantity, reason, date }) {
  try {
    const wb = await getWorkbook();
    const wastageData = sheetToJSON(wb, SHEETS.WASTAGE);
    const inventory = sheetToJSON(wb, SHEETS.INVENTORY);

    const qty = parseFloat(quantity);
    const invItem = inventory.find((i) => i.Vegetable === vegetable);
    const costPrice = invItem ? parseFloat(invItem.AvgBuyPrice) || 0 : 0;

    const entry = {
      ID: generateId(),
      Date: formatDate(date || new Date()),
      Vegetable: vegetable,
      WastedQty_kg: qty,
      Reason: reason,
      LossAmount: parseFloat((qty * costPrice).toFixed(2)),
    };

    wastageData.push(entry);
    jsonToSheet(wb, SHEETS.WASTAGE, wastageData, HEADERS.WASTAGE);
    updateInventory(wb, vegetable);
    await saveWorkbook(wb);
    return entry;
  } catch (err) {
    console.error('addWastageEntry error:', err);
    throw err;
  }
}

/**
 * Get stock entries, optionally filtered by date range.
 */
export async function getStockEntries(filter) {
  try {
    const wb = await getWorkbook();
    let data = sheetToJSON(wb, SHEETS.STOCK);
    if (filter && filter.start && filter.end) {
      data = data.filter((row) => {
        const d = parseDate(row.Date);
        return d >= filter.start && d <= filter.end;
      });
    }
    return data;
  } catch (err) {
    console.error('getStockEntries error:', err);
    return [];
  }
}

/**
 * Get sales entries, optionally filtered.
 */
export async function getSalesEntries(filter) {
  try {
    const wb = await getWorkbook();
    let data = sheetToJSON(wb, SHEETS.SALES);
    if (filter && filter.start && filter.end) {
      data = data.filter((row) => {
        const d = parseDate(row.Date);
        return d >= filter.start && d <= filter.end;
      });
    }
    return data;
  } catch (err) {
    console.error('getSalesEntries error:', err);
    return [];
  }
}

/**
 * Get wastage entries, optionally filtered.
 */
export async function getWastageEntries(filter) {
  try {
    const wb = await getWorkbook();
    let data = sheetToJSON(wb, SHEETS.WASTAGE);
    if (filter && filter.start && filter.end) {
      data = data.filter((row) => {
        const d = parseDate(row.Date);
        return d >= filter.start && d <= filter.end;
      });
    }
    return data;
  } catch (err) {
    console.error('getWastageEntries error:', err);
    return [];
  }
}

/**
 * Get current inventory.
 */
export async function getInventory() {
  try {
    const wb = await getWorkbook();
    return sheetToJSON(wb, SHEETS.INVENTORY);
  } catch (err) {
    console.error('getInventory error:', err);
    return [];
  }
}

/**
 * Get dashboard stats for a given date (defaults to today).
 */
export async function getDashboardStats(date) {
  try {
    const targetDate = date || new Date();
    const wb = await getWorkbook();

    const sales = sheetToJSON(wb, SHEETS.SALES);
    const wastage = sheetToJSON(wb, SHEETS.WASTAGE);
    const inventory = sheetToJSON(wb, SHEETS.INVENTORY);

    const todaySales = sales.filter((s) => {
      const d = parseDate(s.Date);
      return isSameDay(d, targetDate);
    });

    const todayWastage = wastage.filter((w) => {
      const d = parseDate(w.Date);
      return isSameDay(d, targetDate);
    });

    const totalSales = todaySales.reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
    const totalWastage = todayWastage.reduce((sum, w) => sum + (parseFloat(w.LossAmount) || 0), 0);
    const totalProfit = todaySales.reduce((sum, s) => sum + (parseFloat(s.Profit) || 0), 0);
    const lowStockItems = inventory.filter((i) => (parseFloat(i.CurrentStock_kg) || 0) > 0 && (parseFloat(i.CurrentStock_kg) || 0) < 5).length;

    // Weekly profit data for chart
    const weekDays = getWeekDays();
    const weeklyProfit = weekDays.map((day) => {
      const daySales = sales.filter((s) => isSameDay(parseDate(s.Date), day));
      const dayProfit = daySales.reduce((sum, s) => sum + (parseFloat(s.Profit) || 0), 0);
      const dayWastage = wastage.filter((w) => isSameDay(parseDate(w.Date), day));
      const dayLoss = dayWastage.reduce((sum, w) => sum + (parseFloat(w.LossAmount) || 0), 0);
      return parseFloat((dayProfit - dayLoss).toFixed(2));
    });

    // Top wastage items
    const wastageByVeg = {};
    wastage.forEach((w) => {
      const veg = w.Vegetable;
      if (!wastageByVeg[veg]) wastageByVeg[veg] = 0;
      wastageByVeg[veg] += parseFloat(w.LossAmount) || 0;
    });
    const topWastage = Object.entries(wastageByVeg)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return {
      totalSales,
      totalWastage,
      totalProfit,
      lowStockItems,
      weeklyProfit,
      weekDays: weekDays.map((d) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      }),
      topWastage,
    };
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return {
      totalSales: 0,
      totalWastage: 0,
      totalProfit: 0,
      lowStockItems: 0,
      weeklyProfit: [0, 0, 0, 0, 0, 0, 0],
      weekDays: ['', '', '', '', '', '', ''],
      topWastage: [],
    };
  }
}

/**
 * Get analysis data for a period: daily, weekly, monthly
 */
export async function getAnalysisData(period) {
  try {
    const { start, end } = getDateRange(period);
    const wb = await getWorkbook();

    const sales = sheetToJSON(wb, SHEETS.SALES).filter((s) => {
      const d = parseDate(s.Date);
      return d >= start && d <= end;
    });
    const wastage = sheetToJSON(wb, SHEETS.WASTAGE).filter((w) => {
      const d = parseDate(w.Date);
      return d >= start && d <= end;
    });
    const stocks = sheetToJSON(wb, SHEETS.STOCK).filter((s) => {
      const d = parseDate(s.Date);
      return d >= start && d <= end;
    });

    const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
    const totalCost = stocks.reduce((sum, s) => sum + (parseFloat(s.TotalCost) || 0), 0);
    const wastageLoss = wastage.reduce((sum, w) => sum + (parseFloat(w.LossAmount) || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (parseFloat(s.Profit) || 0), 0);
    const netProfit = totalProfit - wastageLoss;

    // Daily data points for charts
    const dayCount = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const chartLabels = [];
    const revenueData = [];
    const costData = [];
    const wastageData = [];

    for (let i = dayCount - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      chartLabels.push(`${day.getDate()} ${months[day.getMonth()]}`);

      const dayRev = sales
        .filter((s) => isSameDay(parseDate(s.Date), day))
        .reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
      revenueData.push(dayRev);

      const dayCost = stocks
        .filter((s) => isSameDay(parseDate(s.Date), day))
        .reduce((sum, s) => sum + (parseFloat(s.TotalCost) || 0), 0);
      costData.push(dayCost);

      const dayWaste = wastage
        .filter((w) => isSameDay(parseDate(w.Date), day))
        .reduce((sum, w) => sum + (parseFloat(w.LossAmount) || 0), 0);
      wastageData.push(dayWaste);
    }

    // Most profitable vegetables
    const profitByVeg = {};
    sales.forEach((s) => {
      if (!profitByVeg[s.Vegetable]) profitByVeg[s.Vegetable] = 0;
      profitByVeg[s.Vegetable] += parseFloat(s.Profit) || 0;
    });
    const topProfitable = Object.entries(profitByVeg)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // Most wasted vegetables
    const wasteByVeg = {};
    let totalWasteQty = 0;
    wastage.forEach((w) => {
      const qty = parseFloat(w.WastedQty_kg) || 0;
      if (!wasteByVeg[w.Vegetable]) wasteByVeg[w.Vegetable] = { qty: 0, loss: 0 };
      wasteByVeg[w.Vegetable].qty += qty;
      wasteByVeg[w.Vegetable].loss += parseFloat(w.LossAmount) || 0;
      totalWasteQty += qty;
    });
    const topWasted = Object.entries(wasteByVeg)
      .map(([name, data]) => ({
        name,
        qty: data.qty,
        loss: data.loss,
        percentage: totalWasteQty > 0 ? parseFloat(((data.qty / totalWasteQty) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalRevenue,
      totalCost,
      wastageLoss,
      totalProfit,
      netProfit,
      chartLabels,
      revenueData,
      costData,
      wastageData,
      topProfitable,
      topWasted,
    };
  } catch (err) {
    console.error('getAnalysisData error:', err);
    return {
      totalRevenue: 0,
      totalCost: 0,
      wastageLoss: 0,
      totalProfit: 0,
      netProfit: 0,
      chartLabels: [],
      revenueData: [],
      costData: [],
      wastageData: [],
      topProfitable: [],
      topWasted: [],
    };
  }
}

/**
 * Get wastage breakdown by reason and by vegetable.
 */
export async function getWastageAnalysis() {
  try {
    const wb = await getWorkbook();
    const wastage = sheetToJSON(wb, SHEETS.WASTAGE);

    const byReason = {};
    let totalLoss = 0;
    wastage.forEach((w) => {
      const loss = parseFloat(w.LossAmount) || 0;
      if (!byReason[w.Reason]) byReason[w.Reason] = 0;
      byReason[w.Reason] += loss;
      totalLoss += loss;
    });

    const reasonBreakdown = Object.entries(byReason)
      .map(([reason, loss]) => ({
        reason,
        loss,
        percentage: totalLoss > 0 ? parseFloat(((loss / totalLoss) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.loss - a.loss);

    const byVegetable = {};
    let totalQty = 0;
    wastage.forEach((w) => {
      const qty = parseFloat(w.WastedQty_kg) || 0;
      if (!byVegetable[w.Vegetable]) byVegetable[w.Vegetable] = { qty: 0, loss: 0 };
      byVegetable[w.Vegetable].qty += qty;
      byVegetable[w.Vegetable].loss += parseFloat(w.LossAmount) || 0;
      totalQty += qty;
    });

    const vegetableBreakdown = Object.entries(byVegetable)
      .map(([name, data]) => ({
        name,
        qty: data.qty,
        loss: data.loss,
        percentage: totalQty > 0 ? parseFloat(((data.qty / totalQty) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.qty - a.qty);

    return { reasonBreakdown, vegetableBreakdown, totalLoss };
  } catch (err) {
    console.error('getWastageAnalysis error:', err);
    return { reasonBreakdown: [], vegetableBreakdown: [], totalLoss: 0 };
  }
}

/**
 * Get profit ranking by vegetable.
 */
export async function getProfitByVegetable() {
  try {
    const wb = await getWorkbook();
    const sales = sheetToJSON(wb, SHEETS.SALES);
    const wastage = sheetToJSON(wb, SHEETS.WASTAGE);

    const profitMap = {};
    sales.forEach((s) => {
      if (!profitMap[s.Vegetable]) profitMap[s.Vegetable] = { revenue: 0, profit: 0, wasteLoss: 0 };
      profitMap[s.Vegetable].revenue += parseFloat(s.TotalAmount) || 0;
      profitMap[s.Vegetable].profit += parseFloat(s.Profit) || 0;
    });

    wastage.forEach((w) => {
      if (!profitMap[w.Vegetable]) profitMap[w.Vegetable] = { revenue: 0, profit: 0, wasteLoss: 0 };
      profitMap[w.Vegetable].wasteLoss += parseFloat(w.LossAmount) || 0;
    });

    return Object.entries(profitMap)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        profit: data.profit,
        wasteLoss: data.wasteLoss,
        netProfit: parseFloat((data.profit - data.wasteLoss).toFixed(2)),
      }))
      .sort((a, b) => b.netProfit - a.netProfit);
  } catch (err) {
    console.error('getProfitByVegetable error:', err);
    return [];
  }
}

/**
 * Create a formatted report Excel and share it.
 */
export async function exportReport(period) {
  try {
    const analysis = await getAnalysisData(period);
    const inventory = await getInventory();
    const wastageAnalysis = await getWastageAnalysis();
    const profitByVeg = await getProfitByVegetable();

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['VegTrack Pro - Report'],
      ['Period', period.charAt(0).toUpperCase() + period.slice(1)],
      ['Generated', formatDate(new Date())],
      [],
      ['Profit & Loss Summary'],
      ['Total Revenue', analysis.totalRevenue],
      ['Total Cost', analysis.totalCost],
      ['Wastage Loss', analysis.wastageLoss],
      ['Net Profit', analysis.netProfit],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Inventory sheet
    if (inventory.length > 0) {
      const invSheet = XLSX.utils.json_to_sheet(inventory);
      XLSX.utils.book_append_sheet(wb, invSheet, 'Inventory');
    }

    // Profit by Vegetable
    if (profitByVeg.length > 0) {
      const profitSheet = XLSX.utils.json_to_sheet(profitByVeg);
      XLSX.utils.book_append_sheet(wb, profitSheet, 'Profit by Vegetable');
    }

    // Wastage Analysis
    if (wastageAnalysis.reasonBreakdown.length > 0) {
      const wasteSheet = XLSX.utils.json_to_sheet(wastageAnalysis.reasonBreakdown);
      XLSX.utils.book_append_sheet(wb, wasteSheet, 'Wastage Analysis');
    }

    // Top Profitable
    if (analysis.topProfitable.length > 0) {
      const topSheet = XLSX.utils.json_to_sheet(analysis.topProfitable);
      XLSX.utils.book_append_sheet(wb, topSheet, 'Top Profitable');
    }

    const fileName = `VegTrack_Report_${period}_${Date.now()}.xlsx`;
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    if (Platform.OS === 'web') {
      try {
        const binaryString = window.atob(wbout);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return fileName;
      } catch (e) {
        console.error('Web export error:', e);
      }
    }

    const filePath = (FileSystem.documentDirectory || '') + fileName;
    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export VegTrack Report',
      });
    }

    return filePath;
  } catch (err) {
    console.error('exportReport error:', err);
    throw err;
  }
}

/**
 * Add batch entries (e.g. from NVIDIA AI Vision Scanner or multi-item receipt)
 * @param {Array} items - Array of { vegetable, quantity_kg, price_per_kg, type, reason, date, supplier }
 */
export async function addBatchEntries(items) {
  try {
    const wb = await getWorkbook();
    const stocks = sheetToJSON(wb, SHEETS.STOCK);
    const sales = sheetToJSON(wb, SHEETS.SALES);
    const wastage = sheetToJSON(wb, SHEETS.WASTAGE);
    const inventory = sheetToJSON(wb, SHEETS.INVENTORY);

    const affectedVeggies = new Set();
    const today = formatDate(new Date());

    for (const item of items) {
      const veg = item.vegetable;
      const qty = parseFloat(item.quantity_kg) || 0;
      const price = parseFloat(item.price_per_kg) || 0;
      const entryType = (item.type || 'stock').toLowerCase();
      const entryDate = item.date || today;

      if (!veg || qty <= 0) continue;
      affectedVeggies.add(veg);

      if (entryType === 'stock') {
        const buy = price;
        const sell = item.sell_price_per_kg ? parseFloat(item.sell_price_per_kg) : parseFloat((buy * 1.3).toFixed(2));
        stocks.push({
          ID: generateId(),
          Date: entryDate,
          Vegetable: veg,
          Quantity_kg: qty,
          BuyPrice_per_kg: buy,
          SellPrice_per_kg: sell,
          Supplier: item.supplier || 'Mandi (AI Scanned)',
          TotalCost: parseFloat((qty * buy).toFixed(2)),
        });
      } else if (entryType === 'sale') {
        const invItem = inventory.find((i) => i.Vegetable === veg);
        const costPrice = invItem ? parseFloat(invItem.AvgBuyPrice) || 0 : 0;
        const totalAmount = parseFloat((qty * price).toFixed(2));
        const profit = parseFloat(((price - costPrice) * qty).toFixed(2));
        sales.push({
          ID: generateId(),
          Date: entryDate,
          Vegetable: veg,
          QtySold_kg: qty,
          SellPrice_per_kg: price,
          TotalAmount: totalAmount,
          CostPrice_per_kg: costPrice,
          Profit: profit,
        });
      } else if (entryType === 'wastage') {
        const invItem = inventory.find((i) => i.Vegetable === veg);
        const costPrice = invItem ? parseFloat(invItem.AvgBuyPrice) || 0 : 0;
        wastage.push({
          ID: generateId(),
          Date: entryDate,
          Vegetable: veg,
          WastedQty_kg: qty,
          Reason: item.reason || 'Spoiled/Rotten',
          LossAmount: parseFloat((qty * (price || costPrice)).toFixed(2)),
        });
      }
    }

    jsonToSheet(wb, SHEETS.STOCK, stocks, HEADERS.STOCK);
    jsonToSheet(wb, SHEETS.SALES, sales, HEADERS.SALES);
    jsonToSheet(wb, SHEETS.WASTAGE, wastage, HEADERS.WASTAGE);

    // Update inventory for all affected vegetables
    for (const veg of affectedVeggies) {
      updateInventory(wb, veg);
    }

    await saveWorkbook(wb);
    return { success: true, count: items.length };
  } catch (err) {
    console.error('addBatchEntries error:', err);
    throw err;
  }
}
