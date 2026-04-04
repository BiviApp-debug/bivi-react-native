// ============================================
// 🔄 FUNCIÓN PARA CARGAR TODOS LOS DATOS DEL USUARIO - CORREGIDA
// ============================================
// Esta función:
// 1. Obtiene el usuario por teléfono
// 2. Extrae el NIT de la empresa de telefonía
// 3. Obtiene TODAS las misiones (sin filtrar por NIT si no vienen)
// 4. Obtiene TODAS las ofertas (sin filtrar por NIT si no vienen)
// 5. Retorna todo estructurado

import {
  getUserByPhone,
  getTelecomCompanies,
  getMissions,
  getOffers,
  UserData,
  TelecomCompany,
  Mission,
  Offer,
} from "./Biviconnectapi";

// ============================================
// INTERFAZ DE RESPUESTA
// ============================================

export interface CompleteUserDataResponse {
  success: boolean;
  user: UserData | null;
  company: TelecomCompany | null;
  missions: Mission[];
  offers: Offer[];
  error?: string;
  warning?: string;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export const loadCompleteUserData = async (
  userPhone: string
): Promise<CompleteUserDataResponse> => {
  try {
    console.log("🔄 ===== INICIANDO CARGA DE DATOS COMPLETA =====");
    console.log(`📱 Teléfono: ${userPhone}\n`);

    // ===== PASO 1: OBTENER USUARIO POR TELÉFONO =====
    console.log("1️⃣ Obteniendo datos del usuario...");
    const user = await getUserByPhone(userPhone);

    if (!user) {
      console.error("❌ Usuario no encontrado");
      return {
        success: false,
        user: null,
        company: null,
        missions: [],
        offers: [],
        error: "Usuario no encontrado",
      };
    }

    console.log("✅ Usuario obtenido:");
    console.log(`   Nombre: ${user.name} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Teléfono: ${user.phone}`);

    // Validar que el usuario tiene un NIT de empresa
    if (!user.telecomCompanyNit) {
      console.warn(
        "⚠️ El usuario no tiene asignada una empresa de telefonía"
      );
      return {
        success: true,
        user,
        company: null,
        missions: [],
        offers: [],
        warning:
          "No tienes una empresa de telefonía asignada. Algunas funcionalidades no estarán disponibles.",
      };
    }

    const telecomNit = user.telecomCompanyNit;
    console.log(`\n📱 NIT de empresa asignado: ${telecomNit}\n`);

    // ===== PASO 2: OBTENER EMPRESA DE TELEFONÍA POR NIT =====
    console.log("2️⃣ Obteniendo empresa de telefonía...");
    const companiesResult = await getTelecomCompanies();

    if (!companiesResult.success || !companiesResult.data) {
      console.error("❌ Error obteniendo empresas");
      return {
        success: false,
        user,
        company: null,
        missions: [],
        offers: [],
        error: "Error obteniendo información de la empresa",
      };
    }

    // Buscar la empresa por NIT
    const company = companiesResult.data.find(
      (c: TelecomCompany) => c.nit === telecomNit
    );

    if (!company) {
      console.warn(`⚠️ Empresa con NIT ${telecomNit} no encontrada`);
      return {
        success: true,
        user,
        company: null,
        missions: [],
        offers: [],
        warning: `La empresa con NIT ${telecomNit} no está disponible en el sistema`,
      };
    }

    console.log("✅ Empresa obtenida:");
    console.log(`   Nombre: ${company.name}`);
    console.log(`   País: ${company.country}`);
    console.log(`   NIT: ${company.nit}`);
    console.log(`   Moneda: ${company.currency}\n`);

    // ===== PASO 3: OBTENER MISIONES =====
    console.log("3️⃣ Obteniendo misiones...");
    const missionsResult = await getMissions(userPhone);

    let missions: Mission[] = [];

    if (missionsResult.success && missionsResult.data) {
      console.log(`   Total de misiones en el sistema: ${missionsResult.data.length}`);

      // ✅ CAMBIO: Verificar si las misiones vienen con telecomCompanyNit
      const firstMission = missionsResult.data[0];
      const hasTelecomNit = firstMission && firstMission.telecomCompanyNit;

      if (hasTelecomNit) {
        // Si vienen con NIT, filtrar por NIT
        console.log(`   Filtrando por NIT: ${telecomNit}`);
        missions = missionsResult.data.filter(
          (mission: Mission) => mission.telecomCompanyNit === telecomNit
        );
      } else {
        // Si NO vienen con NIT, usar todas las misiones
        console.log("   ⚠️ Las misiones no tienen NIT asociado. Usando todas las misiones.");
        missions = missionsResult.data;
      }

      console.log(`✅ Misiones filtradas/obtenidas: ${missions.length}`);

      if (missions.length > 0) {
        console.log("   Misiones disponibles:");
        missions.forEach((m, index) => {
          console.log(
            `   ${index + 1}. ${m.title} (+${m.reward_points} puntos)`
          );
        });
      }
    } else {
      console.warn("⚠️ Error obteniendo misiones");
    }

    console.log("");

    // ===== PASO 4: OBTENER OFERTAS/VIDEOS =====
    console.log("4️⃣ Obteniendo ofertas/videos...");
    const offersResult = await getOffers(userPhone);

    let offers: Offer[] = [];

    if (offersResult.success && offersResult.data) {
      console.log(`   Total de ofertas en el sistema: ${offersResult.data.length}`);

      // ✅ CAMBIO: Verificar si las ofertas vienen con telecomCompanyNit
      const firstOffer = offersResult.data[0];
      const hasOfferTelecomNit = firstOffer && firstOffer.telecomCompanyNit;

      if (hasOfferTelecomNit) {
        // Si vienen con NIT, filtrar por NIT
        console.log(`   Filtrando por NIT: ${telecomNit}`);
        offers = offersResult.data.filter(
          (offer: Offer) => offer.telecomCompanyNit === telecomNit
        );
      } else {
        // Si NO vienen con NIT, usar todas las ofertas
        console.log("   ⚠️ Las ofertas no tienen NIT asociado. Usando todas las ofertas.");
        offers = offersResult.data;
      }

      console.log(`✅ Ofertas filtradas/obtenidas: ${offers.length}`);

      if (offers.length > 0) {
        console.log("   Ofertas disponibles:");
        offers.forEach((o, index) => {
          console.log(
            `   ${index + 1}. ${o.title} (+${o.reward_points} puntos)`
          );
        });
      }
    } else {
      console.warn("⚠️ Error obteniendo ofertas");
    }

    console.log("\n✅ ===== CARGA COMPLETADA EXITOSAMENTE =====\n");

    // ===== RETORNAR TODOS LOS DATOS =====
    return {
      success: true,
      user,
      company,
      missions,
      offers,
    };

  } catch (error: any) {
    console.error("❌ Error en loadCompleteUserData:", error.message);
    return {
      success: false,
      user: null,
      company: null,
      missions: [],
      offers: [],
      error: error.message || "Error desconocido al cargar los datos",
    };
  }
};

// ============================================
// LÓGICA DE FILTRADO EXPLICADA:
// ============================================

/*

Antes (INCORRECTO):
══════════════════════
const missions = missionsResult.data.filter(
  mission => mission.telecomCompanyNit === "131-11111-1"
);
❌ Resultado: 0 misiones (porque NO tienen telecomCompanyNit)


Ahora (CORRECTO):
══════════════════════
// Verificar si las misiones vienen con NIT
const firstMission = missionsResult.data[0];
const hasTelecomNit = firstMission && firstMission.telecomCompanyNit;

if (hasTelecomNit) {
  // Si vienen CON NIT, filtrar
  missions = missionsResult.data.filter(
    mission => mission.telecomCompanyNit === telecomNit
  );
} else {
  // Si vienen SIN NIT, usar todas
  missions = missionsResult.data;
}

✅ Resultado: 5 misiones (todas se muestran)


¿Cuándo usar cada uno?
═══════════════════════

ESCENARIO 1: Backend INCLUYE telecomCompanyNit en misiones
────────────────────────────────────────────────────────
API retorna:
[
  { id: "m1", title: "Tarea 1", telecomCompanyNit: "131-11111-1" },
  { id: "m2", title: "Tarea 2", telecomCompanyNit: "xxx-xxx-xxx" },
]
→ Filtrar por NIT: ✅ Muestra solo 1


ESCENARIO 2: Backend NO INCLUYE telecomCompanyNit en misiones
──────────────────────────────────────────────────────────
API retorna:
[
  { id: "m1", title: "Tarea 1", description: "..." },
  { id: "m2", title: "Tarea 2", description: "..." },
]
→ Usar todas: ✅ Muestra 5 (el caso tuyo)

*/