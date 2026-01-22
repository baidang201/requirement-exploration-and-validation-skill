/**
 * 评分系统接口定义
 */

export interface ScoreBreakdown<T = any> {
  score: T;
  weight: number;
  details: T;
}

export interface BlueOceanScore {
  trafficStability: number;
  qualityGap: number;
  monetizationFeasibility: number;
  blueOceanScore: number;
}

export interface MatchScore {
  skillMatch: number;
  resourceMatch: number;
  experienceMatch: number;
  matchScore: number;
  details: {
    requiredSkills: string[];
    availableSkills: string[];
    missingSkills: string[];
    requiredResources: string[];
    availableResources: string[];
    missingResources: string[];
  };
}

export interface MarketHeatScore {
  socialMediaBuzz: number;
  githubTrend: number;
  productHuntHeat: number;
  marketHeatScore: number;
}

export interface FeasibilityScore {
  techFamiliarity: number;
  devTimeEstimate: number;
  resourceAvailability: number;
  feasibilityScore: number;
  estimatedWeeks: number;
}

export interface ComprehensiveScore {
  blueOceanScore: number;
  matchScore: number;
  marketHeatScore: number;
  feasibilityScore: number;
  comprehensiveScore: number;
  breakdown: {
    blueOcean: ScoreBreakdown & { score: BlueOceanScore };
    match: {
      score: MatchScore;
      weight: number;
      details: MatchScore['details'];
    };
    heat: ScoreBreakdown & { score: MarketHeatScore };
    feasibility: ScoreBreakdown & { score: FeasibilityScore };
  };
}

export interface UserProfile {
  profile: {
    background: {
      name: string;
      role: string;
      skills: Array<{
        name: string;
        level: 'expert' | 'advanced' | 'intermediate' | 'beginner';
        years: number;
      }>;
      experience: string[];
      constraints: {
        time_budget: string;
        monetary_budget: number;
      };
    };
    resources: {
      technical: string[];
      distribution: string[];
      other: string[];
    };
    scoring_weights?: {
      blue_ocean: number;
      match_score: number;
      market_heat: number;
      feasibility: number;
    };
  };
}
