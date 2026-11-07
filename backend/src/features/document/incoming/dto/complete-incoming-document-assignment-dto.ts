import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CompleteIncomingDocumentAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/\S/, {
    message: "Action taken must not be empty.",
  })
  actionTaken!: string;
}
