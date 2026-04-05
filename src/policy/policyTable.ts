export type DebtSettlementMode = 'mortgage_only' | 'all_debts';

export interface PensionPolicy {
  netToGrossRatio: number;
  assumedCareerStartAge: number;
  npsMinMonthly: number;
  npsMaxMonthly: number;
  npsPreReformReplacementRate: number;
  npsPostReformReplacementRate: number;
  npsReformYear: number;
}

export interface PropertyPolicy {
  propertySaleHaircut: number;
  rentalBaseMonthlyToday: number;
  saleProceedsAnnualReturn: number;
  securedLoanLtv: number;
  securedLoanAnnualRate: number;
  saleDebtSettlementMode: DebtSettlementMode;
}

export interface PlannerPolicyVersion {
  version: string;
  effectiveDate: string; // YYYY-MM-DD
  pension: PensionPolicy;
  property: PropertyPolicy;
}

const POLICY_TABLE: PlannerPolicyVersion[] = [
  {
    version: '2026-04',
    effectiveDate: '2026-04-01',
    pension: {
      netToGrossRatio: 0.78,
      assumedCareerStartAge: 26,
      npsMinMonthly: 40,
      npsMaxMonthly: 637,
      npsPreReformReplacementRate: 0.415,
      npsPostReformReplacementRate: 0.43,
      npsReformYear: 2026,
    },
    property: {
      propertySaleHaircut: 0.05,
      rentalBaseMonthlyToday: 200,
      saleProceedsAnnualReturn: 0.04,
      securedLoanLtv: 0.60,
      securedLoanAnnualRate: 0.045,
      saleDebtSettlementMode: 'mortgage_only',
    },
  },
];

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

export function getPlannerPolicy(now: Date = new Date()): PlannerPolicyVersion {
  const nowTs = now.getTime();
  const sorted = [...POLICY_TABLE].sort(
    (a, b) => parseDate(a.effectiveDate) - parseDate(b.effectiveDate),
  );

  let selected = sorted[0];
  for (const policy of sorted) {
    if (parseDate(policy.effectiveDate) <= nowTs) selected = policy;
  }
  return selected;
}

