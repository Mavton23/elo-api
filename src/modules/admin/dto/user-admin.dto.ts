import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsDateString, IsString, IsEnum, IsBoolean, IsOptional, IsNumber, Min, Max, IsEmail, IsStrongPassword } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Department, MemberRank, UnitType, SecurityLevel, MaritalStatus, AdminLevel, TrainingCourse } from '@prisma/client';

export class CreateMemberDto {
  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  nip: string;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  biNumber: string;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  nuit: string;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  placeOfBirth: string;

  @ApiProperty({ required: false, default: 'Moçambicana' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({ enum: MaritalStatus })
  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @ApiProperty({ enum: MemberRank })
  @IsEnum(MemberRank)
  memberRank: MemberRank;

  @ApiProperty({ required: false, default: 'Não informada' })
  @IsString()
  @IsOptional()
  currentPosition?: string;

  @ApiProperty({ enum: Department })
  @IsEnum(Department)
  department: Department;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  unit: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unitType: UnitType;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  province: string;

  @ApiProperty({ required: false })
  @IsEnum(TrainingCourse)
  @IsOptional()
  trainingCourse?: TrainingCourse;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trainingSchool?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  graduationYear?: number;

  @ApiProperty()
  @IsDateString()
  entryDate: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  institutionalEmail?: string;

  @ApiProperty({ required: false })
  @IsPhoneNumber('MZ')
  @IsOptional()
  officialPhone?: string;
}

export class UserFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: Department })
  @IsEnum(Department)
  @IsOptional()
  department?: Department;

  @ApiPropertyOptional({ enum: MemberRank })
  @IsEnum(MemberRank)
  @IsOptional()
  rank?: MemberRank;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === true || value === 'true'))
  isActive?: boolean;

  @ApiPropertyOptional({ enum: AdminLevel })
  @IsEnum(AdminLevel)
  @IsOptional()
  adminLevel?: AdminLevel;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class UserCreateDataDto {
  @ApiProperty()
  @IsString()
  nip: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  biNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nuit: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  institutionalEmail?: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ enum: MemberRank })
  @IsEnum(MemberRank)
  memberRank: MemberRank;

  @ApiProperty({ enum: Department })
  @IsEnum(Department)
  department: Department;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unitType: UnitType;

  @ApiProperty()
  @IsString()
  province: string;

  @ApiProperty()
  @IsString()
  currentPosition: string;

  @ApiProperty()
  @IsString()
  dateOfBirth: string;

  @ApiProperty()
  @IsString()
  placeOfBirth: string;

  @ApiProperty()
  @IsString()
  nationality: string;

  @ApiProperty({ enum: MaritalStatus })
  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @ApiProperty()
  @IsString()
  entryDate: string;

  @ApiProperty({ enum: SecurityLevel })
  @IsEnum(SecurityLevel)
  securityLevel: SecurityLevel;

  @ApiPropertyOptional({ enum: AdminLevel })
  @IsEnum(AdminLevel)
  @IsOptional()
  adminLevel?: AdminLevel;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  adminPermissions?: any[];
}

/** Atualização parcial: só os campos enviados são alterados. */
export class UserUpdateDataDto extends PartialType(OmitType(UserCreateDataDto, ['password'] as const)) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password?: string;
}

export class ToggleUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;
}

export class UpdateSecurityLevelDto {
  @ApiProperty({ enum: SecurityLevel })
  @IsEnum(SecurityLevel)
  securityLevel: SecurityLevel;
}