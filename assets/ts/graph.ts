/**
 * Interactive Mind-Map Graph Navigation
 * D3.js force-directed layout with glassmorphism nodes
 * Features: hierarchical folder expansion, focus/zoom, state persistence
 */

import { renderGraphNode } from './graph/renderNode';
import { clearState, loadState, saveState } from './graph/state';
import { buildTree } from './graph/tree';
import type { GraphData, GraphLink, GraphNode } from './graph/types';

declare const d3: any;

type GraphEndpoint = string | GraphNode;
type DragEvent = { active: boolean; x: number; y: number };
type ZoomEvent = { type: string; touches?: TouchList; transform: unknown };

function endpointId(endpoint: GraphEndpoint): string {
    return typeof endpoint === 'string' ? endpoint : endpoint.id;
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
        .filter((event: ZoomEvent) => {
            // Allow scroll-wheel zoom + pinch-zoom on touch devices
            if (event.type === 'wheel') return true;
            if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
                return event.touches && event.touches.length >= 2;
            }
            return false;
        })
        .on('zoom', (event: ZoomEvent) => {
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

    // ---- Apply focus styling ----
    function applyFocusStyles() {
        nodeGroup.selectAll('.graph-node-group').each(function(this: SVGGElement, d: GraphNode) {
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
        nodeGroup.selectAll('.graph-node-group').each(function(this: SVGGElement, d: GraphNode) {
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

        // Add child folders as category nodes
        treeNode.children.forEach((child, name) => {
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
    let isCollapsing = false;

    function toggleSection(nodeId: string) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.treeRef) return;

        if (node.expanded) {
            if (isCollapsing) return;
            isCollapsing = true;

            const removeIds = collectDescendantIds(nodeId);
            const parentX = node.x || width / 2;
            const parentY = node.y || height / 2;
            const duration = 450;

            // Stop simulation so tick doesn't fight the animation
            if (simulation) simulation.stop();

            // Animate descendant nodes toward parent position + shrink
            nodeGroup.selectAll('.graph-node-group')
                .filter((d: GraphNode) => removeIds.includes(d.id))
                .each(function(this: SVGGElement) {
                    const el = d3.select(this);
                    const innerDiv = el.select('.graph-node');
                    if (!innerDiv.empty()) {
                        const htmlEl = innerDiv.node() as HTMLElement;
                        htmlEl.style.transition = `transform ${duration}ms cubic-bezier(0.55, 0, 1, 0.45), opacity ${duration * 0.8}ms ease`;
                        htmlEl.style.transform = 'scale(0)';
                        htmlEl.style.opacity = '0';
                    }
                    el.transition()
                        .duration(duration)
                        .ease(d3.easeCubicIn)
                        .attr('transform', `translate(${parentX},${parentY})`);
                });

            // Animate links: endpoints converge on parent position + fade
            linkGroup.selectAll('.graph-link')
                .each(function(this: SVGLineElement, d: GraphLink) {
                    const sid = endpointId(d.source);
                    const tid = endpointId(d.target);
                    const srcIsDesc = removeIds.includes(sid);
                    const tgtIsDesc = removeIds.includes(tid);
                    if (!srcIsDesc && !tgtIsDesc) return;

                    const el = d3.select(this);
                    const t = el.transition().duration(duration).ease(d3.easeCubicIn);
                    if (srcIsDesc) t.attr('x1', parentX).attr('y1', parentY);
                    if (tgtIsDesc) t.attr('x2', parentX).attr('y2', parentY);
                    t.attr('opacity', 0);
                });

            // After animation, clean up data and rebuild
            setTimeout(() => {
                nodes = nodes.filter(n => !removeIds.includes(n.id));
                links = links.filter(l => {
                    const sid = endpointId(l.source);
                    const tid = endpointId(l.target);
                    return !removeIds.includes(sid) && !removeIds.includes(tid);
                });
                node.expanded = false;
                focusedNodeId = node.parentId || null;
                if (focusedNodeId === 'center') focusedNodeId = null;

                updateGraph(false);
                updateIndicator(nodeId, false);
                applyFocusStyles();
                isCollapsing = false;
            }, duration);

        } else {
            expandSilent(nodeId);
            focusedNodeId = nodeId;
            updateGraph(false);
            updateIndicator(nodeId, node.expanded!);
            applyFocusStyles();
        }
    }

    // ---- Render / Update ----
    function updateGraph(animate = true) {
        // Links
        const linkSel = linkGroup.selectAll('.graph-link')
            .data(links, (d: GraphLink) => {
                const sid = endpointId(d.source);
                const tid = endpointId(d.target);
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
            .data(nodes, (d: GraphNode) => d.id);

        nodeSel.exit().remove();

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
            .html((d: GraphNode) => renderGraphNode(d));

        // Entry animation
        nodeEnter.each(function(this: SVGGElement, d: GraphNode, i: number) {
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
        nodeEnter.each(function(this: SVGGElement, d: GraphNode) {
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
            .on('start', (event: DragEvent, d: GraphNode) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event: DragEvent, d: GraphNode) => {
                d.fx = event.x; d.fy = event.y;
            })
            .on('end', (event: DragEvent, d: GraphNode) => {
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
            .force('link', d3.forceLink(links).id((d: GraphNode) => d.id).distance((l: GraphLink) => {
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
                .attr('x1', (d: GraphLink) => (d.source as GraphNode).x)
                .attr('y1', (d: GraphLink) => (d.source as GraphNode).y)
                .attr('x2', (d: GraphLink) => (d.target as GraphNode).x)
                .attr('y2', (d: GraphLink) => (d.target as GraphNode).y);
        }
        if (activeNodes) {
            activeNodes.attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
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
