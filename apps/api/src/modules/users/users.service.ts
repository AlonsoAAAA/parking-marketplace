import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private repo: Repository<UserEntity>,
  ) {}

  findByPhone(phone: string) {
    return this.repo.findOne({ where: { phone } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: { phone: string; name: string; role: string; channel: string }) {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, data: { name?: string; email?: string }) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }
}
