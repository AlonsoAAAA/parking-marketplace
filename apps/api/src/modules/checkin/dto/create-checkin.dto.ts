import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCheckinDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate: string;

  @IsString()
  @IsNotEmpty()
  photoFront: string;

  @IsString()
  @IsNotEmpty()
  photoBack: string;

  @IsString()
  @IsNotEmpty()
  photoLeft: string;

  @IsString()
  @IsNotEmpty()
  photoRight: string;
}
