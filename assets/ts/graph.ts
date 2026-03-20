/**
 * Interactive Mind-Map Graph Navigation
 * D3.js force-directed layout with glassmorphism nodes
 * Features: hierarchical folder expansion, focus/zoom, state persistence
 */

declare const d3: any;

interface PageData {
    path: string;   // e.g. "Computer Science/大模型应用开发/2"
    title: string;
    url: string;
    tags?: string[];
}

interface TagData {
    name: string;
    count: number;
    posts: { title: string; url: string }[];
}

interface GraphData {
    center: { name: string; github: string; bilibili: string };
    pages: PageData[];
    tags: TagData[];
}

// ---- Tree node built from flat paths ----
interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
    pages: PageData[];
}

function buildTree(pages: PageData[]): TreeNode {
    const root: TreeNode = { name: '', children: new Map(), pages: [] };

    for (const page of pages) {
        const parts = page.path.split('/');
        let current = root;

        for (const part of parts) {
            if (!current.children.has(part)) {
                current.children.set(part, { name: part, children: new Map(), pages: [] });
            }
            current = current.children.get(part)!;
        }
        current.pages.push(page);
    }

    return root;
}

// ---- Graph types ----
interface GraphNode {
    id: string;
    label: string;
    type: 'center' | 'category' | 'post' | 'tag';
    url?: string;
    github?: string;
    bilibili?: string;
    parentId?: string;
    expanded?: boolean;
    treeRef?: TreeNode;
    treePath?: string;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
}

// ---- State persistence ----
const STATE_KEY = 'graph-expanded-paths';
const FOCUS_KEY = 'graph-focus-path';

function saveState(expandedPaths: string[], focusPath: string) {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(expandedPaths));
        sessionStorage.setItem(FOCUS_KEY, focusPath);
    } catch {}
}

function loadState(): { expandedPaths: string[]; focusPath: string } | null {
    try {
        const paths = sessionStorage.getItem(STATE_KEY);
        const focus = sessionStorage.getItem(FOCUS_KEY) || '';
        if (paths) return { expandedPaths: JSON.parse(paths), focusPath: focus };
    } catch {}
    return null;
}

function clearState() {
    try {
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(FOCUS_KEY);
    } catch {}
}

// ---- Main ----
function initGraph() {
    const dataEl = document.getElementById('graph-data');
    if (!dataEl) return;

    const data: GraphData = JSON.parse(dataEl.textContent || '{}');
    const tree = buildTree(data.pages);
    const container = document.getElementById('graph-container')!;
    const svg = d3.select('#graph-svg');

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Mobile scaling factor
    const isMobile = () => window.innerWidth < 768;
    const mobileScale = () => isMobile() ? 0.65 : 1;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // State
    let nodes: GraphNode[] = [];
    let links: GraphLink[] = [];
    let simulation: any;
    let activeNodes: any;
    let activeLinks: any;
    let nodeIdCounter = 0;
    let focusedNodeId: string | null = null;

    // SVG groups
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'node-shadow')
        .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feDropShadow')
        .attr('dx', 0).attr('dy', 4).attr('stdDeviation', 8)
        .attr('flood-color', 'rgba(0,0,0,0.15)');

    // Zoom container — all graph content goes inside this group
    const zoomGroup = svg.append('g').attr('class', 'graph-zoom-group');
    const linkGroup = zoomGroup.append('g').attr('class', 'graph-links');
    const nodeGroup = zoomGroup.append('g').attr('class', 'graph-nodes');

    // ---- Zoom (no pan — dragging nodes repositions the graph instead) ----
    const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .filter((event: any) => {
            // Allow scroll-wheel zoom + pinch-zoom on touch devices
            if (event.type === 'wheel') return true;
            if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
                return event.touches && event.touches.length >= 2;
            }
            return false;
        })
        .on('zoom', (event: any) => {
            zoomGroup.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Disable double-click zoom (conflicts with node clicks)
    svg.on('dblclick.zoom', null);

    // Set initial zoom — smaller on mobile to fit more nodes
    const initialScale = isMobile() ? 0.9 : 1.2;
    const initialTransform = d3.zoomIdentity
        .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
        .scale(initialScale);
    svg.call(zoom.transform, initialTransform);

    // ---- Focus helpers ----
    function isFocused(d: GraphNode): boolean {
        if (!focusedNodeId) return d.type === 'center' || d.parentId === 'center' || !d.parentId;
        return d.id === focusedNodeId;
    }

    function isFocusChild(d: GraphNode): boolean {
        if (!focusedNodeId) return false;
        return d.parentId === focusedNodeId;
    }

    function isBackground(d: GraphNode): boolean {
        return !isFocused(d) && !isFocusChild(d);
    }

    function getNodeScale(d: GraphNode): number {
        if (!focusedNodeId) return 1.0;
        if (isFocused(d) || isFocusChild(d)) return 1.0;
        return 0.6;
    }

    // ---- Node dimensions ----
    function getNodeWidth(d: GraphNode): number {
        const s = mobileScale();
        if (d.type === 'center') return 160 * s;
        if (d.type === 'category' || d.type === 'tag') return 180 * s;
        return 170 * s;
    }

    function getNodeHeight(d: GraphNode): number {
        const s = mobileScale();
        if (d.type === 'center') return 90 * s;
        if (d.type === 'category' || d.type === 'tag') return 56 * s;
        return 48 * s;
    }

    // ---- Check if a tree node has expandable content ----
    function hasContent(treeNode: TreeNode): boolean {
        return treeNode.children.size > 0 || treeNode.pages.length > 0;
    }

    // ---- Apply focus styling ----
    function applyFocusStyles() {
        nodeGroup.selectAll('.graph-node-group').each(function(this: any, d: GraphNode) {
            const innerDiv = d3.select(this).select('.graph-node');
            if (innerDiv.empty()) return;

            const scale = getNodeScale(d);
            const bg = isBackground(d) && !!focusedNodeId;
            const node = innerDiv.node() as HTMLElement;

            node.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
            node.style.transform = `scale(${scale})`;
            node.style.opacity = bg ? '0.4' : '1';
        });
    }

    // ---- Get expanded paths ----
    function getExpandedPaths(): string[] {
        return nodes
            .filter(n => n.type === 'category' && n.expanded && n.treePath)
            .map(n => n.treePath!);
    }

    function persistState() {
        const paths = getExpandedPaths();
        const focus = focusedNodeId
            ? (nodes.find(n => n.id === focusedNodeId)?.treePath || '')
            : '';
        saveState(paths, focus);
    }

    // ---- Build main view ----
    function buildMainData() {
        nodes = [];
        links = [];
        nodeIdCounter = 0;
        focusedNodeId = null;

        nodes.push({
            id: 'center',
            label: data.center.name,
            type: 'center',
            github: data.center.github,
            bilibili: data.center.bilibili,
        });

        // Top-level folders from the tree
        tree.children.forEach((child, name) => {
            const catId = `node-${nodeIdCounter++}`;
            nodes.push({
                id: catId,
                label: name,
                type: 'category',
                expanded: false,
                treeRef: child,
                treePath: name,
                parentId: 'center',
            });
            links.push({ source: 'center', target: catId });
        });
    }

    // ---- Update indicator ----
    function updateIndicator(nodeId: string, expanded: boolean) {
        nodeGroup.selectAll('.graph-node-group').each(function(this: any, d: any) {
            if (d.id === nodeId) {
                const indicator = d3.select(this).select('.graph-node__indicator');
                if (!indicator.empty()) {
                    indicator.text(expanded ? '−' : '+');
                }
            }
        });
    }

    // ---- Collect descendants ----
    function collectDescendantIds(parentId: string): string[] {
        const ids: string[] = [];
        for (const child of nodes.filter(n => n.parentId === parentId)) {
            ids.push(child.id);
            ids.push(...collectDescendantIds(child.id));
        }
        return ids;
    }

    // ---- Expand a section silently (for state restore) ----
    function expandSilent(nodeId: string) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.treeRef || node.expanded) return;

        const treeNode = node.treeRef;

        // Add child folders (leaf bundles with a single page become post nodes directly)
        treeNode.children.forEach((child, name) => {
            const isLeafBundle = child.children.size === 0 && child.pages.length === 1;
            if (isLeafBundle) {
                const page = child.pages[0];
                const postId = `post-${nodeIdCounter++}`;
                nodes.push({
                    id: postId,
                    label: page.title,
                    type: 'post',
                    url: page.url,
                    parentId: nodeId,
                    x: width / 2 + (Math.random() - 0.5) * 100,
                    y: height / 2 + (Math.random() - 0.5) * 100,
                });
                links.push({ source: nodeId, target: postId });
            } else {
                const childId = `node-${nodeIdCounter++}`;
                const childPath = node.treePath ? `${node.treePath}/${name}` : name;
                nodes.push({
                    id: childId,
                    label: name,
                    type: 'category',
                    expanded: false,
                    treeRef: child,
                    treePath: childPath,
                    parentId: nodeId,
                    x: width / 2 + (Math.random() - 0.5) * 100,
                    y: height / 2 + (Math.random() - 0.5) * 100,
                });
                links.push({ source: nodeId, target: childId });
            }
        });

        // Add direct pages (files in this folder)
        treeNode.pages.forEach((page) => {
            const postId = `post-${nodeIdCounter++}`;
            nodes.push({
                id: postId,
                label: page.title,
                type: 'post',
                url: page.url,
                parentId: nodeId,
                x: width / 2 + (Math.random() - 0.5) * 100,
                y: height / 2 + (Math.random() - 0.5) * 100,
            });
            links.push({ source: nodeId, target: postId });
        });

        node.expanded = true;
    }

    // ---- Toggle section ----
    function toggleSection(nodeId: string) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.treeRef) return;

        if (node.expanded) {
            // Collapse
            const removeIds = collectDescendantIds(nodeId);
            nodes = nodes.filter(n => !removeIds.includes(n.id));
            links = links.filter(l => {
                const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return !removeIds.includes(sid) && !removeIds.includes(tid);
            });
            node.expanded = false;
            focusedNodeId = node.parentId || null;
            if (focusedNodeId === 'center') focusedNodeId = null;
        } else {
            expandSilent(nodeId);
            focusedNodeId = nodeId;
        }

        updateGraph(false);
        updateIndicator(nodeId, node.expanded!);
        applyFocusStyles();
    }

    // ---- Render / Update ----
    function updateGraph(animate = true) {
        // Links
        const linkSel = linkGroup.selectAll('.graph-link')
            .data(links, (d: any) => {
                const sid = typeof d.source === 'string' ? d.source : d.source.id;
                const tid = typeof d.target === 'string' ? d.target : d.target.id;
                return `${sid}-${tid}`;
            });

        linkSel.exit().remove();

        const linkEnter = linkSel.enter().append('line')
            .attr('class', 'graph-link')
            .attr('opacity', 0);

        if (animate) {
            linkEnter.transition().delay(400).duration(600).attr('opacity', 1);
        } else {
            linkEnter.transition().duration(300).attr('opacity', 1);
        }

        activeLinks = linkEnter.merge(linkSel);

        // Nodes
        const nodeSel = nodeGroup.selectAll('.graph-node-group')
            .data(nodes, (d: any) => d.id);

        nodeSel.exit().each(function(this: any) {
            const el = d3.select(this);
            const innerDiv = el.select('.graph-node');
            if (!innerDiv.empty()) {
                (innerDiv.node() as HTMLElement).style.transform = 'scale(0)';
                (innerDiv.node() as HTMLElement).style.opacity = '0';
            }
            setTimeout(() => el.remove(), 350);
        });

        const nodeEnter = nodeSel.enter().append('g')
            .attr('class', (d: GraphNode) => `graph-node-group graph-node-group--${d.type}`)
            .style('cursor', (d: GraphNode) => d.type === 'post' ? 'pointer' : 'grab');

        nodeEnter.append('foreignObject')
            .attr('width', (d: GraphNode) => getNodeWidth(d))
            .attr('height', (d: GraphNode) => getNodeHeight(d))
            .attr('x', (d: GraphNode) => -getNodeWidth(d) / 2)
            .attr('y', (d: GraphNode) => -getNodeHeight(d) / 2)
            .append('xhtml:div')
            .attr('class', (d: GraphNode) => `graph-node graph-node--${d.type}`)
            .html((d: GraphNode) => {
                if (d.type === 'center') {
                    let socialHtml = '<div class="graph-node__social">';
                    if (d.github) socialHtml += `<a href="${d.github}" target="_blank" rel="noopener" class="graph-social-link" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>`;
                    if (d.bilibili) socialHtml += `<a href="${d.bilibili}" target="_blank" rel="noopener" class="graph-social-link" title="Bilibili"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg></a>`;
                    socialHtml += '</div>';
                    return `<div class="graph-node__label">${d.label}</div>${socialHtml}`;
                }
                if (d.type === 'category') {
                    const expandable = d.treeRef ? hasContent(d.treeRef) : false;
                    const indicator = expandable ? (d.expanded ? '−' : '+') : '';
                    return `<div class="graph-node__label">${d.label}${indicator ? `<span class="graph-node__indicator">${indicator}</span>` : ''}</div>`;
                }
                return `<div class="graph-node__label">${d.label}</div>`;
            });

        // Entry animation
        nodeEnter.each(function(this: any, d: GraphNode, i: number) {
            const el = d3.select(this);
            const delay = animate ? (d.type === 'center' ? 0 : 200 + i * 150) : 0;
            const innerDiv = el.select('foreignObject div.graph-node');
            innerDiv
                .style('transform', 'scale(0)')
                .style('opacity', '0')
                .style('transition', `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.4s ease ${delay}ms`);
            setTimeout(() => {
                const scale = getNodeScale(d);
                const bg = isBackground(d) && !!focusedNodeId;
                innerDiv
                    .style('transform', `scale(${scale})`)
                    .style('opacity', bg ? '0.4' : '1');
            }, 50);
        });

        activeNodes = nodeEnter.merge(nodeSel);

        // Click handlers
        nodeEnter.each(function(this: any, d: GraphNode) {
            const div = d3.select(this).select('foreignObject div.graph-node').node() as HTMLElement;
            if (!div) return;
            div.addEventListener('click', (event: MouseEvent) => {
                if ((event.target as HTMLElement).closest('a')) return;
                event.stopPropagation();
                event.preventDefault();
                if (d.type === 'post' && d.url) {
                    persistState();
                    window.location.href = d.url;
                } else if (d.type === 'category') {
                    toggleSection(d.id);
                }
            });
        });

        // Drag
        const drag = d3.drag()
            .on('start', (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event: any, d: any) => {
                d.fx = event.x; d.fy = event.y;
            })
            .on('end', (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            });

        activeNodes.call(drag);

        // Simulation
        if (simulation) simulation.stop();

        const cx = width / 2;
        const cy = height / 2;

        const ms = mobileScale();
        simulation = d3.forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength((d: GraphNode) => {
                const base = (() => {
                    if (isFocused(d)) return -600;
                    if (isFocusChild(d)) return -400;
                    if (d.type === 'center' && !focusedNodeId) return -600;
                    if (!focusedNodeId) return -400;
                    return -150;
                })();
                return base * ms;
            }))
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance((l: any) => {
                const src = typeof l.source === 'string' ? nodes.find(n => n.id === l.source) : l.source;
                if (src && src.id === focusedNodeId) return 160 * ms;
                if (!focusedNodeId && src && src.type === 'center') return 200 * ms;
                return 130 * ms;
            }).strength(0.8))
            .force('collision', d3.forceCollide().radius((d: GraphNode) => {
                const s = getNodeScale(d);
                return Math.max(getNodeWidth(d), getNodeHeight(d)) / 2 * s + 12;
            }))
            .force('x', d3.forceX((d: GraphNode) => cx).strength((d: GraphNode) => {
                if (focusedNodeId && d.id === focusedNodeId) return 0.3;
                if (isFocusChild(d)) return 0.05;
                if (isBackground(d) && focusedNodeId) return 0.02;
                return 0.05;
            }))
            .force('y', d3.forceY((d: GraphNode) => cy).strength((d: GraphNode) => {
                if (focusedNodeId && d.id === focusedNodeId) return 0.3;
                if (isFocusChild(d)) return 0.05;
                if (isBackground(d) && focusedNodeId) return 0.02;
                return 0.05;
            }))
            .on('tick', tickUpdate);

        simulation.alpha(animate ? 1 : 0.5).restart();
    }

    function tickUpdate() {
        if (activeLinks) {
            activeLinks
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
        }
        if (activeNodes) {
            activeNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
    }

    // ---- Back button ----
    const backBtn = document.getElementById('graph-back-btn');
    backBtn?.addEventListener('click', () => {
        buildMainData();
        updateGraph(true);
        if (backBtn) backBtn.style.display = 'none';
    });

    // ---- Resize ----
    window.addEventListener('resize', () => {
        width = container.clientWidth || window.innerWidth;
        height = container.clientHeight || window.innerHeight;
        svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
        if (simulation) {
            simulation.force('x', d3.forceX(width / 2).strength(0.05));
            simulation.force('y', d3.forceY(height / 2).strength(0.05));
            simulation.alpha(0.3).restart();
        }
    });

    // ---- Restore or init ----
    function restoreState() {
        const saved = loadState();
        if (!saved || saved.expandedPaths.length === 0) {
            buildMainData();
            updateGraph(true);
            return;
        }

        clearState();
        buildMainData();

        // Sort by depth so parents expand first
        const sortedPaths = [...saved.expandedPaths].sort((a, b) => a.split('/').length - b.split('/').length);

        for (const path of sortedPaths) {
            const node = nodes.find(n => n.treePath === path && n.type === 'category');
            if (node) expandSilent(node.id);
        }

        if (saved.focusPath) {
            const focusNode = nodes.find(n => n.treePath === saved.focusPath);
            if (focusNode) focusedNodeId = focusNode.id;
        }

        updateGraph(false);
        nodes.filter(n => n.expanded).forEach(n => updateIndicator(n.id, true));
        applyFocusStyles();
    }

    restoreState();
}

// ---- Boot ----
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
} else {
    initGraph();
}
