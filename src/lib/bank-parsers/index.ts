import { BankParser } from "./types";
import { SampleBankParser } from "./sample-bank";
import { GenericParser } from "./generic";

export const parsers: BankParser[] = [
    SampleBankParser,
    GenericParser
];

export function getParser(name: string): BankParser {
    return parsers.find(p => p.name === name) || GenericParser;
}
