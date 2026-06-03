import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';

export type VehicleCategory = 'Auto' | 'Sub' | 'Pick Up' | 'Moto';

// ─── NHTSA vPIC API ───────────────────────────────────────────────────────────
const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Tipos NHTSA → categoría interna
const NHTSA_TYPES: { nhtsa: string; category: VehicleCategory }[] = [
  { nhtsa: 'Passenger Car',                        category: 'Auto'    },
  { nhtsa: 'Multipurpose Passenger Vehicle (MPV)', category: 'Sub'     },
  { nhtsa: 'Truck',                                category: 'Pick Up' },
  { nhtsa: 'Motorcycle',                           category: 'Moto'    },
];

// Marcas a sincronizar desde NHTSA (mercado EUA/global)
const NHTSA_MAKES: { nhtsa: string; display: string }[] = [
  { nhtsa: 'nissan',          display: 'Nissan'          },
  { nhtsa: 'volkswagen',      display: 'VW'              },
  { nhtsa: 'toyota',          display: 'Toyota'          },
  { nhtsa: 'honda',           display: 'Honda'           },
  { nhtsa: 'chevrolet',       display: 'Chevrolet'       },
  { nhtsa: 'mazda',           display: 'Mazda'           },
  { nhtsa: 'hyundai',         display: 'Hyundai'         },
  { nhtsa: 'kia',             display: 'KIA'             },
  { nhtsa: 'ford',            display: 'Ford'            },
  { nhtsa: 'dodge',           display: 'Dodge'           },
  { nhtsa: 'mitsubishi',      display: 'Mitsubishi'      },
  { nhtsa: 'suzuki',          display: 'Suzuki'          },
  { nhtsa: 'bmw',             display: 'BMW'             },
  { nhtsa: 'mercedes-benz',   display: 'Mercedes-Benz'   },
  { nhtsa: 'audi',            display: 'Audi'            },
  { nhtsa: 'lexus',           display: 'Lexus'           },
  { nhtsa: 'jeep',            display: 'Jeep'            },
  { nhtsa: 'subaru',          display: 'Subaru'          },
  { nhtsa: 'volvo',           display: 'Volvo'           },
  { nhtsa: 'lincoln',         display: 'Lincoln'         },
  { nhtsa: 'cadillac',        display: 'Cadillac'        },
  { nhtsa: 'porsche',         display: 'Porsche'         },
  { nhtsa: 'land rover',      display: 'Land Rover'      },
  { nhtsa: 'acura',           display: 'Acura'           },
  { nhtsa: 'infiniti',        display: 'Infiniti'        },
  { nhtsa: 'ram',             display: 'RAM'             },
  { nhtsa: 'gmc',             display: 'GMC'             },
  { nhtsa: 'isuzu',           display: 'Isuzu'           },
  { nhtsa: 'kawasaki',        display: 'Kawasaki'        },
  { nhtsa: 'yamaha',          display: 'Yamaha'          },
  { nhtsa: 'ktm',             display: 'KTM'             },
  { nhtsa: 'harley-davidson', display: 'Harley-Davidson' },
];

// Filtro de vehículos comerciales/industriales (excluir en Pick Up)
const COMMERCIAL_RE = /^(nv\b|transit\s|sprinter|express|savana|promaster|metris|master|trafic|vito|cargo|econoline|step van|cutaway|stripped)/i;

// ─── Seed México — modelos relevantes no siempre en NHTSA ────────────────────
interface SeedEntry { make: string; model: string; category: VehicleCategory }

const MEXICO_SEED: SeedEntry[] = [
  // Autos populares en México
  { make:'Nissan',     model:'Versa',      category:'Auto' },
  { make:'Nissan',     model:'Tsuru',      category:'Auto' },
  { make:'Nissan',     model:'March',      category:'Auto' },
  { make:'Nissan',     model:'Sentra',     category:'Auto' },
  { make:'Nissan',     model:'Tiida',      category:'Auto' },
  { make:'VW',         model:'Jetta',      category:'Auto' },
  { make:'VW',         model:'Vento',      category:'Auto' },
  { make:'VW',         model:'Golf',       category:'Auto' },
  { make:'VW',         model:'Polo',       category:'Auto' },
  { make:'VW',         model:'Gol',        category:'Auto' },
  { make:'Toyota',     model:'Yaris',      category:'Auto' },
  { make:'Toyota',     model:'Corolla',    category:'Auto' },
  { make:'Toyota',     model:'Camry',      category:'Auto' },
  { make:'Toyota',     model:'Prius',      category:'Auto' },
  { make:'Honda',      model:'Civic',      category:'Auto' },
  { make:'Honda',      model:'City',       category:'Auto' },
  { make:'Honda',      model:'Fit',        category:'Auto' },
  { make:'Honda',      model:'Accord',     category:'Auto' },
  { make:'Chevrolet',  model:'Aveo',       category:'Auto' },
  { make:'Chevrolet',  model:'Spark',      category:'Auto' },
  { make:'Chevrolet',  model:'Cruze',      category:'Auto' },
  { make:'Chevrolet',  model:'Sonic',      category:'Auto' },
  { make:'Chevrolet',  model:'Onix',       category:'Auto' },
  { make:'Mazda',      model:'Mazda 3',    category:'Auto' },
  { make:'Mazda',      model:'Mazda 6',    category:'Auto' },
  { make:'Hyundai',    model:'Accent',     category:'Auto' },
  { make:'Hyundai',    model:'i10',        category:'Auto' },
  { make:'Hyundai',    model:'i20',        category:'Auto' },
  { make:'Hyundai',    model:'Elantra',    category:'Auto' },
  { make:'KIA',        model:'Rio',        category:'Auto' },
  { make:'KIA',        model:'Forte',      category:'Auto' },
  { make:'Ford',       model:'Fiesta',     category:'Auto' },
  { make:'Ford',       model:'Focus',      category:'Auto' },
  { make:'Ford',       model:'Fusion',     category:'Auto' },
  { make:'SEAT',       model:'Ibiza',      category:'Auto' },
  { make:'SEAT',       model:'León',       category:'Auto' },
  { make:'SEAT',       model:'Toledo',     category:'Auto' },
  { make:'Renault',    model:'Logan',      category:'Auto' },
  { make:'Renault',    model:'Clio',       category:'Auto' },
  { make:'Renault',    model:'Fluence',    category:'Auto' },
  { make:'Renault',    model:'Sandero',    category:'Auto' },
  { make:'Dodge',      model:'Attitude',   category:'Auto' },
  { make:'Dodge',      model:'Neon',       category:'Auto' },
  { make:'Mitsubishi', model:'Mirage',     category:'Auto' },
  { make:'Mitsubishi', model:'Lancer',     category:'Auto' },
  { make:'Suzuki',     model:'Swift',      category:'Auto' },
  { make:'Suzuki',     model:'Baleno',     category:'Auto' },
  { make:'Fiat',       model:'Mobi',       category:'Auto' },
  { make:'Fiat',       model:'Uno',        category:'Auto' },
  { make:'Fiat',       model:'Punto',      category:'Auto' },
  { make:'Peugeot',    model:'208',        category:'Auto' },
  { make:'Peugeot',    model:'301',        category:'Auto' },
  { make:'Peugeot',    model:'308',        category:'Auto' },
  { make:'BMW',        model:'Serie 1',    category:'Auto' },
  { make:'BMW',        model:'Serie 3',    category:'Auto' },
  { make:'Mercedes-Benz', model:'Clase A', category:'Auto' },
  { make:'Mercedes-Benz', model:'Clase C', category:'Auto' },
  { make:'Audi',       model:'A3',         category:'Auto' },
  { make:'Audi',       model:'A4',         category:'Auto' },
  // SUVs populares
  { make:'Nissan',     model:'X-Trail',    category:'Sub' },
  { make:'Nissan',     model:'Kicks',      category:'Sub' },
  { make:'Nissan',     model:'Qashqai',    category:'Sub' },
  { make:'Nissan',     model:'Pathfinder', category:'Sub' },
  { make:'Nissan',     model:'Murano',     category:'Sub' },
  { make:'Nissan',     model:'Juke',       category:'Sub' },
  { make:'VW',         model:'Tiguan',     category:'Sub' },
  { make:'VW',         model:'T-Cross',    category:'Sub' },
  { make:'VW',         model:'Taos',       category:'Sub' },
  { make:'VW',         model:'Teramont',   category:'Sub' },
  { make:'Toyota',     model:'RAV4',       category:'Sub' },
  { make:'Toyota',     model:'C-HR',       category:'Sub' },
  { make:'Toyota',     model:'Highlander', category:'Sub' },
  { make:'Toyota',     model:'Rush',       category:'Sub' },
  { make:'Toyota',     model:'Fortuner',   category:'Sub' },
  { make:'Honda',      model:'CR-V',       category:'Sub' },
  { make:'Honda',      model:'HR-V',       category:'Sub' },
  { make:'Honda',      model:'Pilot',      category:'Sub' },
  { make:'Chevrolet',  model:'Trax',       category:'Sub' },
  { make:'Chevrolet',  model:'Equinox',    category:'Sub' },
  { make:'Chevrolet',  model:'Blazer',     category:'Sub' },
  { make:'Chevrolet',  model:'Captiva',    category:'Sub' },
  { make:'Ford',       model:'Escape',     category:'Sub' },
  { make:'Ford',       model:'EcoSport',   category:'Sub' },
  { make:'Ford',       model:'Bronco',     category:'Sub' },
  { make:'Ford',       model:'Explorer',   category:'Sub' },
  { make:'Mazda',      model:'CX-3',       category:'Sub' },
  { make:'Mazda',      model:'CX-30',      category:'Sub' },
  { make:'Mazda',      model:'CX-5',       category:'Sub' },
  { make:'Mazda',      model:'CX-50',      category:'Sub' },
  { make:'Hyundai',    model:'Creta',      category:'Sub' },
  { make:'Hyundai',    model:'Tucson',     category:'Sub' },
  { make:'Hyundai',    model:'Santa Fe',   category:'Sub' },
  { make:'Hyundai',    model:'Venue',      category:'Sub' },
  { make:'KIA',        model:'Seltos',     category:'Sub' },
  { make:'KIA',        model:'Sportage',   category:'Sub' },
  { make:'KIA',        model:'Sorento',    category:'Sub' },
  { make:'Jeep',       model:'Renegade',   category:'Sub' },
  { make:'Jeep',       model:'Compass',    category:'Sub' },
  { make:'Jeep',       model:'Cherokee',   category:'Sub' },
  { make:'Jeep',       model:'Grand Cherokee', category:'Sub' },
  { make:'BMW',        model:'X1',         category:'Sub' },
  { make:'BMW',        model:'X3',         category:'Sub' },
  { make:'BMW',        model:'X5',         category:'Sub' },
  { make:'Mercedes-Benz', model:'GLA',     category:'Sub' },
  { make:'Mercedes-Benz', model:'GLC',     category:'Sub' },
  { make:'Mercedes-Benz', model:'GLE',     category:'Sub' },
  { make:'Audi',       model:'Q3',         category:'Sub' },
  { make:'Audi',       model:'Q5',         category:'Sub' },
  { make:'Audi',       model:'Q7',         category:'Sub' },
  { make:'SEAT',       model:'Ateca',      category:'Sub' },
  { make:'SEAT',       model:'Arona',      category:'Sub' },
  { make:'Renault',    model:'Duster',     category:'Sub' },
  { make:'Renault',    model:'Koleos',     category:'Sub' },
  { make:'Renault',    model:'Captur',     category:'Sub' },
  { make:'Peugeot',    model:'2008',       category:'Sub' },
  { make:'Peugeot',    model:'3008',       category:'Sub' },
  { make:'Mitsubishi', model:'Outlander',  category:'Sub' },
  { make:'Mitsubishi', model:'Eclipse Cross', category:'Sub' },
  { make:'Subaru',     model:'Forester',   category:'Sub' },
  { make:'Subaru',     model:'Outback',    category:'Sub' },
  { make:'Suzuki',     model:'Vitara',     category:'Sub' },
  { make:'Suzuki',     model:'Jimny',      category:'Sub' },
  { make:'Volvo',      model:'XC40',       category:'Sub' },
  { make:'Volvo',      model:'XC60',       category:'Sub' },
  { make:'Volvo',      model:'XC90',       category:'Sub' },
  { make:'Porsche',    model:'Cayenne',    category:'Sub' },
  { make:'Porsche',    model:'Macan',      category:'Sub' },
  { make:'Land Rover', model:'Defender',   category:'Sub' },
  { make:'Land Rover', model:'Discovery',  category:'Sub' },
  { make:'Land Rover', model:'Range Rover',category:'Sub' },
  { make:'Cadillac',   model:'XT4',        category:'Sub' },
  { make:'Cadillac',   model:'XT5',        category:'Sub' },
  { make:'Cadillac',   model:'Escalade',   category:'Sub' },
  { make:'Lincoln',    model:'Aviator',    category:'Sub' },
  { make:'Lincoln',    model:'Corsair',    category:'Sub' },
  { make:'Lexus',      model:'NX',         category:'Sub' },
  { make:'Lexus',      model:'RX',         category:'Sub' },
  { make:'Acura',      model:'RDX',        category:'Sub' },
  { make:'Infiniti',   model:'QX50',       category:'Sub' },
  // Pick Ups
  { make:'Nissan',     model:'NP300',      category:'Pick Up' },
  { make:'Nissan',     model:'Frontier',   category:'Pick Up' },
  { make:'Toyota',     model:'Hilux',      category:'Pick Up' },
  { make:'Toyota',     model:'Tacoma',     category:'Pick Up' },
  { make:'Toyota',     model:'Tundra',     category:'Pick Up' },
  { make:'Ford',       model:'Lobo',       category:'Pick Up' },
  { make:'Ford',       model:'F-150',      category:'Pick Up' },
  { make:'Ford',       model:'Ranger',     category:'Pick Up' },
  { make:'Ford',       model:'Maverick',   category:'Pick Up' },
  { make:'Chevrolet',  model:'Silverado',  category:'Pick Up' },
  { make:'Chevrolet',  model:'Cheyenne',   category:'Pick Up' },
  { make:'Chevrolet',  model:'Colorado',   category:'Pick Up' },
  { make:'GMC',        model:'Sierra',     category:'Pick Up' },
  { make:'GMC',        model:'Canyon',     category:'Pick Up' },
  { make:'RAM',        model:'1500',       category:'Pick Up' },
  { make:'RAM',        model:'700',        category:'Pick Up' },
  { make:'VW',         model:'Amarok',     category:'Pick Up' },
  { make:'Mitsubishi', model:'L200',       category:'Pick Up' },
  { make:'Isuzu',      model:'D-Max',      category:'Pick Up' },
  // Motos
  { make:'Honda',      model:'CB125R',     category:'Moto' },
  { make:'Honda',      model:'CB190R',     category:'Moto' },
  { make:'Honda',      model:'CB300R',     category:'Moto' },
  { make:'Honda',      model:'CB500F',     category:'Moto' },
  { make:'Honda',      model:'CBR300R',    category:'Moto' },
  { make:'Honda',      model:'CBR500R',    category:'Moto' },
  { make:'Honda',      model:'PCX125',     category:'Moto' },
  { make:'Honda',      model:'ADV150',     category:'Moto' },
  { make:'Honda',      model:'Africa Twin',category:'Moto' },
  { make:'Yamaha',     model:'MT-03',      category:'Moto' },
  { make:'Yamaha',     model:'MT-07',      category:'Moto' },
  { make:'Yamaha',     model:'FZ25',       category:'Moto' },
  { make:'Yamaha',     model:'R3',         category:'Moto' },
  { make:'Yamaha',     model:'NMAX 155',   category:'Moto' },
  { make:'Kawasaki',   model:'Ninja 300',  category:'Moto' },
  { make:'Kawasaki',   model:'Ninja 400',  category:'Moto' },
  { make:'Kawasaki',   model:'Z400',       category:'Moto' },
  { make:'Kawasaki',   model:'Z650',       category:'Moto' },
  { make:'Suzuki',     model:'GSX-R600',   category:'Moto' },
  { make:'Suzuki',     model:'V-Strom 650',category:'Moto' },
  { make:'KTM',        model:'Duke 200',   category:'Moto' },
  { make:'KTM',        model:'Duke 390',   category:'Moto' },
  { make:'KTM',        model:'390 Adventure', category:'Moto' },
  { make:'Royal Enfield', model:'Classic 350', category:'Moto' },
  { make:'Royal Enfield', model:'Himalayan',   category:'Moto' },
  { make:'Royal Enfield', model:'Hunter 350',  category:'Moto' },
  { make:'Harley-Davidson', model:'Iron 883',   category:'Moto' },
  { make:'Harley-Davidson', model:'Fat Boy',    category:'Moto' },
  { make:'Benelli',    model:'TNT 300',     category:'Moto' },
  { make:'Benelli',    model:'TRK 502',     category:'Moto' },
  { make:'CFMoto',     model:'300NK',       category:'Moto' },
  { make:'CFMoto',     model:'650NK',       category:'Moto' },
  { make:'Voge',       model:'300R',        category:'Moto' },
];

@Injectable()
export class VehicleModelsService {
  private readonly logger = new Logger(VehicleModelsService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ─── Búsqueda para el frontend (exacta + fuzzy con pg_trgm) ─────────────
  async search(
    q: string,
    categories: string[],
  ): Promise<{ make: string; model: string; category: string }[]> {
    const cats  = categories.length > 0 ? categories : ['Auto', 'Sub', 'Pick Up', 'Moto'];
    const query = (q ?? '').trim();

    return this.db.query(
      `SELECT make, model, category,
              CASE
                -- Coincidencia exacta tiene prioridad máxima
                WHEN (make || ' ' || model) ILIKE '%' || $2 || '%' THEN 1.0
                WHEN model ILIKE $2 || '%'                          THEN 0.95
                WHEN make  ILIKE $2 || '%'                          THEN 0.9
                -- Fuzzy: máxima similitud entre el query y marca o modelo
                ELSE GREATEST(
                  word_similarity($2, make),
                  word_similarity($2, model)
                )
              END AS score
       FROM vehicle_models
       WHERE active = TRUE
         AND category = ANY($1::text[])
         AND (
           $2 = ''
           OR (make || ' ' || model) ILIKE '%' || $2 || '%'
           OR model ILIKE $2 || '%'
           OR make  ILIKE $2 || '%'
           -- Fuzzy solo para queries de 4+ caracteres (evita falsos positivos)
           OR (
             LENGTH($2) >= 4
             AND GREATEST(word_similarity($2, make), word_similarity($2, model)) > 0.24
           )
         )
       ORDER BY score DESC, make, model
       LIMIT 40`,
      [cats, query],
    );
  }

  // ─── Seed México (idempotente) ────────────────────────────────────────────
  async seedMexico(): Promise<number> {
    let inserted = 0;
    for (const m of MEXICO_SEED) {
      const r = await this.db.query(
        `INSERT INTO vehicle_models (make, model, category, source)
         VALUES ($1, $2, $3, 'seed_mx')
         ON CONFLICT (make, model) DO NOTHING`,
        [m.make, m.model, m.category],
      );
      if (r[1] > 0) inserted++;
    }
    return inserted;
  }

  // Alias de compatibilidad
  async seedMotos(): Promise<number> { return this.seedMexico(); }

  // ─── Sync desde NHTSA vPIC (modelos nuevos no en el seed) ────────────────
  async syncFromNhtsa(): Promise<{ added: number; skipped: number; errors: string[] }> {
    let added = 0; let skipped = 0; const errors: string[] = [];
    this.logger.log(`Iniciando sync NHTSA (${NHTSA_MAKES.length} marcas)...`);

    for (const { nhtsa, display } of NHTSA_MAKES) {
      for (const { nhtsa: vtype, category } of NHTSA_TYPES) {
        try {
          const models = await this.fetchNhtsa(nhtsa, vtype);
          for (const name of models) {
            if (category === 'Pick Up' && COMMERCIAL_RE.test(name)) { skipped++; continue; }
            const r = await this.db.query(
              `INSERT INTO vehicle_models (make, model, category, source)
               VALUES ($1, $2, $3, 'nhtsa')
               ON CONFLICT (make, model) DO NOTHING`,
              [display, name, category],
            );
            if (r[1] > 0) added++; else skipped++;
          }
          await this.sleep(200);
        } catch (err) {
          const msg = `${display}/${vtype}: ${(err as Error).message}`;
          this.logger.warn(msg); errors.push(msg);
        }
      }
    }

    this.logger.log(`Sync NHTSA → +${added} nuevos, ${skipped} ya existían, ${errors.length} errores`);
    return { added, skipped, errors };
  }

  // Alias para el controller (mantiene compatibilidad con endpoint /sync)
  async syncFromCarQuery() { return this.syncFromNhtsa(); }

  // ─── Cron mensual: 1ro del mes, 2 AM ─────────────────────────────────────
  @Cron('0 2 1 * *')
  async scheduledSync() {
    this.logger.log('Cron mensual: sync de modelos de vehículo...');
    await this.syncFromNhtsa();
  }

  // ─── Count para diagnóstico ───────────────────────────────────────────────
  async count(): Promise<{ total: number; byCategory: Record<string, number> }> {
    const rows = await this.db.query(
      `SELECT category, COUNT(*)::int AS cnt FROM vehicle_models WHERE active = TRUE GROUP BY category ORDER BY category`,
    );
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const r of rows) { byCategory[r.category] = r.cnt; total += r.cnt; }
    return { total, byCategory };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────
  private async fetchNhtsa(make: string, vehicleType: string): Promise<string[]> {
    const url = `${NHTSA_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/2024/vehicletype/${encodeURIComponent(vehicleType)}?format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { Results?: Array<{ Model_Name: string }> };
    const seen = new Set<string>();
    for (const r of data.Results ?? []) { const n = (r.Model_Name ?? '').trim(); if (n) seen.add(n); }
    return Array.from(seen);
  }

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
