import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRegNumber(value: string): string {
  // EU - CC - CCC - DD - NNN
  const raw = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  let formatted = '';
  
  if (raw.length > 0) {
    formatted = 'EU';
    if (raw.length > 2) {
      const cc = raw.substring(2, 4);
      if (cc) formatted += ` - ${cc}`;
      if (raw.length > 4) {
        const ccc = raw.substring(4, 7);
        if (ccc) formatted += ` - ${ccc}`;
        if (raw.length > 7) {
          const dd = raw.substring(7, 9);
          if (dd) formatted += ` - ${dd}`;
          if (raw.length > 9) {
            const nnn = raw.substring(9, 12);
            if (nnn) formatted += ` - ${nnn}`;
          }
        }
      }
    }
  }
  return formatted;
}

export function validateRegNumber(value: string): boolean {
  return /^EU - [A-Z]{2} - [A-Z]{3} - \d{2} - \d{3}$/.test(value);
}

export function generateLotteryNumber(): string {
  const getRandom = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `${getRandom()} ${getRandom()} ${getRandom()}`;
}

export const ADMIN_REG_NUMBER = "EU - AD - ADM - 01 - 001";
