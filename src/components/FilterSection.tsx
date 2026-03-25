interface FilterSectionProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCuisine: string
  onCuisineChange: (cuisine: string) => void
  radiusFilter: number
  onRadiusChange: (radius: number) => void
  visitedFilter: '' | 'visited' | 'unvisited'
  onVisitedChange: (filter: '' | 'visited' | 'unvisited') => void
  addedDaysFilter: string
  onAddedDaysChange: (days: string) => void
  sortOrder: string
  onSortChange: (order: string) => void
  distanceMiles: number
}

const SLIDER_TICKS = [
  { position: 0, label: '0' },
  { position: 11.67, label: '11.67' },
  { position: 23.33, label: '23.33' },
  { position: 35, label: '35' },
  { position: 46.67, label: '46.67' },
  { position: 58.33, label: '58.33' },
  { position: 70, label: '70' },
  { position: 75, label: '75' },
  { position: 80, label: '80' },
  { position: 85, label: '85' },
  { position: 90, label: '90' },
  { position: 95, label: '95' },
  { position: 100, label: '100' },
]

export default function FilterSection({
  searchQuery,
  onSearchChange,
  selectedCuisine,
  onCuisineChange,
  radiusFilter,
  onRadiusChange,
  visitedFilter,
  onVisitedChange,
  addedDaysFilter,
  onAddedDaysChange,
  sortOrder,
  onSortChange,
  distanceMiles,
}: FilterSectionProps) {
  return (
    <form className="filters" aria-label="Search and filters" onSubmit={(e) => e.preventDefault()}>
      {/* Search */}
      <div className="filter-search-wrap">
        <input
          type="text"
          id="searchFilter"
          aria-label="Filter by name, cuisine, or note"
          placeholder="Enter a name, cuisine, or note"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            id="searchClear"
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6.5" y1="6.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13.5" y1="6.5" x2="6.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Cuisine Category */}
      <div className="filter-category-wrap">
        <select
          id="categoryFilter"
          value={selectedCuisine}
          onChange={(e) => onCuisineChange(e.target.value)}
        >
          <option value="">All categories</option>
          <option value="__food">All food &amp; drink</option>
        </select>
      </div>

      {/* Visited Filter */}
      <fieldset className="segmented filter-visited-row">
        <legend className="sr-only">Filter by visited status</legend>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value=""
            checked={visitedFilter === ''}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value="unvisited"
            checked={visitedFilter === 'unvisited'}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          Not visited
        </label>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value="visited"
            checked={visitedFilter === 'visited'}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          Visited
        </label>
      </fieldset>

      {/* Date Added & Sort */}
      <div className="filter-row-pair">
        <div className="filter-col">
          <label htmlFor="addedFilter" className="filter-label">
            Item added
          </label>
          <select
            id="addedFilter"
            value={addedDaysFilter}
            onChange={(e) => onAddedDaysChange(e.target.value)}
          >
            <option value="">Any date</option>
            <option value="7">This week</option>
            <option value="30">This month</option>
            <option value="90">Last 3 months</option>
            <option value="365">This year</option>
          </select>
        </div>

        <div className="filter-col">
          <label htmlFor="sortOrder" className="filter-label">
            Sort by
          </label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="distance">Distance</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Radius Slider */}
      <div className="radius-slider-wrap">
        <div id="sliderDistance">
          <label htmlFor="radiusFilter" id="radiusLabel">
            Within {Math.round(distanceMiles * 10) / 10} miles
          </label>
          <input
            type="range"
            id="radiusFilter"
            min="0"
            max="100"
            step="0.01"
            value={radiusFilter}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
            aria-labelledby="radiusLabel"
          />
          <div className="slider-ticks" aria-hidden="true">
            {SLIDER_TICKS.map((tick) => (
              <span
                key={tick.position}
                className={`slider-tick${tick.position === 0 || tick.position === 100 ? ' slider-tick-end' : ''}`}
                data-position={tick.position}
              ></span>
            ))}
          </div>
          <div className="slider-endpoints" aria-hidden="true">
            <span>Local</span>
            <span>Distant</span>
          </div>
        </div>
      </div>

      <button type="submit" className="sr-only">
        Apply filters
      </button>
    </form>
  )
}
