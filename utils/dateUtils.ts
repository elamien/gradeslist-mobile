/**
 * Formats a date to M/D h:mmA format (e.g., "7/15 11:59PM")
 * Always shows the date and time in this format regardless of relative time
 */
export function formatDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  let hours = targetDate.getHours();
  const minutes = targetDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${month}/${day} ${hours}:${minutesStr}${ampm}`;
}