export type DebtSettlementMode = 'mortgage_only' | 'all_debts';

export interface PayrollPolicy {
  defaultFamilyCount: number;
  defaultChildCount: number;
  defaultNonTaxableMonthly: number;
  defaultWithholdingRatePercent: 80 | 100 | 120;
  nationalPensionEmployeeRateByYear: Record<number, number>;
  healthInsuranceEmployeeRateByYear: Record<number, number>;
  /** 직장가입자 본인부담 건강보험료에 곱하는 장기요양보험료율(%) */
  longTermCareRateByYear: Record<number, number>;
  employmentInsuranceEmployeeRateByYear: Record<number, number>;
  withholdingTaxTableVersionByYear: Record<number, string>;
}

export interface PensionPolicy {
  assumedCareerStartAge: number;
  npsMinMonthly: number;
  npsMaxMonthly: number;
  npsAverageMonthlyIncomeValue: number;
  npsPreReformReplacementRate: number;
  npsPostReformReplacementRate: number;
  npsReformYear: number;
}

export interface PropertyPolicy {
  propertySaleHaircut: number;
  rentalBaseMonthlyToday: number;
  saleProceedsAnnualReturn: number;
  securedLoanLtv: number;
  /** APR 기준 연이율 (소수, e.g. 0.045 = 4.5%).
   *  월이자 계산: annualRate / 12 (APR/12 방식, 복리 변환 아님).
   *  한국 대출 상품 관행 및 debtSchedule.ts와 동일 컨벤션. */
  securedLoanAnnualRate: number;
  saleDebtSettlementMode: DebtSettlementMode;
}

export interface PlannerPolicyVersion {
  version: string;
  effectiveDate: string;
  payroll: PayrollPolicy;
  pension: PensionPolicy;
  property: PropertyPolicy;
}

const POLICY_TABLE: PlannerPolicyVersion[] = [
  {
    version: '2026-04',
    effectiveDate: '2026-04-01',
    payroll: {
      defaultFamilyCount: 1,
      defaultChildCount: 0,
      defaultNonTaxableMonthly: 0,
      defaultWithholdingRatePercent: 100,
      nationalPensionEmployeeRateByYear: {
        2025: 4.5,
        2026: 4.75,
        2027: 5.0,
        2028: 5.25,
        2029: 5.5,
        2030: 5.75,
        2031: 6.0,
        2032: 6.25,
        2033: 6.5,
      },
      healthInsuranceEmployeeRateByYear: {
        2025: 3.545,
        2026: 3.595,
        2027: 3.595,
        2028: 3.595,
        2029: 3.595,
        2030: 3.595,
        2031: 3.595,
        2032: 3.595,
        2033: 3.595,
      },
      longTermCareRateByYear: {
        2025: 12.95,
        2026: 13.14,
        2027: 13.14,
        2028: 13.14,
        2029: 13.14,
        2030: 13.14,
        2031: 13.14,
        2032: 13.14,
        2033: 13.14,
      },
      employmentInsuranceEmployeeRateByYear: {
        2025: 0.9,
        2026: 0.9,
        2027: 0.9,
        2028: 0.9,
        2029: 0.9,
        2030: 0.9,
        2031: 0.9,
        2032: 0.9,
        2033: 0.9,
      },
      withholdingTaxTableVersionByYear: {
        2025: '2024-02-29',
        2026: '2024-02-29',
        2027: '2024-02-29',
        2028: '2024-02-29',
        2029: '2024-02-29',
        2030: '2024-02-29',
        2031: '2024-02-29',
        2032: '2024-02-29',
        2033: '2024-02-29',
      },
    },
    pension: {
      assumedCareerStartAge: 26,
      npsMinMonthly: 40,
      npsMaxMonthly: 637,
      npsAverageMonthlyIncomeValue: 319.3511,
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
