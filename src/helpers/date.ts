import { format, formatDistance, formatRelative } from 'date-fns';

/**
 * Format a date string or timestamp into a human-readable date format
 */
export function formatDate(date: string | number | Date): string {
  const dateObj = new Date(date);
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format a date string or timestamp into a relative time (e.g., "2 hours ago")
 */
export function formatRelativeDate(date: string | number | Date): string {
  const dateObj = new Date(date);
  // Get the formatted string from date-fns
  const formatted = formatDistance(dateObj, new Date(), { addSuffix: true });
  
  // Replace spaces between numbers and units with non-breaking spaces
  // This prevents awkward line breaks on mobile (e.g. "3" on one line and "days ago" on the next)
  return formatted.replace(/(\d+)\s+([a-z]+)/gi, '$1\u00A0$2');
}

/**
 * Format a date string or timestamp into a time string
 */
export function formatTime(date: string | number | Date): string {
  const dateObj = new Date(date);
  return format(dateObj, 'h:mm a');
}

/**
 * Format a timestamp into a full date and time string
 */
export function formatDateTime(date: string | number | Date): string {
  const dateObj = new Date(date);
  return format(dateObj, 'MMM d, yyyy h:mm a');
} 