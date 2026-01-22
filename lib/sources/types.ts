/**
 * 数据采集接口定义
 */

export interface TrendingItem {
  title: string;
  description: string;
  url: string;
  tags: string[];
  platform: string;
  publishedAt: Date;
  relevanceScore: number;
}

export interface DataCollectionResult {
  items: TrendingItem[];
  warnings: string[];
  sourceStats: Map<string, number>;
}

export interface DataSourceConfig {
  timeRange: string;
  projectTypes: string[];
}
