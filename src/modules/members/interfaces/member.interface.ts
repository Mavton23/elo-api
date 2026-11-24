import { 
  MemberRank, 
  Department, 
  UnitType, 
  MaritalStatus, 
  SecurityLevel 
} from '@prisma/client';

export interface MemberProfile {
  id: string;
  nip: string;
  biNumber: string;
  nuit: string;
  fullName: string;
  dateOfBirth: Date;
  placeOfBirth: string;
  nationality: string;
  maritalStatus: MaritalStatus;
  memberRank: MemberRank;
  currentPosition: string;
  department: Department;
  unit: string;
  unitType: UnitType;
  province: string;
  entryDate: Date;
  institutionalEmail?: string;
  officialPhone?: string;
  isActive: boolean;
  securityLevel: SecurityLevel;
  lastAccess?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetMemberProfileParams {
  id: string;
}

export interface GetMemberProfileQuery {
  includePosts?: boolean;
  includeNotifications?: boolean;
}