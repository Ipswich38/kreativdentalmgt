// Philippine Localization Settings
export const PHILIPPINES_CONFIG = {
  // Currency Configuration
  currency: {
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    position: 'before', // ₱1,234.56
  },

  // Timezone Configuration
  timezone: {
    name: 'Asia/Manila',
    offset: '+08:00',
    abbreviation: 'PHT',
  },

  // Date and Time Formats
  dateFormat: {
    short: 'MM/dd/yyyy', // 12/31/2024
    medium: 'MMM dd, yyyy', // Dec 31, 2024
    long: 'MMMM dd, yyyy', // December 31, 2024
    full: 'EEEE, MMMM dd, yyyy', // Monday, December 31, 2024
  },

  timeFormat: {
    '12hour': 'h:mm a', // 1:30 PM
    '24hour': 'HH:mm', // 13:30
  },

  // Number Formatting
  numberFormat: {
    decimal: '.',
    thousands: ',',
    precision: 2,
  },

  // Regional Settings
  locale: 'en-PH', // English (Philippines)
  country: 'Philippines',
  countryCode: 'PH',

  // Common Philippine Terms
  terms: {
    address: {
      barangay: 'Barangay',
      city: 'City',
      province: 'Province',
      zipCode: 'ZIP Code',
    },
    healthcare: {
      philHealth: 'PhilHealth',
      hmo: 'HMO',
      senior: 'Senior Citizen Discount',
      pwd: 'PWD Discount',
    },
  },
};

// Currency Formatting Utilities
export class CurrencyFormatter {
  static formatPHP(amount: number): string {
    const { symbol, position } = PHILIPPINES_CONFIG.currency;
    const { decimal, thousands, precision } = PHILIPPINES_CONFIG.numberFormat;

    const formattedNumber = amount.toLocaleString('en-PH', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });

    return position === 'before' ? `${symbol}${formattedNumber}` : `${formattedNumber} ${symbol}`;
  }

  static parsePHP(value: string): number {
    // Remove currency symbol and parse
    const cleanValue = value.replace(/[₱,\s]/g, '');
    return parseFloat(cleanValue) || 0;
  }

  static formatCents(cents: number): string {
    return this.formatPHP(cents / 100);
  }
}

// Date and Time Utilities
export class DateTimeFormatter {
  static formatDate(date: Date, format: keyof typeof PHILIPPINES_CONFIG.dateFormat = 'medium'): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: PHILIPPINES_CONFIG.timezone.name,
    };

    switch (format) {
      case 'short':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        break;
      case 'medium':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        break;
      case 'long':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'full':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        options.weekday = 'long';
        break;
    }

    return new Intl.DateTimeFormat(PHILIPPINES_CONFIG.locale, options).format(date);
  }

  static formatTime(date: Date, use24Hour: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: PHILIPPINES_CONFIG.timezone.name,
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24Hour,
    };

    return new Intl.DateTimeFormat(PHILIPPINES_CONFIG.locale, options).format(date);
  }

  static formatDateTime(date: Date, dateFormat: keyof typeof PHILIPPINES_CONFIG.dateFormat = 'medium', use24Hour: boolean = false): string {
    const formattedDate = this.formatDate(date, dateFormat);
    const formattedTime = this.formatTime(date, use24Hour);
    return `${formattedDate} ${formattedTime}`;
  }

  static getCurrentPhilippineTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: PHILIPPINES_CONFIG.timezone.name }));
  }

  static isBusinessHours(date?: Date): boolean {
    const checkDate = date || this.getCurrentPhilippineTime();
    const hour = checkDate.getHours();
    const day = checkDate.getDay();

    // Monday to Friday, 8 AM to 6 PM
    return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
  }
}

// Address Formatting for Philippines
export class AddressFormatter {
  static formatPhilippineAddress(address: {
    street?: string;
    barangay?: string;
    city: string;
    province: string;
    zipCode: string;
  }): string {
    const parts: string[] = [];

    if (address.street) parts.push(address.street);
    if (address.barangay) parts.push(`${PHILIPPINES_CONFIG.terms.address.barangay} ${address.barangay}`);
    parts.push(address.city);
    parts.push(address.province);
    parts.push(address.zipCode);

    return parts.join(', ');
  }

  static parsePhilippineAddress(addressString: string): Partial<{
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  }> {
    // Basic parsing - can be enhanced based on specific needs
    const parts = addressString.split(',').map(part => part.trim());

    return {
      street: parts[0] || '',
      city: parts[parts.length - 3] || '',
      province: parts[parts.length - 2] || '',
      zipCode: parts[parts.length - 1] || '',
    };
  }
}

// Philippine Phone Number Utilities
export class PhoneFormatter {
  static formatPhilippineNumber(number: string): string {
    // Remove all non-numeric characters
    const cleaned = number.replace(/\D/g, '');

    // Handle different Philippine number formats
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
      // Mobile: 09XX-XXX-XXXX
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    if (cleaned.length === 10) {
      // Landline: (02) XXXX-XXXX
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    if (cleaned.length === 7) {
      // Local landline: XXX-XXXX
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }

    return number; // Return original if doesn't match expected patterns
  }

  static validatePhilippineNumber(number: string): boolean {
    const cleaned = number.replace(/\D/g, '');

    // Mobile numbers: 11 digits starting with 09
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
      return true;
    }

    // Landline numbers: 7-10 digits
    if (cleaned.length >= 7 && cleaned.length <= 10) {
      return true;
    }

    return false;
  }
}

// Validation Utilities
export class PhilippineValidators {
  // Basic Philippine ZIP code validation (4-digit)
  static validateZipCode(zipCode: string): boolean {
    return /^\d{4}$/.test(zipCode);
  }

  // Philippine business hours validator
  static isWithinBusinessHours(date?: Date): boolean {
    return DateTimeFormatter.isBusinessHours(date);
  }
}

// Export common functions for easy access
export {
  PHILIPPINES_CONFIG as config,
  CurrencyFormatter as currency,
  DateTimeFormatter as datetime,
  AddressFormatter as address,
  PhoneFormatter as phone,
  PhilippineValidators as validators,
};