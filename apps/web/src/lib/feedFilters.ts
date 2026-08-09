const STORAGE_KEY = "gathere-feed-filters";

export interface FeedFiltersState {
  include_full: boolean;
  days_of_week: string[];
  time_of_day: string[];
  listing_types: string[];
}

export const DEFAULT_FEED_FILTERS: FeedFiltersState = {
  include_full: false,
  days_of_week: [],
  time_of_day: [],
  listing_types: [],
};

export function loadFeedFilters(): FeedFiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FEED_FILTERS };
    const parsed = JSON.parse(raw) as Partial<FeedFiltersState>;
    return {
      ...DEFAULT_FEED_FILTERS,
      ...parsed,
      include_full: Boolean(parsed.include_full),
      days_of_week: parsed.days_of_week ?? [],
      time_of_day: parsed.time_of_day ?? [],
      listing_types: parsed.listing_types ?? [],
    };
  } catch {
    return { ...DEFAULT_FEED_FILTERS };
  }
}

export function saveFeedFilters(filters: FeedFiltersState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function resetFeedFilters(): FeedFiltersState {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_FEED_FILTERS };
}
