import type { PageData, TreeNode } from './types';

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
