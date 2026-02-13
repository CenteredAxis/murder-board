// ── Schema Version ──
export const SCHEMA_VERSION = 2

// ── localStorage keys ──
export const LOCAL_STORAGE_KEY = 'link-analysis-graph'
export const META_STORAGE_KEY = 'link-analysis-meta'

// ── Node Types ──
export const NODE_TYPES = ['Person', 'Organization', 'Phone', 'Event']

// ── Person Statuses (Feature 5) ──
export const PERSON_STATUSES = [
  'Active', 'Deceased', 'Missing', 'Incarcerated', 'Person of Interest', 'Cleared'
]

// ── Event Types (Feature 8) ──
export const EVENT_TYPES = [
  'Meeting', 'Transaction', 'Crime', 'Communication', 'Travel', 'Other'
]

// ── Relationship Types ──
export const RELATIONSHIP_TYPES = [
  'Financial',
  'Personal',
  'Professional',
  'Criminal',
  'Communication',
  'Family',
  'Unknown',
]

// ── Confidence Levels (Feature 2) ──
export const CONFIDENCE_LEVELS = ['Confirmed', 'Probable', 'Suspected', 'Unconfirmed']

// ── Edge Directions (Feature 3) ──
export const EDGE_DIRECTIONS = ['directed', 'mutual', 'undirected']

// ── Evidence Item Types (Feature 6) ──
export const EVIDENCE_ITEM_TYPES = [
  'Phone Call', 'Meeting', 'Document', 'Surveillance',
  'Financial Record', 'Witness Statement', 'Digital Communication', 'Other'
]

// ── Group Roles (Feature 7) ──
export const GROUP_ROLES = ['Leader', 'Member', 'Associate', 'Unknown']

// ── Color Maps ──
export const RELATIONSHIP_COLORS = {
  Financial: '#22c55e',
  Personal: '#3b82f6',
  Professional: '#a855f7',
  Criminal: '#ef4444',
  Communication: '#f59e0b',
  Family: '#ec4899',
  Unknown: '#6b7280',
}

export const NODE_COLORS = {
  Person: '#3b82f6',
  Organization: '#22c55e',
  Phone: '#f59e0b',
  Event: '#a855f7',
}

// ── Shape Maps ──
export const NODE_SHAPES = {
  Person: 'ellipse',
  Organization: 'rectangle',
  Phone: 'diamond',
  Event: 'star',
}

// ── Status Colors (Feature 5) ──
export const STATUS_COLORS = {
  Active: '#22c55e',
  Deceased: '#ef4444',
  Missing: '#f59e0b',
  Incarcerated: '#f97316',
  'Person of Interest': '#ef4444',
  Cleared: '#6b7280',
}

// ── Confidence Colors (Feature 2) ──
export const CONFIDENCE_COLORS = {
  Confirmed: '#22c55e',
  Probable: '#f59e0b',
  Suspected: '#f97316',
  Unconfirmed: '#ef4444',
}

// ── AI Settings ──
export const AI_SETTINGS_KEY = 'link-analysis-ai-settings'

export const DEFAULT_AI_SETTINGS = {
  provider: 'ollama',
  endpoint: '/ollama/v1/chat/completions',
  model: 'gpt-oss:120b',
  apiKey: '',
  temperature: 0.1,
  maxTokens: 8192,
}

// ── Initial Empty Form State ──
export const emptyNode = {
  label: '', type: 'Person', metadata: '',
  // Person fields (Feature 5)
  role: '', aliases: '', status: '', avatarUrl: '', location: '', dob: '',
  // Event fields (Feature 8)
  eventType: '', eventDate: '', eventLocation: '', eventDescription: '',
}

export const emptyEdge = {
  source: '', target: '', relationship: 'Personal', weight: 2,
  // Direction (Feature 3)
  direction: 'directed',
  // Custom label (Feature 12)
  customLabel: '',
  // Evidence (Feature 2)
  description: '', evidenceRef: '', confidence: 'Confirmed',
  // Temporal (Feature 1)
  startDate: '', endDate: '', eventDate: '',
  // Location (Feature 9)
  location: '',
}
