import { Subscription } from '@/types/subscription';

export const seedData: Subscription[] = [
  // === CUENTA NETFLIX — misterraul9004@hotmail.com — hasta 26 junio ===
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Mailin', purchaseDate: '2026-03-21', profilePin: '5223', paymentStatus: 'pagado', notes: '15 mil', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Sixta', purchaseDate: '2026-04-10', profilePin: '5500', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Carolayn', purchaseDate: '2026-03-01', profilePin: '1615', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Carmela', purchaseDate: '2026-04-11', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Flaco', purchaseDate: '2026-03-15', profilePin: '5151', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Stefania vecina', purchaseDate: '2026-03-23', profilePin: '1100', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: 'misterraul9004@hotmail.com', accountPassword: 'mister9023', clientName: 'Sandra', purchaseDate: '2026-04-01', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Cuenta Netflix misterraul' },

  // === CUENTAS DE IPTV PREMIUM ===
  // cra2025D hasta 1 mayo
  { id: crypto.randomUUID(), platform: 'IPTV Premium', accountEmail: '', accountPassword: 'cra2025D', clientName: 'Abel', purchaseDate: '2026-03-19', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 1 mayo', accountName: 'cra2025D' },

  // IPTV gana2025F hasta 20 marzo — Mio
  { id: crypto.randomUUID(), platform: 'IPTV Premium', accountEmail: '', accountPassword: 'gana2025F', clientName: 'Mio (propio)', purchaseDate: '2026-03-20', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 20 marzo', accountName: 'IPTV gana2025F' },

  // Jhonny
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: '', clientName: 'Jhonny', purchaseDate: '2026-02-11', profilePin: '', paymentStatus: 'cobrar', notes: '2 meses. COBRAR', accountName: '' },

  // Carolina Ricki — cancelar
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: '', clientName: 'Carolina Ricki', purchaseDate: '2026-03-11', profilePin: '', paymentStatus: 'debe', notes: 'Cancelar', accountName: '' },

  // Sergio2025 hasta 1 junio
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Sergio2025', clientName: 'Sergio', purchaseDate: '2026-04-01', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 1 junio', accountName: 'Sergio2025' },

  // Emirson2024 hasta 3 marzo
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Emirson2024', clientName: 'Emerson', purchaseDate: '2026-03-27', profilePin: '', paymentStatus: 'pagado', notes: '3 pantallas. Hasta 3 marzo', accountName: 'Emirson2024' },
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Emirson2024', clientName: 'Diego', purchaseDate: '2026-03-15', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Emirson2024' },

  // Beatriz hasta 16 mayo
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Beatriz', clientName: 'Alixon', purchaseDate: '2026-03-16', profilePin: '', paymentStatus: 'pagado', notes: 'ibo. Hasta 16 mayo', accountName: 'Beatriz' },
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Beatriz', clientName: 'Ganadero', purchaseDate: '2026-03-28', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 16 mayo', accountName: 'Beatriz' },

  // Valentina2025 hasta 2 junio
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Valentina2025', clientName: 'Valentina', purchaseDate: '2026-04-02', profilePin: '', paymentStatus: 'pagado', notes: 'Hasta 2 junio', accountName: 'Valentina2025' },
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: 'Valentina2025', clientName: 'Jaime', purchaseDate: '2026-03-24', profilePin: '', paymentStatus: 'pagado', notes: 'Carga. Hasta 2 junio', accountName: 'Valentina2025' },

  // === NETFLIX PANTALLA ===
  { id: crypto.randomUUID(), platform: 'Otro', accountEmail: '', accountPassword: '', clientName: 'Carolina Ricki', purchaseDate: '2026-03-05', profilePin: '', paymentStatus: 'pagado', notes: 'Flujo TV. 2 meses', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Jose', purchaseDate: '2026-04-06', profilePin: '', paymentStatus: 'pagado', notes: '', accountName: 'Netflix Pantalla' },
  { id: crypto.randomUUID(), platform: 'Netflix', accountEmail: '', accountPassword: '', clientName: 'Emerson', purchaseDate: '2026-04-12', profilePin: '', paymentStatus: 'cobrar', notes: 'COBRAR', accountName: 'Netflix Pantalla' },
];
