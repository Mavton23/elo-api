import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Department, ServiceRequestStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsJWT,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Em multipart/form-data os números chegam como texto. */
const toNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' || value === null ? undefined : Number(value);

/** Aceita objeto JSON ou texto JSON (multipart). */
const toObject = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// --- Prova de vida -----------------------------------------------------------

export class SubmitLifeProofDto {
  @ApiProperty({ description: 'Token devolvido por POST /life-proof/challenge' })
  @IsJWT()
  challengeToken: string;

  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsNumber() @Min(0)
  accuracy?: number;

  @ApiPropertyOptional() @IsOptional() @IsIn(['ios', 'android', 'web'])
  platform?: string;
}

export class CreateLifeProofCampaignDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty() @IsDateString()
  startsAt: string;

  @ApiProperty() @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ enum: Department, isArray: true })
  @IsOptional() @IsArray() @IsEnum(Department, { each: true })
  targetDepartments?: Department[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(11) @IsString({ each: true })
  targetProvinces?: string[];
}

export class UpdateLifeProofCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endsAt?: string;
}

export class ReviewDto {
  @ApiProperty({ enum: ['APROVADO', 'REJEITADO'] })
  @IsIn(['APROVADO', 'REJEITADO'])
  decision: 'APROVADO' | 'REJEITADO';

  @ApiPropertyOptional({ description: 'Obrigatório ao rejeitar' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class ListRequestsQueryDto {
  @ApiPropertyOptional({ enum: ServiceRequestStatus })
  @IsOptional() @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional() @IsOptional() @IsEnum(Department)
  department?: Department;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  province?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

// --- Atualização de dados ----------------------------------------------------

export class CreateDataUpdateRequestDto {
  @ApiProperty({
    description: 'Campos a alterar e novos valores',
    example: { personalPhone: '+258841234567', maritalStatus: 'CASADO' },
  })
  @Transform(toObject)
  @IsObject()
  changes: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  justification?: string;
}
