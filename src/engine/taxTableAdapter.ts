import withholdingTable20240229 from '../policy/data/withholding-tax/2024-02-29.json';

export interface WithholdingTaxLookupContext {
  policyYear: number;
  familyCount: number;
  childCount: number;
  withholdingRatePercent: 80 | 100 | 120;
}

interface WithholdingTaxTableBracket {
  lowerThousandWonInclusive: number;
  upperThousandWonExclusive: number;
  familyTaxesWon: number[];
}

interface OverTenMillionRule {
  lowerWonInclusive: number;
  upperWonExclusive: number | null;
  applyNinetyEightPercentToExcess: boolean;
  baseAddonWon: number;
  marginalRate: number;
}

interface WithholdingTaxTableData {
  version: string;
  familyCountSupported: number;
  childTaxCreditsWon: {
    '1': number;
    '2': number;
    additionalOver2: number;
  };
  baseAt10000ThousandWon: {
    taxableMonthlyWon: number;
    familyTaxesWon: number[];
  };
  overTenMillionRules: OverTenMillionRule[];
  brackets: WithholdingTaxTableBracket[];
}

export interface WithholdingTaxLookupResult {
  version: string;
  baseIncomeTaxWon: number;
  incomeTaxWon: number;
  localIncomeTaxWon: number;
  assumptions: string[];
}

const WITHHOLDING_TABLES: Record<string, WithholdingTaxTableData> = {
  '2024-02-29': withholdingTable20240229 as WithholdingTaxTableData,
};

function getChildTaxCreditWon(table: WithholdingTaxTableData, childCount: number): number {
  if (childCount <= 0) return 0;
  if (childCount === 1) return table.childTaxCreditsWon['1'];
  if (childCount === 2) return table.childTaxCreditsWon['2'];
  return table.childTaxCreditsWon['2'] + (childCount - 2) * table.childTaxCreditsWon.additionalOver2;
}

function resolveFamilyIndex(table: WithholdingTaxTableData, familyCount: number): { primaryIndex: number; extrapolate: number } {
  const normalized = Math.max(1, Math.floor(familyCount));
  if (normalized <= table.familyCountSupported) {
    return { primaryIndex: normalized - 1, extrapolate: 0 };
  }
  return {
    primaryIndex: table.familyCountSupported - 1,
    extrapolate: normalized - table.familyCountSupported,
  };
}

function getFamilyTaxWon(table: WithholdingTaxTableData, familyTaxesWon: number[], familyCount: number): number {
  const { primaryIndex, extrapolate } = resolveFamilyIndex(table, familyCount);
  const cappedTax = familyTaxesWon[primaryIndex] ?? 0;
  if (extrapolate === 0) return cappedTax;
  const prevTax = familyTaxesWon[primaryIndex - 1] ?? cappedTax;
  const perAdditionalFamilyReduction = Math.max(0, prevTax - cappedTax);
  return Math.max(0, cappedTax - perAdditionalFamilyReduction * extrapolate);
}

function findBracket(table: WithholdingTaxTableData, taxableMonthlyWon: number): WithholdingTaxTableBracket | null {
  let low = 0;
  let high = table.brackets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bracket = table.brackets[mid];
    const lowerWon = bracket.lowerThousandWonInclusive * 1000;
    const upperWon = bracket.upperThousandWonExclusive * 1000;
    if (taxableMonthlyWon < lowerWon) {
      high = mid - 1;
      continue;
    }
    if (taxableMonthlyWon >= upperWon) {
      low = mid + 1;
      continue;
    }
    return bracket;
  }
  return null;
}

function resolveOverTenMillionBaseTaxWon(
  table: WithholdingTaxTableData,
  taxableMonthlyWon: number,
  familyCount: number,
): number {
  const anchorTax = getFamilyTaxWon(
    table,
    table.baseAt10000ThousandWon.familyTaxesWon,
    familyCount,
  );
  const rule = table.overTenMillionRules.find((candidate) =>
    taxableMonthlyWon >= candidate.lowerWonInclusive &&
    (candidate.upperWonExclusive === null || taxableMonthlyWon < candidate.upperWonExclusive),
  );

  if (!rule) {
    throw new Error(`No withholding rule for taxableMonthlyWon=${taxableMonthlyWon}`);
  }

  const rawExcessWon = taxableMonthlyWon - rule.lowerWonInclusive;
  const excessBaseWon = rule.applyNinetyEightPercentToExcess
    ? rawExcessWon * 0.98
    : rawExcessWon;
  return Math.max(0, Math.floor(anchorTax + rule.baseAddonWon + excessBaseWon * rule.marginalRate));
}

export function lookupWithholdingTaxTable(version: string): WithholdingTaxTableData {
  const table = WITHHOLDING_TABLES[version];
  if (!table) {
    throw new Error(`Withholding tax table version not found: ${version}`);
  }
  return table;
}

export function lookupMonthlyWithholdingTaxWon(
  taxableMonthlyWon: number,
  version: string,
  ctx: Omit<WithholdingTaxLookupContext, 'policyYear'>,
): WithholdingTaxLookupResult {
  const table = lookupWithholdingTaxTable(version);
  const normalizedTaxableWon = Math.max(0, Math.round(taxableMonthlyWon));
  const assumptions: string[] = [];

  if (ctx.familyCount > table.familyCountSupported) {
    assumptions.push(`공제대상가족 ${table.familyCountSupported}명 초과 구간은 간이세액표 부칙의 선형 외삽 규칙을 적용했어요.`);
  }

  let baseIncomeTaxWon = 0;
  if (normalizedTaxableWon >= table.baseAt10000ThousandWon.taxableMonthlyWon) {
    baseIncomeTaxWon = resolveOverTenMillionBaseTaxWon(table, normalizedTaxableWon, ctx.familyCount);
  } else {
    const bracket = findBracket(table, normalizedTaxableWon);
    if (bracket) {
      baseIncomeTaxWon = getFamilyTaxWon(table, bracket.familyTaxesWon, ctx.familyCount);
    }
  }

  const childCreditWon = getChildTaxCreditWon(table, ctx.childCount);
  const afterChildCreditWon = Math.max(0, baseIncomeTaxWon - childCreditWon);
  const incomeTaxWon = Math.max(0, Math.round(afterChildCreditWon * (ctx.withholdingRatePercent / 100)));
  const localIncomeTaxWon = Math.round(incomeTaxWon * 0.1);

  return {
    version: table.version,
    baseIncomeTaxWon: afterChildCreditWon,
    incomeTaxWon,
    localIncomeTaxWon,
    assumptions,
  };
}
