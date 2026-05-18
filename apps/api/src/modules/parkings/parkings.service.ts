import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ParkingsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  findAll() {
    return this.dataSource.query(
      `SELECT * FROM parkings WHERE is_active = true ORDER BY name`,
    );
  }

  async findById(id: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM parkings WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  findByOwner(ownerId: string) {
    return this.dataSource.query(
      `SELECT * FROM parkings WHERE owner_id = $1 ORDER BY name`,
      [ownerId],
    );
  }
}
