import { Subscription } from '@/types/subscription';

export const seedData: Subscription[] = [
  // === AMAZON PRIME VIDEO — cuenta hasta 15 dic ===
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Alexis', purchaseDate: '2025-12-13', profilePin: '', paymentStatus: 'pagado', notes: 'Roku (Carolina\'s 3920X)', accountName: 'Amazon Prime Video' },
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Deylin', purchaseDate: '2025-12-01', profilePin: '', paymentStatus: 'cobrar', notes: 'TCL Smart TV', accountName: 'Amazon Prime Video' },
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Alexis 2', purchaseDate: '2025-12-13', profilePin: '', paymentStatus: 'pagado', notes: 'Samsung QBQ60', accountName: 'Amazon Prime Video' },
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Cucho', purchaseDate: '2025-11-30', profilePin: '', paymentStatus: 'cobrar', notes: 'TV Moka', accountName: 'Amazon Prime Video' },
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Luchito Clarios', purchaseDate: '2025-12-25', profilePin: '', paymentStatus: 'pagado', notes: '32L', accountName: 'Amazon Prime Video' },
  { id: crypto.randomUUID(), platform: 'Amazon Prime Video', accountEmail: '', accountPassword: '', clientName: 'Marin', purchaseDate: '2026-01-01', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Amazon Prime Video' },

  // === NETFLIX — johnatanramos.inmo@gmail.com ===
  // (Disney sub under this account)
  { id: crypto.randomUUID(), platform: 'Disney Premium', accountEmail: 'johnatanramos.inmo@gmail.com', accountPassword: 'medellin2023', clientName: 'Arroyave', purchaseDate: '2025-12-10', profilePin: '', paymentStatus: 'pagado', notes: 'Disney 24 julio sebas', accountName: 'Cuenta Netflix johanatan' },
  { id: crypto.randomUUID(), platform: 'Disney Premium', accountEmail: 'johnatanramos.inmo@gmail.com', accountPassword: 'medellin2023', clientName: 'Alvaro', purchaseDate: '2025-12-07', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix johanatan' },
  { id: crypto.randomUUID(), platform: 'Disney Premium', accountEmail: 'johnatanramos.inmo@gmail.com', accountPassword: 'medellin2023', clientName: 'Maikol', purchaseDate: '2025-12-28', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix johanatan' },

  // === NETFLIX — misterraul9004@hotmail.com ===
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Mailin', purchaseDate: '2025-12-21', profilePin: '5223', paymentStatus: 'pagado', notes: '15 mil', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Carmela', purchaseDate: '2025-12-27', profilePin: '6333', paymentStatus: 'pagado', notes: '16 mil', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Don Manuel', purchaseDate: '2026-01-07', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 7 enero', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Alvaro', purchaseDate: '2025-12-07', profilePin: '9999', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Santiago', purchaseDate: '2025-12-17', profilePin: '2352', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Carolayn', purchaseDate: '2025-12-01', profilePin: '1615', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Diana', purchaseDate: '2025-12-12', profilePin: '9999', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },

  // === HBO Max ===
  { id: crypto.randomUUID(), platform: 'HBO Max', accountEmail: '', accountPassword: '', clientName: 'Arroyave', purchaseDate: '2025-11-22', profilePin: '', paymentStatus: 'pagado', notes: 'LG', accountName: 'HBO Max' },
  { id: crypto.randomUUID(), platform: 'HBO Max', accountEmail: '', accountPassword: '', clientName: 'Zorriya', purchaseDate: '2025-12-15', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'HBO Max' },
  { id: crypto.randomUUID(), platform: 'HBO Max', accountEmail: '', accountPassword: '', clientName: 'Alexis', purchaseDate: '2025-12-27', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'HBO Max' },
  { id: crypto.randomUUID(), platform: 'HBO Max', accountEmail: '', accountPassword: '', clientName: 'Marin', purchaseDate: '2026-01-01', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'HBO Max' },

  // === Star Plus — Crack2024 ===
  { id: crypto.randomUUID(), platform: 'Star Plus', accountEmail: '', accountPassword: 'Crack2024', clientName: 'Abel', purchaseDate: '2025-12-19', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 22 enero', accountName: 'Star Plus Crack2024' },
  { id: crypto.randomUUID(), platform: 'Star Plus', accountEmail: '', accountPassword: 'Crack2024', clientName: 'Bahos 2', purchaseDate: '2025-12-26', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Star Plus Crack2024' },

  // === Locoanchico2024 ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Locoanchico2024', clientName: 'Anchico', purchaseDate: '2025-12-16', profilePin: '', paymentStatus: 'pagado', notes: '20 mil. Hasta 22 enero', accountName: 'Locoanchico2024' },

  // === cra2024D ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'cra2024D', clientName: 'Bahos', purchaseDate: '2025-12-26', profilePin: '', paymentStatus: 'pagado', notes: '22 mil. Hasta 22 febrero', accountName: 'cra2024D' },
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'cra2024D', clientName: 'Cesar', purchaseDate: '2025-11-29', profilePin: '', paymentStatus: 'cobrar', notes: 'COBRAR', accountName: 'cra2024D' },

  // === IPTV gana2025T ===
  { id: crypto.randomUUID(), platform: 'IPTV Premium', accountEmail: '', accountPassword: 'gana2025T', clientName: 'Ganadero', purchaseDate: '2025-12-14', profilePin: '', paymentStatus: 'pagado', notes: '12 mil. Hasta 15 febrero', accountName: 'IPTV gana2025T' },

  // === Claro Video ===
  { id: crypto.randomUUID(), platform: 'Claro Video', accountEmail: '', accountPassword: '', clientName: 'Cucho', purchaseDate: '2025-12-15', profilePin: '', paymentStatus: 'pagado', notes: 'Claro video win+ joh hasta 11 enero', accountName: 'Claro Video' },

  // === mono2024T ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'mono2024T', clientName: 'Andres Martínez', purchaseDate: '2025-12-29', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 24 enero', accountName: 'mono2024T' },

  // === Sergio2024GT ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Sergio2024GT', clientName: 'Sergio', purchaseDate: '2025-12-25', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 22 enero', accountName: 'Sergio2024GT' },

  // === André2024 ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'André2024', clientName: 'Hermano Andres', purchaseDate: '2025-12-15', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 18 enero', accountName: 'André2024' },

  // === Max2024 ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Max2024', clientName: 'Banderas', purchaseDate: '2025-12-17', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 2 febrero', accountName: 'Max2024' },

  // === Marin2024 ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Marin2024', clientName: 'Marin', purchaseDate: '2026-01-05', profilePin: '', paymentStatus: 'pagado', notes: '2 pantallas. Hasta 11 febrero', accountName: 'Marin2024' },

  // === Emirson ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: '', clientName: 'Emerson', purchaseDate: '2025-12-27', profilePin: '', paymentStatus: 'pagado', notes: '3 pantallas. Hasta 27 febrero', accountName: 'Emirson' },

  // === Ger2025f ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Ger2025f', clientName: 'Gerson', purchaseDate: '2025-12-18', profilePin: '', paymentStatus: 'pagado', notes: '2 pantallas. Hasta 18 febrero', accountName: 'Ger2025f' },

  // === Wilson2025f ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Wilson2025f', clientName: 'Wilson', purchaseDate: '2025-12-21', profilePin: '', paymentStatus: 'pagado', notes: '2 meses. Hasta 21 febrero', accountName: 'Wilson2025f' },

  // === Jhonny ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: '', clientName: 'Jhonny', purchaseDate: '2025-12-31', profilePin: '', paymentStatus: 'debe', notes: 'Debe 10 mil. 2 meses', accountName: '' },

  // === NETFLIX PANTALLA ===
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Tefy', purchaseDate: '2025-12-10', profilePin: '', paymentStatus: 'pagado', notes: '9 nov seb', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Crunchyroll', accountEmail: '', accountPassword: '', clientName: 'Marrison', purchaseDate: '2025-12-22', profilePin: '', paymentStatus: 'pagado', notes: 'Crunchyroll', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Deylin', purchaseDate: '2025-12-19', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Yajaira', purchaseDate: '2025-12-22', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Ana', purchaseDate: '2025-12-24', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Flaco', purchaseDate: '2025-12-25', profilePin: '', paymentStatus: 'cobrar', notes: 'COBRAR', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Lina', purchaseDate: '2025-12-26', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Cesar', purchaseDate: '2025-12-29', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Alexander Vecin', purchaseDate: '2025-12-29', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
];
