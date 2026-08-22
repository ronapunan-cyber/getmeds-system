/**
 * Utility functions for formatting timestamps in Philippine Standard Time (PHT, UTC+8).
 */

export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    let s = dateInput.trim();
    // Handle SQL format: "YYYY-MM-DD HH:MM:SS" -> treat as UTC ISO
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(s)) {
      s = s + 'Z';
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date string in Philippine Time (Asia/Manila, UTC+8).
 * Example output: "Aug 22, 2026 2:56 PM" or "Aug 22, 2:56 PM"
 */
export function formatPHT(dateInput, formatType = 'datetime') {
  const d = parseDate(dateInput);
  if (!d) return dateInput || '—';

  const timeZone = 'Asia/Manila';

  if (formatType === 'timeline' || formatType === 'short-datetime') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  }

  if (formatType === 'date') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  }

  if (formatType === 'time') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  }

  // default 'datetime': "Aug 22, 2026 2:56 PM"
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}
