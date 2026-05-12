export interface PageData {
    path: string;
    title: string;
    url: string;
    tags?: string[];
}

export interface TagData {
    name: string;
    count: number;
    posts: { title: string; url: string }[];
}

export interface GraphData {
    center: { name: string; github: string; bilibili: string };
    pages: PageData[];
    tags: TagData[];
}

export interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
    pages: PageData[];
}

export interface GraphNode {
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

export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
}

export interface SavedGraphState {
    expandedPaths: string[];
    focusPath: string;
}
