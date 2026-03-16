export interface ParsedTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    balance?: number;
}

export interface BankParser {
    name: string;
    description: string;
    parse: (textItems: TextItem[]) => Promise<ParsedTransaction[]>;
}

export interface TextItem {
    str: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
