import { BankParser, ParsedTransaction, TextItem } from "./types";

export const GenericParser: BankParser = {
    name: "Generic (Text Regex)",
    description: "Attempts to find Date, Description, and Amount using standard patterns.",

    parse: async (textItems: TextItem[]): Promise<ParsedTransaction[]> => {
        // Group by Y to get lines
        const tolerance = 4;
        const rows: { y: number; text: string }[] = [];

        textItems.sort((a, b) => b.y - a.y);

        for (const item of textItems) {
            const row = rows.find(r => Math.abs(r.y - item.y) < tolerance);
            if (row) {
                row.text += " " + item.str;
            } else {
                rows.push({ y: item.y, text: item.str });
            }
        }

        const transactions: ParsedTransaction[] = [];
        let idCounter = 0;

        const datePattern = /(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|([A-Za-z]{3}\s\d{1,2},?\s\d{4})|(\d{1,2}\/\d{1,2})/;

        for (const row of rows) {
            const line = row.text.trim();
            const dateMatch = line.match(datePattern);

            if (dateMatch) {
                const dateStr = dateMatch[0];
                const remaining = line.replace(dateStr, "").trim();

                // Look for money
                const moneyMatches = remaining.match(/[\(]?\d{1,3}(,\d{3})*(\.\d{2})?[\)]?|[\(]?\d+(\.\d{2})?[\)]?/g);

                if (moneyMatches && moneyMatches.length > 0) {
                    // Assume last is balance, second to last is amount, OR just last is amount
                    // Generic is hard. Let's assume last number found is the amount if only 1, 
                    // or second to last if > 1 (assuming last is balance).

                    let amount = 0;
                    let type: 'debit' | 'credit' = 'debit';

                    const numStr = moneyMatches.length > 1
                        ? moneyMatches[moneyMatches.length - 2]
                        : moneyMatches[moneyMatches.length - 1];

                    const cleanNum = numStr.replace(/,/g, '').replace(/\(/, '-').replace(/\)/, '');
                    amount = parseFloat(cleanNum);

                    // Negative = debit?
                    if (amount < 0) {
                        type = 'debit';
                        amount = Math.abs(amount);
                    } else {
                        type = 'credit';
                    }

                    const description = remaining.replace(numStr, "").replace(moneyMatches[moneyMatches.length - 1], "").trim();

                    transactions.push({
                        id: `gen-${idCounter++}`,
                        date: dateStr,
                        description: description,
                        amount,
                        type,
                        balance: 0
                    });
                }
            }
        }

        return transactions;
    }
};
