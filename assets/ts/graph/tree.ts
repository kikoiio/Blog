import type { GraphNode, IndexEntry, PageData, TreeNode } from './types';

const titleCollator = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
});

export function buildTree(pages: PageData[]): TreeNode {
    const root: TreeNode = { name: '', children: new Map(), pages: [] };

    for (const page of pages) {
        const parts = page.path.split('/').filter(Boolean);
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

export function hasContent(treeNode: TreeNode): boolean {
    return treeNode.children.size > 0 || treeNode.pages.length > 0;
}

export function collectDescendantPages(treeNode: TreeNode): PageData[] {
    const pages = [...treeNode.pages];

    treeNode.children.forEach((child) => {
        pages.push(...collectDescendantPages(child));
    });

    return pages;
}

function duplicateKey(title: string): string {
    return title.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
}

export function buildIndexEntries(treeNode: TreeNode): IndexEntry[] {
    const pages = collectDescendantPages(treeNode);
    const titleCounts = new Map<string, number>();

    pages.forEach((page) => {
        const key = duplicateKey(page.title);
        titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
    });

    return pages
        .map((page) => ({
            title: page.title,
            url: page.url,
            directoryPath: page.path,
            showPath: (titleCounts.get(duplicateKey(page.title)) || 0) > 1,
        }))
        .sort((a, b) => (
            titleCollator.compare(a.title, b.title)
            || titleCollator.compare(a.directoryPath, b.directoryPath)
            || a.url.localeCompare(b.url)
        ));
}

export function shouldOpenIndex(node: GraphNode): boolean {
    if (node.type !== 'category' || !node.treeRef || !node.treePath) return false;

    const depth = node.treePath.split('/').filter(Boolean).length;
    if (depth >= 2) return true;

    return depth === 1
        && node.treeRef.children.size === 0
        && collectDescendantPages(node.treeRef).length > 0;
}
