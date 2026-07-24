export {
  createProgram,
  defineRules,
  listPrograms,
  enroll,
  award,
  redeem,
  reverse,
  adjust,
  setProgramActive,
  setEnrollmentStatus,
  listMembers,
  getMemberDetail,
  listLoyaltyAudit,
  listLedger,
  getEnrollmentBalance,
  computeBalance,
  validateLedgerAppend,
  resolveTier,
} from "./service";
export type {
  EarnRule,
  ProgramDto,
  EnrollmentDto,
  LedgerEntryDto,
  MemberSummaryDto,
  MemberDetailDto,
  LoyaltyAuditRow,
} from "./service";
export type { LoyaltyTierDef, LedgerEntryLike } from "./ledger-math";
export {
  fetchLoyaltyInsightKpis,
  type LoyaltyInsightKpi,
  type LoyaltyInsightsSnapshot,
} from "./insights";
