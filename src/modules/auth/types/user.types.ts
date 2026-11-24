import { AdminLevel, Department, MemberRank, SecurityLevel } from '@prisma/client';

/**
 * Payload mínimo do JWT. Não colocar dados pessoais aqui:
 * o JWT é apenas codificado em base64 e pode ser lido por quem o intercetar.
 */
export interface JwtPayload {
  sub: string; // id do utilizador
  tv: number; // tokenVersion (revogação)
  typ: 'access' | 'refresh' | 'mfa';
  jti?: string; // identificador único do token
  cid?: string; // desafio 2FA (uso único)
  nonce?: string; // desafio a assinar pelo telemóvel de confiança
  iat?: number;
  exp?: number;
}

/**
 * Utilizador autenticado injetado em `req.user`.
 * Carregado da base de dados em cada pedido, por isso reflete sempre o estado
 * atual (patente, unidade, desativação, privilégios de admin).
 */
export interface AuthUser {
  id: string;
  nip: string;
  fullName: string;
  mustChangePassword?: boolean;
  memberRank: MemberRank;
  /** @deprecated usar memberRank — mantido por compatibilidade */
  rank: MemberRank;
  department: Department;
  unit: string;
  province: string;
  currentPosition: string;
  securityLevel: SecurityLevel;
  isAdmin: boolean;
  adminLevel?: AdminLevel;
  admin?: {
    isAdmin: boolean;
    adminLevel?: string;
    permissions?: Array<{ module: string; actions: string[] }>;
  };
}

// Alias para manter compatibilidade
export type User = AuthUser;
