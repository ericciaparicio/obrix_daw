import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import {
  SEEDED_CONSTRUCTOR_ID,
  SEEDED_CONSTRUCTOR_EMAIL,
} from "../lib/auth/current-constructor";

/**
 * Crea el registro fijo de Constructor que `getCurrentConstructorId()` resuelve. Idempotente:
 * usa `upsert` por `email` (único), así correrlo N veces nunca duplica el registro.
 */
export async function seed(client: PrismaClient = prisma) {
  return client.constructor.upsert({
    where: { email: SEEDED_CONSTRUCTOR_EMAIL },
    update: {},
    create: {
      id: SEEDED_CONSTRUCTOR_ID,
      email: SEEDED_CONSTRUCTOR_EMAIL,
      nombre: "Constructor",
      apellido: "Demo",
      celular: "0000000000",
    },
  });
}

async function main() {
  await seed();
}

// Solo ejecuta `main()` cuando el archivo corre como script (p. ej. `prisma db seed`), no cuando
// se importa `seed` desde un test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
