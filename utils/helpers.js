import { Platform, Alert } from 'react-native';

/**
 * Universal alert that works seamlessly on both Mobile and Web browsers.
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message || ''}`);
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

/**
 * Format a number as Indian Rupee currency string.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = parseFloat(amount);
  const absNum = Math.abs(num);
  let formatted;
  if (absNum >= 10000000) {
    formatted = (absNum / 10000000).toFixed(2) + ' Cr';
  } else if (absNum >= 100000) {
    formatted = (absNum / 100000).toFixed(2) + ' L';
  } else {
    formatted = absNum.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return (num < 0 ? '-₹' : '₹') + formatted;
}

/**
 * Format a date object or string to DD/MM/YYYY
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date object or string to DD MMM (short format)
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateShort(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Return the start and end date for a given period relative to today.
 * @param {'daily'|'weekly'|'monthly'} period
 * @returns {{ start: Date, end: Date }}
 */
export function getDateRange(period) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'daily':
      break;
    case 'weekly':
      start.setDate(start.getDate() - 6);
      break;
    case 'monthly':
      start.setDate(start.getDate() - 29);
      break;
    default:
      break;
  }
  return { start, end };
}

/**
 * Return an array of Date objects for the last 7 days (including today).
 * @returns {Date[]}
 */
export function getWeekDays() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

/**
 * Parse a DD/MM/YYYY string back into a Date.
 * @param {string} str
 * @returns {Date}
 */
export function parseDate(str) {
  if (!str) return new Date();
  if (str instanceof Date) return str;
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(d1, d2) {
  const a = d1 instanceof Date ? d1 : new Date(d1);
  const b = d2 instanceof Date ? d2 : new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
