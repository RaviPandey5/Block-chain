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
  return formatDistance(dateObj, new Date(), { addSuffix: true });
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