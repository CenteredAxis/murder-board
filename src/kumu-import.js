/**
 * Kumu JSON Import Converter
 *
 * Transforms Kumu (kumu.io) JSON export format into the Link Analysis
 * native import format so the existing import pipeline can handle it.
 *
 * Pure function — no side effects, no project imports.
 */

// ── Mapping Constants ──

const KUMU_TYPE_MAP = {
  person: 'Person',
  organization: 'Organization',
  event: 'Event',
  location: 'Organization', // No Location node type — map to Organization
}

const KUMU_RELATIONSHIP_MAP = {
  financial: 'Financial',
  personal: 'Personal',
  professional: 'Professional',
  criminal: 'Criminal',
  communication: 'Communication',
  family: 'Family',
}

// Kumu attributes that get folded into the metadata string.
// Order matters — this is the display order.
const META_ATTRS = [
  { key: 'ideology', label: 'Ideology' },
  { key: 'activity level', label: 'Activity Level' },
  { key: 'operational status', label: 'Operational Status' },
  { key: 'organization type', label: 'Organization Type' },
  { key: 'size', label: 'Size' },
]

// ── Helpers ──

function buildPositionMap(maps) {
  const posMap = {}
  if (!maps || maps.length === 0) return posMap
  const firstMap = maps[0]
  if (!firstMap.elements) return posMap
  firstMap.elements.forEach((mapEl) => {
    if (
      mapEl.element &&
      mapEl.position &&
      mapEl.position.x != null &&
      mapEl.position.y != null
    ) {
      posMap[mapEl.element] = { x: mapEl.position.x, y: mapEl.position.y }
    }
  })
  return posMap
}

function mapNodeType(kumuType) {
  if (!kumuType) return 'Person'
  const mapped = KUMU_TYPE_MAP[kumuType.toLowerCase().trim()]
  return mapped || 'Person'
}

/** Build a combined metadata string from description + extra Kumu attributes. */
function buildMetadata(attrs, resolvedType, originalType) {
  const parts = []

  // If the original Kumu type was "Location" but we mapped to Organization, note it.
  if (
    originalType &&
    originalType.toLowerCase().trim() === 'location' &&
    resolvedType === 'Organization'
  ) {
    parts.push('[Location]')
  }

  // If there's a type we couldn't map at all (not in KUMU_TYPE_MAP), note it.
  if (
    originalType &&
    originalType.toLowerCase().trim() !== 'location' &&
    !KUMU_TYPE_MAP[originalType.toLowerCase().trim()] &&
    originalType.trim() !== ''
  ) {
    parts.push(`[${originalType.trim()}]`)
  }

  // Description is the main text
  const desc = attrs.description || ''
  if (desc.trim()) parts.push(desc.trim())

  // Append labeled extra attributes
  META_ATTRS.forEach(({ key, label }) => {
    const val = attrs[key]
    if (val && String(val).trim()) {
      parts.push(`${label}: ${String(val).trim()}`)
    }
  })

  return parts.join('\n')
}

function buildTags(kumuTags) {
  if (!kumuTags) return '[]'
  if (Array.isArray(kumuTags)) {
    // Kumu tags are plain strings — wrap each in the Link Analysis format if needed,
    // but since the groups system isn't fully wired yet, store as simple string array.
    return JSON.stringify(kumuTags)
  }
  if (typeof kumuTags === 'string' && kumuTags.trim()) {
    // Could be comma-separated
    const arr = kumuTags.split(',').map((t) => t.trim()).filter(Boolean)
    return JSON.stringify(arr)
  }
  return '[]'
}

/**
 * Map a Kumu connection type to a Link Analysis relationship + customLabel.
 * If the connection type maps to a known relationship, customLabel gets the
 * Kumu label attribute. If it doesn't map, relationship = 'Unknown' and
 * customLabel preserves the original connection type.
 */
function mapRelationship(connectionType, kumuLabel) {
  if (!connectionType && !kumuLabel) {
    return { relationship: 'Unknown', customLabel: '' }
  }

  const ct = connectionType ? connectionType.toLowerCase().trim() : ''
  const mapped = KUMU_RELATIONSHIP_MAP[ct]

  if (mapped) {
    // Known relationship — customLabel can be the Kumu label for display
    return { relationship: mapped, customLabel: kumuLabel || '' }
  }

  // Unknown relationship — preserve the original value in customLabel
  return {
    relationship: 'Unknown',
    customLabel: connectionType || kumuLabel || '',
  }
}

function mapDirection(dir) {
  if (!dir) return 'directed'
  const d = dir.toLowerCase().trim()
  if (d === 'directed' || d === 'mutual' || d === 'undirected') return d
  return 'directed'
}

// Helper to normalise Kumu attribute keys (they're lowercase with spaces)
function getAttr(attrs, key) {
  // Try exact match first, then case-insensitive
  if (attrs[key] !== undefined) return attrs[key]
  const lower = key.toLowerCase()
  for (const k of Object.keys(attrs)) {
    if (k.toLowerCase() === lower) return attrs[k]
  }
  return undefined
}

// ── Main Converter ──

export function convertKumuToNative(kumuData) {
  if (kumuData.version && kumuData.version !== 1) {
    console.warn(`Kumu import: unexpected version ${kumuData.version}, proceeding anyway`)
  }

  const positionMap = buildPositionMap(kumuData.maps)

  // ── Convert Elements → Nodes ──
  const nodes = (kumuData.elements || []).map((element) => {
    const attrs = element.attributes || {}
    const originalType = getAttr(attrs, 'element type') || ''
    const nodeType = mapNodeType(originalType)
    const metadata = buildMetadata(attrs, nodeType, originalType)
    const tags = buildTags(getAttr(attrs, 'tags'))
    const position = positionMap[element._id]

    const nodeData = {
      id: element._id,
      label: getAttr(attrs, 'label') || element._id,
      nodeType,
      metadata,
      // Person fields
      role: '',
      aliases: '',
      status: '',
      avatarUrl: getAttr(attrs, 'image') || '',
      location: getAttr(attrs, 'location') || '',
      dob: '',
      // Event fields
      eventType: '',
      eventDate: '',
      eventLocation: '',
      eventDescription: '',
      // Tags
      tags,
    }

    const node = { data: nodeData }
    if (position) node.position = position
    return node
  })

  // ── Convert Connections → Edges ──
  const edges = (kumuData.connections || [])
    .filter((conn) => {
      if (!conn.from || !conn.to) {
        console.warn('Kumu import: skipping connection with missing from/to', conn._id)
        return false
      }
      return true
    })
    .map((conn) => {
      const attrs = conn.attributes || {}
      const { relationship, customLabel } = mapRelationship(
        getAttr(attrs, 'connection type'),
        getAttr(attrs, 'label')
      )
      const displayLabel = customLabel || relationship

      return {
        data: {
          id: conn._id,
          source: conn.from,
          target: conn.to,
          label: displayLabel,
          relationship,
          weight: 2,
          direction: mapDirection(conn.direction),
          customLabel,
          description: getAttr(attrs, 'description') || '',
          evidenceRef: '',
          confidence: 'Confirmed',
          startDate: '',
          endDate: '',
          eventDate: '',
          evidenceItems: '[]',
          location: '',
        },
      }
    })

  return { nodes, edges }
}
