// Utility to convert numbers into French words for Moroccan legal deeds & contracts

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];
const PARTICULIERS: Record<number, string> = {
    11: 'onze',
    12: 'douze',
    13: 'treize',
    14: 'quatorze',
    15: 'quinze',
    16: 'seize',
    71: 'soixante-et-onze',
    72: 'soixante-douze',
    73: 'soixante-treize',
    74: 'soixante-quatorze',
    75: 'soixante-quinze',
    76: 'soixante-seize',
    77: 'soixante-dix-sept',
    78: 'soixante-dix-huit',
    79: 'soixante-dix-neuf',
    81: 'quatre-vingt-un',
    91: 'quatre-vingt-onze',
    92: 'quatre-vingt-douze',
    93: 'quatre-vingt-treize',
    94: 'quatre-vingt-quatorze',
    95: 'quatre-vingt-quinze',
    96: 'quatre-vingt-seize',
    97: 'quatre-vingt-dix-sept',
    98: 'quatre-vingt-dix-huit',
    99: 'quatre-vingt-dix-neuf',
};

function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    let result = '';

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
        if (hundreds === 1) {
            result += 'cent ';
        } else {
            result += UNITES[hundreds] + ' cent ';
        }
    }

    if (remainder > 0) {
        if (PARTICULIERS[remainder]) {
            result += PARTICULIERS[remainder] + ' ';
        } else if (remainder < 10) {
            result += UNITES[remainder] + ' ';
        } else {
            const tens = Math.floor(remainder / 10);
            const units = remainder % 10;
            if (tens === 8 && units === 0) {
                result += 'quatre-vingts ';
            } else if (tens === 8 && units > 0) {
                result += 'quatre-vingt-' + UNITES[units] + ' ';
            } else if (units === 1 && tens !== 8 && tens !== 0) {
                result += DIZAINES[tens] + '-et-un ';
            } else if (units > 0) {
                result += DIZAINES[tens] + '-' + UNITES[units] + ' ';
            } else {
                result += DIZAINES[tens] + ' ';
            }
        }
    }

    return result.trim();
}

export function numberToFrenchWords(n: number): string {
    if (n === 0) return 'Zéro';
    
    n = Math.round(Math.abs(n));
    let result = '';

    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const units = n % 1000;

    if (millions > 0) {
        if (millions === 1) {
            result += 'Un Million ';
        } else {
            result += convertLessThanThousand(millions) + ' Millions ';
        }
    }

    if (thousands > 0) {
        if (thousands === 1) {
            result += 'Mille ';
        } else {
            result += convertLessThanThousand(thousands) + ' Mille ';
        }
    }

    if (units > 0) {
        result += convertLessThanThousand(units) + ' ';
    }

    // Capitalize first letter of each major word for Moroccan legal deeds style
    return result
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function formatDirhamsWithLetters(amount: number): string {
    const inWords = numberToFrenchWords(amount);
    const inDigits = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${inWords} Dirhams (${inDigits} DHS)`;
}
