import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class DivisionNoticeOfActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/\S/, {
    message: "Notice of action cannot be empty.",
  })
  noticeOfAction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  noticeDescription?: string | null;
}
