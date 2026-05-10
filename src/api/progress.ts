export interface ReadProgress {
  articleId: string;
  percentage: number;
  lastUpdated: string;
}

export async function saveReadProgress(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
}
