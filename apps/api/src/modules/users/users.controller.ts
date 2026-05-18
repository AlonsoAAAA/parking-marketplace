import { Controller, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/guards/guards';

class UpdateUserDto {
  name?: string;
  email?: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtGuard)
  async updateMe(@Body() dto: UpdateUserDto, @Req() req: any) {
    const user = await this.usersService.update(req.user.id, dto);
    return { data: user };
  }
}
