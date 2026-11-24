import { UnitType } from "@prisma/client";

export interface NodePathItem {
  id: string;
  name: string;
  code: string;
  type: UnitType;
  parentId: string | null;
}