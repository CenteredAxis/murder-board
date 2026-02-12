import { useState, useCallback } from 'react'
import { NODE_SHAPES, NODE_COLORS, RELATIONSHIP_COLORS, emptyNode, emptyEdge } from '../constants'
import { saveGraph } from '../storage'

export function useCytoscapeActions(cyRef, clearCentrality) {
  // Form state
  const [nodeForm, setNodeForm] = useState({ ...emptyNode })
  const [edgeForm, setEdgeForm] = useState({ ...emptyEdge })
  const [activeTab, setActiveTab] = useState('nodes')

  // Graph data for sidebar lists & dropdowns
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  // Selected element details
  const [selected, setSelected] = useState(null)

  // Edit mode
  const [editingNode, setEditingNode] = useState(null)
  const [editingEdge, setEditingEdge] = useState(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // ── Helpers ──
  function clearHighlights(cy) {
    if (cy) cy.elements().removeClass('highlighted dimmed query-path time-filtered')
  }

  function syncState() {
    const cy = cyRef.current
    if (!cy) return
    setNodes(
      cy.nodes().map((n) => ({
        id: n.data('id'),
        label: n.data('label'),
        type: n.data('nodeType'),
        parent: n.data('parent') || null,
        // Person fields
        status: n.data('status') || '',
        location: n.data('location') || '',
        tags: n.data('tags') || '[]',
        // Event fields
        eventType: n.data('eventType') || '',
        eventDate: n.data('eventDate') || '',
      }))
    )
    setEdges(
      cy.edges().map((e) => ({
        id: e.data('id'),
        label: e.data('label'),
        source: e.data('source'),
        target: e.data('target'),
        relationship: e.data('relationship'),
        weight: e.data('weight'),
        sourceLabel: cy.getElementById(e.data('source')).data('label'),
        targetLabel: cy.getElementById(e.data('target')).data('label'),
        // New fields
        direction: e.data('direction') || 'directed',
        customLabel: e.data('customLabel') || '',
        confidence: e.data('confidence') || 'Confirmed',
        startDate: e.data('startDate') || '',
        endDate: e.data('endDate') || '',
        eventDate: e.data('eventDate') || '',
        description: e.data('description') || '',
      }))
    )
    saveGraph(cy)
  }

  function runLayout() {
    const cy = cyRef.current
    if (!cy || cy.nodes().length === 0) return
    cy.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 600,
      fit: true,
      padding: 50,
      nodeSeparation: 120,
      idealEdgeLength: 150,
      nodeRepulsion: 6000,
      edgeElasticity: 0.45,
      gravity: 0.3,
      randomize: true,
    }).run()
  }

  // ── Search/Filter ──
  function handleSearch(query) {
    setSearchQuery(query)
    const cy = cyRef.current
    if (!cy) return

    if (!query.trim()) {
      cy.elements().show()
      return
    }

    const q = query.toLowerCase()
    cy.nodes().forEach((node) => {
      const label = (node.data('label') || '').toLowerCase()
      const nodeType = (node.data('nodeType') || '').toLowerCase()
      if (label.includes(q) || nodeType.includes(q)) {
        node.show()
      } else {
        node.hide()
        node.connectedEdges().hide()
      }
    })
    cy.edges().forEach((edge) => {
      const src = cy.getElementById(edge.data('source'))
      const tgt = cy.getElementById(edge.data('target'))
      if (src.visible() && tgt.visible()) {
        edge.show()
      } else {
        edge.hide()
      }
    })
  }

  // ── Clustering ──
  function assignToCluster(childNodeId, parentNodeId) {
    const cy = cyRef.current
    if (!cy || childNodeId === parentNodeId) return
    const parent = cy.getElementById(parentNodeId)
    if (!parent || parent.empty() || parent.data('nodeType') !== 'Organization') return
    const child = cy.getElementById(childNodeId)
    if (!child || child.empty()) return
    child.move({ parent: parentNodeId })
    syncState()
  }

  function removeFromCluster(childNodeId) {
    const cy = cyRef.current
    if (!cy) return
    const child = cy.getElementById(childNodeId)
    if (!child || child.empty()) return
    child.move({ parent: null })
    syncState()
  }

  // ── Add Node ──
  const handleAddNode = useCallback(
    (e) => {
      e.preventDefault()
      const cy = cyRef.current
      if (!cy || !nodeForm.label.trim()) return

      const id = 'n' + Date.now()
      const data = {
        id,
        label: nodeForm.label.trim(),
        nodeType: nodeForm.type,
        metadata: nodeForm.metadata.trim(),
        shape: NODE_SHAPES[nodeForm.type],
        color: NODE_COLORS[nodeForm.type],
        // Person fields (Feature 5)
        role: nodeForm.role?.trim() || '',
        aliases: nodeForm.aliases?.trim() || '',
        status: nodeForm.status || '',
        avatarUrl: nodeForm.avatarUrl?.trim() || '',
        location: nodeForm.location?.trim() || '',
        dob: nodeForm.dob || '',
        // Event fields (Feature 8)
        eventType: nodeForm.eventType || '',
        eventDate: nodeForm.eventDate || '',
        eventLocation: nodeForm.eventLocation?.trim() || '',
        eventDescription: nodeForm.eventDescription?.trim() || '',
        // Tags (Feature 7)
        tags: '[]',
      }

      cy.add({
        group: 'nodes',
        data,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
      })

      setNodeForm({ ...emptyNode })
      clearCentrality()
      syncState()
      runLayout()
    },
    [nodeForm]
  )

  // ── Add Edge ──
  const handleAddEdge = useCallback(
    (e) => {
      e.preventDefault()
      const cy = cyRef.current
      if (!cy || !edgeForm.source || !edgeForm.target || edgeForm.source === edgeForm.target)
        return

      const id = 'e' + Date.now()
      const displayLabel = edgeForm.customLabel?.trim() || edgeForm.relationship

      cy.add({
        group: 'edges',
        data: {
          id,
          source: edgeForm.source,
          target: edgeForm.target,
          label: displayLabel,
          relationship: edgeForm.relationship,
          weight: edgeForm.weight,
          color: RELATIONSHIP_COLORS[edgeForm.relationship] || RELATIONSHIP_COLORS.Unknown,
          // Direction (Feature 3)
          direction: edgeForm.direction || 'directed',
          // Custom label (Feature 12)
          customLabel: edgeForm.customLabel?.trim() || '',
          // Evidence (Feature 2)
          description: edgeForm.description?.trim() || '',
          evidenceRef: edgeForm.evidenceRef?.trim() || '',
          confidence: edgeForm.confidence || 'Confirmed',
          // Temporal (Feature 1)
          startDate: edgeForm.startDate || '',
          endDate: edgeForm.endDate || '',
          eventDate: edgeForm.eventDate || '',
          // Evidence items (Feature 6)
          evidenceItems: '[]',
          // Location (Feature 9)
          location: edgeForm.location?.trim() || '',
        },
      })

      setEdgeForm({ ...emptyEdge })
      clearCentrality()
      syncState()
      runLayout()
    },
    [edgeForm]
  )

  // ── Delete element ──
  function deleteElement(id) {
    const cy = cyRef.current
    if (!cy) return
    const el = cy.getElementById(id)
    if (el) {
      el.remove()
      clearCentrality()
      syncState()
      setSelected(null)
      clearHighlights(cy)
    }
  }

  // ── Edit Node ──
  function startEditNode(id) {
    const cy = cyRef.current
    if (!cy) return
    const el = cy.getElementById(id)
    if (!el) return
    setEditingNode({
      id,
      label: el.data('label'),
      type: el.data('nodeType'),
      metadata: el.data('metadata') || '',
      // Person fields
      role: el.data('role') || '',
      aliases: el.data('aliases') || '',
      status: el.data('status') || '',
      avatarUrl: el.data('avatarUrl') || '',
      location: el.data('location') || '',
      dob: el.data('dob') || '',
      // Event fields
      eventType: el.data('eventType') || '',
      eventDate: el.data('eventDate') || '',
      eventLocation: el.data('eventLocation') || '',
      eventDescription: el.data('eventDescription') || '',
    })
    setEditingEdge(null)
  }

  function saveEditNode() {
    if (!editingNode) return
    const cy = cyRef.current
    if (!cy) return
    const el = cy.getElementById(editingNode.id)
    if (!el) return
    el.data('label', editingNode.label)
    el.data('nodeType', editingNode.type)
    el.data('metadata', editingNode.metadata)
    el.data('shape', NODE_SHAPES[editingNode.type])
    el.data('color', NODE_COLORS[editingNode.type])
    // Person fields
    el.data('role', editingNode.role || '')
    el.data('aliases', editingNode.aliases || '')
    el.data('status', editingNode.status || '')
    el.data('avatarUrl', editingNode.avatarUrl || '')
    el.data('location', editingNode.location || '')
    el.data('dob', editingNode.dob || '')
    // Event fields
    el.data('eventType', editingNode.eventType || '')
    el.data('eventDate', editingNode.eventDate || '')
    el.data('eventLocation', editingNode.eventLocation || '')
    el.data('eventDescription', editingNode.eventDescription || '')

    // Force Cytoscape to re-evaluate data-dependent style selectors (e.g. avatarUrl background-image)
    cy.style().update()

    setEditingNode(null)
    clearCentrality()
    syncState()
    const data = el.data()
    setSelected({
      type: 'node',
      id: data.id,
      label: data.label,
      nodeType: data.nodeType,
      metadata: data.metadata,
      role: data.role,
      aliases: data.aliases,
      status: data.status,
      avatarUrl: data.avatarUrl,
      location: data.location,
      dob: data.dob,
      eventType: data.eventType,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      eventDescription: data.eventDescription,
      tags: data.tags,
      isChild: el.isChild(),
      parentId: el.isChild() ? el.parent().first().data('id') : null,
      parentLabel: el.isChild() ? el.parent().first().data('label') : null,
      connections: el.connectedEdges().map((edge) => ({
        id: edge.data('id'),
        label: edge.data('label'),
        source: edge.data('source'),
        target: edge.data('target'),
        sourceLabel: cy.getElementById(edge.data('source')).data('label'),
        targetLabel: cy.getElementById(edge.data('target')).data('label'),
      })),
    })
  }

  // ── Edit Edge ──
  function startEditEdge(id) {
    const cy = cyRef.current
    if (!cy) return
    const el = cy.getElementById(id)
    if (!el) return
    setEditingEdge({
      id,
      relationship: el.data('relationship'),
      weight: el.data('weight'),
      direction: el.data('direction') || 'directed',
      customLabel: el.data('customLabel') || '',
      description: el.data('description') || '',
      evidenceRef: el.data('evidenceRef') || '',
      confidence: el.data('confidence') || 'Confirmed',
      startDate: el.data('startDate') || '',
      endDate: el.data('endDate') || '',
      eventDate: el.data('eventDate') || '',
      location: el.data('location') || '',
    })
    setEditingNode(null)
  }

  function saveEditEdge() {
    if (!editingEdge) return
    const cy = cyRef.current
    if (!cy) return
    const el = cy.getElementById(editingEdge.id)
    if (!el) return

    const displayLabel = editingEdge.customLabel?.trim() || editingEdge.relationship
    el.data('label', displayLabel)
    el.data('relationship', editingEdge.relationship)
    el.data('weight', editingEdge.weight)
    el.data('color', RELATIONSHIP_COLORS[editingEdge.relationship] || RELATIONSHIP_COLORS.Unknown)
    el.data('direction', editingEdge.direction || 'directed')
    el.data('customLabel', editingEdge.customLabel?.trim() || '')
    el.data('description', editingEdge.description?.trim() || '')
    el.data('evidenceRef', editingEdge.evidenceRef?.trim() || '')
    el.data('confidence', editingEdge.confidence || 'Confirmed')
    el.data('startDate', editingEdge.startDate || '')
    el.data('endDate', editingEdge.endDate || '')
    el.data('eventDate', editingEdge.eventDate || '')
    el.data('location', editingEdge.location?.trim() || '')

    setEditingEdge(null)
    clearCentrality()
    syncState()
    const data = el.data()
    const src = cy.getElementById(data.source)
    const tgt = cy.getElementById(data.target)
    setSelected({
      type: 'edge',
      id: data.id,
      label: data.label,
      relationship: data.relationship,
      weight: data.weight,
      sourceLabel: src.data('label'),
      targetLabel: tgt.data('label'),
      direction: data.direction,
      customLabel: data.customLabel,
      description: data.description,
      evidenceRef: data.evidenceRef,
      confidence: data.confidence,
      startDate: data.startDate,
      endDate: data.endDate,
      eventDate: data.eventDate,
      evidenceItems: data.evidenceItems,
      location: data.location,
    })
  }

  return {
    // State
    nodeForm, setNodeForm,
    edgeForm, setEdgeForm,
    activeTab, setActiveTab,
    nodes, edges,
    selected, setSelected,
    editingNode, setEditingNode,
    editingEdge, setEditingEdge,
    searchQuery, setSearchQuery,
    // Actions
    syncState,
    runLayout,
    handleSearch,
    handleAddNode,
    handleAddEdge,
    deleteElement,
    startEditNode,
    saveEditNode,
    startEditEdge,
    saveEditEdge,
    assignToCluster,
    removeFromCluster,
    clearHighlights,
  }
}
