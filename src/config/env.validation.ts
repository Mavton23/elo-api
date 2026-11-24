import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

/**
 * Variáveis de ambiente obrigatórias/opcionais.
 * A aplicação recusa arrancar se alguma obrigatória faltar ou for inválida,
 * em vez de falhar mais tarde em produção.
 */
class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional() @Transform(toInt) @IsInt() @Min(1) @Max(65535)
  PORT?: number;

  @IsString()
  DATABASE_URL: string;

  @IsString() @MinLength(32, { message: 'JWT_SECRET deve ter pelo menos 32 caracteres' })
  JWT_SECRET: string;

  @IsString() @MinLength(32, { message: 'REFRESH_TOKEN_SECRET deve ter pelo menos 32 caracteres' })
  REFRESH_TOKEN_SECRET: string;

  @IsOptional() @IsString()
  JWT_EXPIRATION?: string;

  @IsOptional() @IsString()
  REFRESH_TOKEN_EXPIRATION?: string;

  @IsOptional() @IsString()
  ALLOWED_ORIGINS?: string;

  @IsOptional() @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional() @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional() @IsString()
  CLOUDINARY_API_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }

  if (validated.JWT_SECRET === validated.REFRESH_TOKEN_SECRET) {
    throw new Error('JWT_SECRET e REFRESH_TOKEN_SECRET têm de ser diferentes');
  }

  return { ...config, ...validated };
}
