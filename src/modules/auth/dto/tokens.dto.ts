import { AdminLevel, AdminModule, AdminAction, TrainingCourse } from "@prisma/client";

export class TokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string = 'Bearer';
  user: AuthUserDto;
}

export class AuthAdminDto {
  isAdmin: boolean;
  adminLevel?: AdminLevel;
  permissions?: {
    module: AdminModule;
    actions: AdminAction[];
  }[];
}


export class AuthUserDto {
  id: string;
  nip: string;
  fullName: string;
  trainingCourse?: TrainingCourse;
  memberRank: string;
  currentPosition?: string;
  department: string;
  unit: string;
  province: string;
  securityLevel: string;
  institutionalEmail?: string;
  /** Senha temporária definida por um administrador: trocar antes de continuar. */
  mustChangePassword?: boolean;

  admin?: AuthAdminDto;
}