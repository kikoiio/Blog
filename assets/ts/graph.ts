/**
 * Interactive Mind-Map Graph Navigation
 * D3.js force-directed layout with glassmorphism nodes
 */

declare const d3: any;

interface PostData {
    title: string;
    url: string;
    tags?: string[];
}

interface CategoryData {
    name: string;
    posts: PostData[];
}

interface TagData {
    name: string;
    count: number;
    posts: PostData[];
}

interface GraphData {
    center: { name: string; github: string; bilibili: string };
    categories: CategoryData[];
    tags: TagData[];
}

interface GraphNode {
    id: string;
    label: string;
    type: 'center' | 'category' | 'post' | 'tag';
    url?: string;
    github?: string;
    bilibili?: string;
    parentId?: string;
    expanded?: boolean;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
}

// ---- Main ----
function initGraph() {
    const dataEl = document.getElementById('graph-data');
    if (!dataEl) return;

    const data: GraphData = JSON.parse(dataEl.textContent || '{}');
    const container = document.getElementById('graph-container')!;
    const svg = d3.select('#graph-svg');

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // State
    let currentView: 'main' | 'tags' = 'main';
    let nodes: GraphNode[] = [];
    let links: GraphLink[] = [];
    let simulation: any;
    let activeNodes: any;  // d3 selection of current (non-exiting) nodes
    let activeLinks: any;  // d3 selection of current (non-exiting) links

    // SVG groups
    const defs = svg.append('defs');

    // Drop shadow filter
    const filter = defs.append('filter').attr('id', 'node-shadow')
        .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feDropShadow')
        .attr('dx', 0).attr('dy', 4).attr('stdDeviation', 8)
        .attr('flood-color', 'rgba(0,0,0,0.15)');

    const linkGroup = svg.append('g').attr('class', 'graph-links');
    const nodeGroup = svg.append('g').attr('class', 'graph-nodes');

    // ---- Build main view data ----
    function buildMainData() {
        nodes = [];
        links = [];

        // Center node
        nodes.push({
            id: 'center',
            label: data.center.name,
            type: 'center',
            github: data.center.github,
            bilibili: data.center.bilibili,
        });

        // Category nodes
        data.categories.forEach((cat, i) => {
            const catId = `cat-${i}`;
            nodes.push({
                id: catId,
                label: cat.name,
                type: 'category',
                expanded: false,
            });
            links.push({ source: 'center', target: catId });
        });
    }

    // ---- Build tags view data ----
    function buildTagsData() {
        nodes = [];
        links = [];

        nodes.push({
            id: 'center',
            label: data.center.name,
            type: 'center',
            github: data.center.github,
            bilibili: data.center.bilibili,
        });

        data.tags.forEach((tag, i) => {
            const tagId = `tag-${i}`;
            nodes.push({
                id: tagId,
                label: tag.name,
                type: 'tag',
            });
            links.push({ source: 'center', target: tagId });
        });
    }

    // ---- Update indicator on node ----
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

    // ---- Toggle category expansion ----
    function toggleCategory(catIndex: number) {
        const catId = `cat-${catIndex}`;
        const catNode = nodes.find(n => n.id === catId);
        if (!catNode) return;

        const cat = data.categories[catIndex];

        if (catNode.expanded) {
            // Collapse: remove post nodes
            const postIds = cat.posts.map((_, pi) => `post-${catIndex}-${pi}`);
            nodes = nodes.filter(n => !postIds.includes(n.id));
            links = links.filter(l => {
                const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return !postIds.includes(sid) && !postIds.includes(tid);
            });
            catNode.expanded = false;
        } else {
            // Expand: add post nodes
            cat.posts.forEach((post, pi) => {
                const postId = `post-${catIndex}-${pi}`;
                nodes.push({
                    id: postId,
                    label: post.title,
                    type: 'post',
                    url: post.url,
                    parentId: catId,
                    x: (catNode.x || width / 2) + (Math.random() - 0.5) * 60,
                    y: (catNode.y || height / 2) + (Math.random() - 0.5) * 60,
                });
                links.push({ source: catId, target: postId });
            });
            catNode.expanded = true;
        }

        updateGraph(false);
        updateIndicator(catId, catNode.expanded!);
    }

    // ---- Toggle tag expansion ----
    function toggleTag(tagIndex: number) {
        const tagId = `tag-${tagIndex}`;
        const tagNode = nodes.find(n => n.id === tagId);
        if (!tagNode) return;

        const tag = data.tags[tagIndex];

        if ((tagNode as any).expanded) {
            const postIds = tag.posts.map((_, pi) => `tpost-${tagIndex}-${pi}`);
            nodes = nodes.filter(n => !postIds.includes(n.id));
            links = links.filter(l => {
                const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return !postIds.includes(sid) && !postIds.includes(tid);
            });
            (tagNode as any).expanded = false;
        } else {
            tag.posts.forEach((post, pi) => {
                const postId = `tpost-${tagIndex}-${pi}`;
                nodes.push({
                    id: postId,
                    label: post.title,
                    type: 'post',
                    url: post.url,
                    parentId: tagId,
                    x: (tagNode.x || width / 2) + (Math.random() - 0.5) * 60,
                    y: (tagNode.y || height / 2) + (Math.random() - 0.5) * 60,
                });
                links.push({ source: tagId, target: postId });
            });
            (tagNode as any).expanded = true;
        }

        updateGraph(false);
        updateIndicator(tagId, (tagNode as any).expanded);
    }

    // ---- Node dimensions ----
    function getNodeWidth(d: GraphNode): number {
        if (d.type === 'center') return 140;
        if (d.type === 'category' || d.type === 'tag') return 160;
        return 150;
    }

    function getNodeHeight(d: GraphNode): number {
        if (d.type === 'center') return 80;
        if (d.type === 'category' || d.type === 'tag') return 50;
        return 42;
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

        // foreignObject for HTML rendering
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
                if (d.type === 'category' || d.type === 'tag') {
                    const indicator = (d as any).expanded ? '−' : '+';
                    return `<div class="graph-node__label">${d.label}<span class="graph-node__indicator">${indicator}</span></div>`;
                }
                return `<div class="graph-node__label">${d.label}</div>`;
            });

        // Entry animation: use the inner div (not foreignObject) for CSS transforms
        nodeEnter.each(function(this: any, d: GraphNode, i: number) {
            const el = d3.select(this);
            const delay = animate ? (d.type === 'center' ? 0 : 200 + i * 150) : 0;
            const innerDiv = el.select('foreignObject div.graph-node');
            innerDiv
                .style('transform', 'scale(0)')
                .style('opacity', '0')
                .style('transition', `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.4s ease ${delay}ms`);
            setTimeout(() => {
                innerDiv.style('transform', 'scale(1)').style('opacity', '1');
            }, 50);
        });

        activeNodes = nodeEnter.merge(nodeSel);

        // Click handlers — attach to inner HTML divs (foreignObject intercepts SVG events)
        nodeEnter.each(function(this: any, d: GraphNode) {
            const div = d3.select(this).select('foreignObject div.graph-node').node() as HTMLElement;
            if (!div) return;
            div.addEventListener('click', (event: MouseEvent) => {
                // Don't intercept clicks on actual links (github, bilibili)
                if ((event.target as HTMLElement).closest('a')) return;
                event.stopPropagation();
                event.preventDefault();
                if (d.type === 'post' && d.url) {
                    window.location.href = d.url;
                } else if (d.type === 'category') {
                    const idx = parseInt(d.id.split('-')[1]);
                    toggleCategory(idx);
                } else if (d.type === 'tag') {
                    const idx = parseInt(d.id.split('-')[1]);
                    toggleTag(idx);
                }
            });
        });

        // Drag
        const drag = d3.drag()
            .on('start', (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event: any, d: any) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        activeNodes.call(drag);

        // Update simulation
        if (simulation) simulation.stop();

        simulation = d3.forceSimulation(nodes)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength((d: GraphNode) => {
                if (d.type === 'center') return -500;
                if (d.type === 'category' || d.type === 'tag') return -350;
                return -200;
            }))
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance((l: any) => {
                const src = typeof l.source === 'string' ? nodes.find(n => n.id === l.source) : l.source;
                if (src && src.type === 'center') return 180;
                return 120;
            }).strength(0.8))
            .force('collision', d3.forceCollide().radius((d: GraphNode) => {
                return Math.max(getNodeWidth(d), getNodeHeight(d)) / 2 + 15;
            }))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
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
            activeNodes
                .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
    }

    // ---- Mouse parallax ----
    let parallaxEnabled = !('ontouchstart' in window);
    if (parallaxEnabled) {
        container.addEventListener('mousemove', (e) => {
            const cx = width / 2;
            const cy = height / 2;
            const dx = (e.clientX - cx) / cx;
            const dy = (e.clientY - cy) / cy;
            const offsetX = dx * -5;
            const offsetY = dy * -5;
            svg.style('transform', `translate(${offsetX}px, ${offsetY}px)`);
        });

        container.addEventListener('mouseleave', () => {
            svg.transition().duration(600).style('transform', 'translate(0px, 0px)');
        });
    }

    // ---- View switching ----
    const tagsBtn = document.getElementById('tags-view-btn');
    const backBtn = document.getElementById('graph-back-btn');

    tagsBtn?.addEventListener('click', () => {
        currentView = 'tags';
        buildTagsData();
        updateGraph(true);
        tagsBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'flex';
    });

    backBtn?.addEventListener('click', () => {
        currentView = 'main';
        buildMainData();
        updateGraph(true);
        if (backBtn) backBtn.style.display = 'none';
        if (tagsBtn) tagsBtn.style.display = 'flex';
    });

    // ---- Resize ----
    window.addEventListener('resize', () => {
        width = container.clientWidth || window.innerWidth;
        height = container.clientHeight || window.innerHeight;
        svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

        if (simulation) {
            simulation.force('center', d3.forceCenter(width / 2, height / 2));
            simulation.force('x', d3.forceX(width / 2).strength(0.05));
            simulation.force('y', d3.forceY(height / 2).strength(0.05));
            simulation.alpha(0.3).restart();
        }
    });

    // ---- Init ----
    buildMainData();
    updateGraph(true);
}

// ---- Boot ----
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
} else {
    initGraph();
}
