import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { MemberRank, Department } from "@prisma/client";

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

export class CommentResponseDto {
  id: string;
  postId: string;
  author: {
    id: string;
    name: string;
    rank: MemberRank;
    department: Department;
  };
  content: string;
  createdAt: string;
  isEdited: boolean;
}