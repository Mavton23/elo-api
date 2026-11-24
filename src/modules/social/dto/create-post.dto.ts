import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PostCategory, VisibilityLevel } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsEnum(PostCategory)
  category: PostCategory;

  @IsEnum(VisibilityLevel)
  visibility: VisibilityLevel;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        // Converter string separada por vírgula para array
        return value.split(',').map(tag => tag.trim().toUpperCase());
      }
    }
    return value;
  })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}