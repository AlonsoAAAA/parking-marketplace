import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCheckinDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate: string;

  // Única foto obligatoria — las otras 3 son opcionales (ver Scanner.tsx).
  @IsString()
  @IsNotEmpty()
  photoFront: string;

  @IsOptional()
  @IsString()
  photoBack?: string;

  @IsOptional()
  @IsString()
  photoLeft?: string;

  @IsOptional()
  @IsString()
  photoRight?: string;
}
