import { RetirementForm } from '../components/retirement/RetirementCalculator';

export const FIXED_INFLATION_RATE = 2.54; // 2.54% average inflation

// New calculation function based on the specified formula
export function calculateInvestmentWithNewFormula(form: RetirementForm, averageYieldRate: number, inflationRate: number): number {
  const { lifeExpectancyYears, monthlySpending, retirementAge, currentAge } = form;
  const yearsUntilRetirement = retirementAge - currentAge;
  
  // Convert percentages to decimals
  const aioyc = averageYieldRate / 100;
  const aacpi = inflationRate / 100;
  
  // Calculate the ratio (1 + AACPI) / (1 + AIOYC)
  const ratio = (1 + aacpi) / (1 + aioyc);
  
  let requiredInvestment: number;
  
  if (Math.abs(aacpi - aioyc) < 0.0001) {
    // If AACPI = AIOYC, use the simplified formula
    requiredInvestment = 12 * monthlySpending * Math.pow(ratio, yearsUntilRetirement) * lifeExpectancyYears;
  } else {
    // If AACPI ≠ AIOYC, use the geometric series formula
    const numerator = 1 - Math.pow(ratio, lifeExpectancyYears);
    const denominator = 1 - ratio;
    requiredInvestment = 12 * monthlySpending * Math.pow(ratio, yearsUntilRetirement) * (numerator / denominator);
  }
  
  return Math.round(requiredInvestment);
} 