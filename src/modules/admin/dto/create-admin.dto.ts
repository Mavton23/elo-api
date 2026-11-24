import { IsString, IsEnum, IsArray, IsOptional, ValidateNested, IsEmail, IsStrongPassword } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminLevel, AdminModule, AdminAction } from '@prisma/client';

export class AdminPermissionDto {
  @IsEnum(AdminModule)
  module: AdminModule;

  @IsArray()
  @IsEnum(AdminAction, { each: true })
  actions: AdminAction[];
}

export class CreateAdminDto {
  @IsString()
  userId: string;

  @IsEnum(AdminLevel)
  adminLevel: AdminLevel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminPermissionDto)
  @IsOptional()
  permissions?: AdminPermissionDto[];
}