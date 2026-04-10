import { getPlannerPolicy } from '../policy/policyTable';
import { lookupMonthlyWithholdingTaxWon } from './taxTableAdapter';

export interface PayrollReverseContext {
  policyYear: number;
  familyCount: number;
  childCount: number;
  nonTaxableMonthly: number;
  withholdingRatePercent: 80 | 100 | 120;
}

export interface PayrollBreakdown {
  grossMonthly: number;
  taxableMonthly: number;
  nationalPensionEmployee: number;
  healthInsuranceEmployee: number;
  longTermCareEmployee: number;
  employmentInsuranceEmployee: number;
  incomeTax: number;
  localIncomeTax: number;
  netMonthly: number;
  assumptions?: string[];
  taxTableVersion?: string;
}

const WON_PER_MANWON = 10000;
const MAX_BINARY_SEARCH_ITERATIONS = 120;
const MAX_GROSS_MONTHLY_MANWON = 100000;
const payrollBreakdownCache = new Map<string, PayrollBreakdown>();
const grossFromNetCache = new Map<string, PayrollBreakdown>();

function manwonToWon(value: number): number {
  return Math.round(value * WON_PER_MANWON);
}

function wonToManwon(value: number): number {
  return value / WON_PER_MANWON;
}

function resolveValueByYear<T>(rateMap: Record<number, T>, year: number, label: string): T {
  const rate = rateMap[year];
  if (rate === undefined) {
    throw new Error(`${label} not configured for policyYear=${year}`);
  }
  return rate;
}

export function resolvePayrollReverseContext(partial: Partial<PayrollReverseContext> | undefined, policyYear: number): PayrollReverseContext {
  const policy = getPlannerPolicy();
  return {
    policyYear,
    familyCount: partial?.familyCount ?? policy.payroll.defaultFamilyCount,
    childCount: partial?.childCount ?? policy.payroll.defaultChildCount,
    nonTaxableMonthly: partial?.nonTaxableMonthly ?? policy.payroll.defaultNonTaxableMonthly,
    withholdingRatePercent: partial?.withholdingRatePercent ?? policy.payroll.defaultWithholdingRatePercent,
  };
}

export function calculatePayrollBreakdownFromGrossMonthly(
  grossMonthly: number,
  ctx: PayrollReverseContext,
): PayrollBreakdown {
  const cacheKey = JSON.stringify([
    grossMonthly,
    ctx.policyYear,
    ctx.familyCount,
    ctx.childCount,
    ctx.nonTaxableMonthly,
    ctx.withholdingRatePercent,
  ]);
  const cached = payrollBreakdownCache.get(cacheKey);
  if (cached) return cached;

  const policy = getPlannerPolicy();
  const assumptions: string[] = [];
  const grossMonthlyWon = Math.max(0, manwonToWon(grossMonthly));
  const nonTaxableMonthlyWon = Math.max(0, manwonToWon(ctx.nonTaxableMonthly));
  const taxableMonthlyWon = Math.max(0, grossMonthlyWon - nonTaxableMonthlyWon);

  const pensionableMonthlyWon = Math.min(
    Math.max(taxableMonthlyWon, manwonToWon(policy.pension.npsMinMonthly)),
    manwonToWon(policy.pension.npsMaxMonthly),
  );

  const nationalPensionRate = resolveValueByYear(
    policy.payroll.nationalPensionEmployeeRateByYear,
    ctx.policyYear,
    'nationalPensionEmployeeRateByYear',
  );
  const healthInsuranceRate = resolveValueByYear(
    policy.payroll.healthInsuranceEmployeeRateByYear,
    ctx.policyYear,
    'healthInsuranceEmployeeRateByYear',
  );
  const longTermCareRate = resolveValueByYear(
    policy.payroll.longTermCareRateByYear,
    ctx.policyYear,
    'longTermCareRateByYear',
  );
  const employmentInsuranceRate = resolveValueByYear(
    policy.payroll.employmentInsuranceEmployeeRateByYear,
    ctx.policyYear,
    'employmentInsuranceEmployeeRateByYear',
  );
  const withholdingVersion = resolveValueByYear(
    policy.payroll.withholdingTaxTableVersionByYear,
    ctx.policyYear,
    'withholdingTaxTableVersionByYear',
  );

  const nationalPensionEmployeeWon = Math.round(pensionableMonthlyWon * (nationalPensionRate / 100));
  const healthInsuranceEmployeeWon = Math.round(taxableMonthlyWon * (healthInsuranceRate / 100));
  const longTermCareEmployeeWon = Math.round(healthInsuranceEmployeeWon * (longTermCareRate / 100));
  const employmentInsuranceEmployeeWon = Math.round(taxableMonthlyWon * (employmentInsuranceRate / 100));

  const withholding = lookupMonthlyWithholdingTaxWon(
    taxableMonthlyWon,
    withholdingVersion,
    {
      familyCount: ctx.familyCount,
      childCount: ctx.childCount,
      withholdingRatePercent: ctx.withholdingRatePercent,
    },
  );

  const netMonthlyWon = grossMonthlyWon
    - nationalPensionEmployeeWon
    - healthInsuranceEmployeeWon
    - longTermCareEmployeeWon
    - employmentInsuranceEmployeeWon
    - withholding.incomeTaxWon
    - withholding.localIncomeTaxWon;

  if (ctx.familyCount === policy.payroll.defaultFamilyCount) {
    assumptions.push(`공제대상가족 수 기본값 ${ctx.familyCount}명을 적용했어요.`);
  }
  if (ctx.childCount === policy.payroll.defaultChildCount) {
    assumptions.push(`자녀 수 기본값 ${ctx.childCount}명을 적용했어요.`);
  }
  if (ctx.nonTaxableMonthly === policy.payroll.defaultNonTaxableMonthly) {
    assumptions.push('비과세 소득은 0만원으로 가정했어요.');
  }
  if (ctx.withholdingRatePercent === policy.payroll.defaultWithholdingRatePercent) {
    assumptions.push(`원천징수 선택비율은 기본 ${ctx.withholdingRatePercent}%를 적용했어요.`);
  }
  assumptions.push(...withholding.assumptions);

  const breakdown = {
    grossMonthly: wonToManwon(grossMonthlyWon),
    taxableMonthly: wonToManwon(taxableMonthlyWon),
    nationalPensionEmployee: wonToManwon(nationalPensionEmployeeWon),
    healthInsuranceEmployee: wonToManwon(healthInsuranceEmployeeWon),
    longTermCareEmployee: wonToManwon(longTermCareEmployeeWon),
    employmentInsuranceEmployee: wonToManwon(employmentInsuranceEmployeeWon),
    incomeTax: wonToManwon(withholding.incomeTaxWon),
    localIncomeTax: wonToManwon(withholding.localIncomeTaxWon),
    netMonthly: wonToManwon(netMonthlyWon),
    assumptions,
    taxTableVersion: withholding.version,
  };
  payrollBreakdownCache.set(cacheKey, breakdown);
  return breakdown;
}

export function estimateGrossMonthlyFromNet(
  targetNetMonthly: number,
  ctx: PayrollReverseContext,
): PayrollBreakdown {
  const cacheKey = JSON.stringify([
    targetNetMonthly,
    ctx.policyYear,
    ctx.familyCount,
    ctx.childCount,
    ctx.nonTaxableMonthly,
    ctx.withholdingRatePercent,
  ]);
  const cached = grossFromNetCache.get(cacheKey);
  if (cached) return cached;

  if (targetNetMonthly <= 0) {
    const zero = calculatePayrollBreakdownFromGrossMonthly(0, ctx);
    grossFromNetCache.set(cacheKey, zero);
    return zero;
  }

  const targetNetWon = manwonToWon(targetNetMonthly);
  let lowWon = 0;
  let highWon = targetNetWon;
  let highBreakdown = calculatePayrollBreakdownFromGrossMonthly(wonToManwon(highWon), ctx);

  while (manwonToWon(highBreakdown.netMonthly) < targetNetWon) {
    highWon *= 2;
    if (wonToManwon(highWon) > MAX_GROSS_MONTHLY_MANWON) {
      throw new Error(`Unable to bracket gross income for targetNetMonthly=${targetNetMonthly}`);
    }
    highBreakdown = calculatePayrollBreakdownFromGrossMonthly(wonToManwon(highWon), ctx);
  }

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS && highWon - lowWon > 1; i++) {
    const midWon = Math.floor((lowWon + highWon) / 2);
    const midBreakdown = calculatePayrollBreakdownFromGrossMonthly(wonToManwon(midWon), ctx);
    if (manwonToWon(midBreakdown.netMonthly) < targetNetWon) {
      lowWon = midWon;
    } else {
      highWon = midWon;
      highBreakdown = midBreakdown;
    }
  }

  grossFromNetCache.set(cacheKey, highBreakdown);
  return highBreakdown;
}

export function estimateGrossAnnualFromNetAnnual(
  targetNetAnnual: number,
  ctx: PayrollReverseContext,
): PayrollBreakdown {
  const targetNetMonthly = targetNetAnnual / 12;
  return estimateGrossMonthlyFromNet(targetNetMonthly, ctx);
}
