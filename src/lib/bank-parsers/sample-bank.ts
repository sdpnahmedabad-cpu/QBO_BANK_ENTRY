import { BankParser, ParsedTransaction, TextItem } from "./types";

export const SampleBankParser: BankParser = {
    name: "Sample Bank",
    description: "Parses statements with layout: Date | Description | Debit | Credit | Balance",

    parse: async (textItems: TextItem[]): Promise<ParsedTransaction[]> => {
        const transactions: ParsedTransaction[] = [];

        // 1. Group items by Y coordinate (rows) mechanism
        // We use a tolerance because PDF text isn't always perfectly aligned
        const tolerance = 2;
        const rows: { y: number; items: TextItem[] }[] = [];

        // Sort by Y (descending for top-to-bottom usually, but PDF coords can vary. 
        // pdf.js usually gives (0,0) at bottom-left, so higher Y is higher on page.
        // Let's sort by Y descending to process top to bottom.
        textItems.sort((a, b) => b.y - a.y);

        for (const item of textItems) {
            // Find a row this item belongs to
            const row = rows.find(r => Math.abs(r.y - item.y) < tolerance);
            if (row) {
                row.items.push(item);
            } else {
                rows.push({ y: item.y, items: [item] });
            }
        }

        // Sort items in each row by X (left to right)
        rows.forEach(r => r.items.sort((a, b) => a.x - b.x));

        // 2. Identify Metadata and Transaction Section
        let isTransactionSection = false;
        let idCounter = 0;

        // Column X-coordinates discovery (dynamic or fixed?)
        // Based on sample: 
        // Date is far left. Description follows. Debit/Credit/Balance are to the right.

        for (const row of rows) {
            const rowText = row.items.map(i => i.str).join(" ");

            // Header detection
            if (rowText.match(/date/i) && rowText.match(/description/i) && (rowText.match(/debit/i) || rowText.match(/credit/i))) {
                isTransactionSection = true;
                continue;
            }

            if (!isTransactionSection) continue;

            // Stop if we hit a footer or summary
            if (rowText.toLowerCase().includes("total") || rowText.toLowerCase().includes("ending balance")) {
                // Might be end of section
                // but let's be careful not to stop too early if it's just a subtotal
            }

            // 3. Parse Row
            // Expecting: Date ... Description ... Debit? ... Credit? ... Balance?

            // Heuristic using X positions:
            // Date: ~ x < 100
            // Balance: ~ x > 500 (page width usually 600ish)
            // Debit/Credit: in betwee

            // Let's try to map items to columns based on order and content
            // Date is usually first item
            const firstItem = row.items[0];
            const dateStr = firstItem.str;

            // Check if valid date (MM/DD)
            if (!dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
                // Not a transaction row (maybe a continuation of description?)
                continue;
            }

            let description = "";
            let debit = 0;
            let credit = 0;
            let balance = 0;

            // items[0] is Date
            // items[last] is likely Balance
            // items in between: Description coverage, then Debit/Credit.

            // We need to differentiate Debit vs Credit based on column position or explicit content if available.
            // In the sample: Date | Description | Debit | Credit | Balance
            // So we have 5 visual columns.

            // Let's classify items based on generic X buckets if we know page width, 
            // OR just look at the numbers at the end.

            // Filter out the date
            const contentItems = row.items.slice(1);

            if (contentItems.length === 0) continue;

            const potentialNumbers: { val: number, x: number }[] = [];
            const potentialDesc: string[] = [];

            for (const item of contentItems) {
                // Check if number (allow currency symbols, commas)
                const cleanStr = item.str.replace(/,/g, '').replace(/\$/g, '');
                if (!isNaN(parseFloat(cleanStr)) && item.str.trim() !== '') {
                    potentialNumbers.push({ val: parseFloat(cleanStr), x: item.x });
                } else {
                    potentialDesc.push(item.str);
                }
            }

            description = potentialDesc.join(" ");

            // Logic for Debit vs Credit based on headers X would be better, but simple logic:
            // If 2 numbers found before Balance => Debit and Credit populated? Unlikely to have both.
            // If 1 number found before Balance => Determine if Debit or Credit column.

            // For Sample Bank:
            // Debit Column is roughly mid-right
            // Credit Column is right of Debit
            // Balance is far right

            // Let's assume the right-most number is Balance.
            // The number before that is the Amount.
            // We need to check the X coordinate of the Amount to see if it falls in Debit or Credit column.

            if (potentialNumbers.length >= 1) {
                const lastNum = potentialNumbers[potentialNumbers.length - 1]; // Likely Balance
                // If specific sample has Balance column, we usually ignore it for import, 
                // but use it to verify. 
                // Wait, typically parsers import the Amount and Type.

                // If there are 2 numbers: [Amount, Balance]
                if (potentialNumbers.length >= 2) {
                    const balanceNum = potentialNumbers[potentialNumbers.length - 1];
                    const amountNum = potentialNumbers[potentialNumbers.length - 2];

                    // Heuristic: Debit is usually around X=350-450, Credit around X=450-550
                    // (Standard letter width ~600pt)
                    // Let's guess: < 450 is Debit, > 450 is Credit?
                    // Verify from sample if possible. Sample shows Debit then Credit.

                    // We can define boundaries relative to the row width. 
                    // Let's try:
                    if (amountNum.x < 480) { // Guessing X threshold
                        debit = amountNum.val;
                    } else {
                        credit = amountNum.val;
                    }
                    balance = balanceNum.val;
                }
                else if (potentialNumbers.length === 1) {
                    // Only one number. Is it Balance? Or Amount (and Balance missing)?
                    // If it's far right, maybe balance only?
                    // Assuming for now it's an Amount if no other number exists... risky.
                    // Let's assign to Debit for safety if unknown, or check X.
                    const num = potentialNumbers[0];
                    if (num.x > 550) {
                        // Likely balance, skip txn? Or assume amount?
                        balance = num.val;
                    } else {
                        if (num.x < 480) debit = num.val;
                        else credit = num.val;
                    }
                }
            }

            if (debit > 0 || credit > 0) {
                transactions.push({
                    id: `txn-${idCounter++}`,
                    date: dateStr, // Keep MM/DD for now, user might need to add Year
                    description: description.trim(),
                    amount: debit > 0 ? debit : credit,
                    type: debit > 0 ? 'debit' : 'credit',
                    balance
                });
            }
        }

        return transactions;
    }
};
