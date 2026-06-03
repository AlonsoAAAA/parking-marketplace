import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/guards/guards';

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'Teléfono inválido — solo dígitos, 10-13 caracteres' })
  phone?: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return { data: user };
  }

  @Patch('me')
  @UseGuards(JwtGuard)
  async updateMe(@Body() dto: UpdateUserDto, @Req() req: any) {
    const user = await this.usersService.update(req.user.id, dto);
    return { data: user };
  }
}
