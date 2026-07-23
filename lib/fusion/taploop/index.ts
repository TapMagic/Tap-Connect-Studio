export {
  createProgram,
  defineRules,
  listPrograms,
  enroll,
  award,
  redeem,
  reverse,
  listLedger,
  getEnrollmentBalance,
  computeBalance,
  validateLedgerAppend,
  resolveTier,
} from "./service";
export type { EarnRule, ProgramDto, EnrollmentDto, LedgerEntryDto } from "./service";
export type { LoyaltyTierDef, LedgerEntryLike } from "./ledger-math";
