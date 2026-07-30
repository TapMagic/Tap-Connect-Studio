export type CollectionDto = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  sortOrder: number;
  pinned: boolean;
  parentId: string | null;
  memberCount: number;
  updatedAt: string;
};
