export interface HierarchyNode {
  id: string;
  type: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  department?: string;
  province?: string;
  unitType?: string;
  commanderId?: string;
  commanderName?: string;
  isActive: boolean;
  order: number;
  memberCount: number;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
  children?: HierarchyNode[];
}

export interface HierarchyTree {
  id: string;
  name: string;
  code: string;
  type: string;
  memberCount: number;
  childrenCount: number;
  children: HierarchyTree[];
}

export interface HierarchyMember {
  userId: string;
  fullName: string;
  nip: string;
  memberRank: string;
  department: string;
  unit: string;
  role?: string;
  joinedAt: string;
  isActive: boolean;
}