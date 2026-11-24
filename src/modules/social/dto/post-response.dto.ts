import { ApiProperty } from '@nestjs/swagger';
import { PostCategory, VisibilityLevel, MemberRank, Department } from '@prisma/client';

export class AuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: MemberRank })
  rank: MemberRank;

  @ApiProperty({ enum: Department })
  department: Department;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  avatar?: string;
}

export class MediaDto {
  @ApiProperty()
  type: 'image' | 'document';

  @ApiProperty()
  url: string;

  @ApiProperty({ required: false })
  name?: string;
}

export class PostMetadataDto {
  @ApiProperty()
  likes: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty()
  isBookmarked: boolean;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: PostCategory })
  category: PostCategory;

  @ApiProperty({ enum: VisibilityLevel })
  visibility: VisibilityLevel;

  @ApiProperty({ type: [MediaDto], required: false })
  media?: MediaDto[];

  @ApiProperty({ type: PostMetadataDto })
  metadata: PostMetadataDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ required: false })
  location?: {
    province: string;
    unit: string;
  };

  @ApiProperty({ required: false })
  tags?: string[];
}