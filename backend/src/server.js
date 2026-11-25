import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.js';
import { Outage, User, Organization } from './models/index.js';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : true;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins }
});

initSocket(io);
app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WarnTech API is working!',
    database: 'Connected'
  });
});

app.use('/api', routes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

app.use(errorHandler);

// Автоматический посев начальных данных Ташкента, если база пустая
async function seedDefaultDataIfEmpty() {
  try {
    const outagesCount = await Outage.countDocuments();
    if (outagesCount === 0) {
      console.log('Seeding initial Tashkent outages for public visibility...');
      await Outage.create([
        {
          type: 'electricity',
          title: 'Аварийное отключение: ТП-142 Юнусабад',
          description: 'Повреждение кабельной линии 10 кВ от подстанции «Юнусабад». Бригада РЭС производит замену поврежденного участка.',
          address: 'ул. Амира Темура, квартал 7, дома 12–24',
          district: 'Юнусабадский',
          mahalla: 'Махалля Шахристан',
          location: { type: 'Point', coordinates: [69.2882, 41.3645] },
          status: 'in_progress',
          progress: 65,
          processStage: 'Монтаж соединительной муфты, подготовка к подаче напряжения',
          isPlanned: false,
          estimatedResolution: 'Сегодня к 18:30',
          affectedHouses: 14,
          affectedResidents: 2800,
          confirmations: 42,
          phone: '+998711154000'
        },
        {
          type: 'electricity',
          title: 'Нет света: Катартал 9-й квартал',
          description: 'Внезапное обесточивание жилых домов и светофоров. Вызвана дежурная аварийная служба районного РЭС.',
          address: 'квартал 9, ул. Катартал, дома 3–9',
          district: 'Чиланзарский',
          mahalla: 'Махалля Катартал',
          location: { type: 'Point', coordinates: [69.2085, 41.2825] },
          status: 'active',
          progress: 20,
          processStage: 'Аварийная бригада выехала на место для локализации аварии',
          isPlanned: false,
          estimatedResolution: 'Сегодня к 19:00',
          affectedHouses: 8,
          affectedResidents: 1650,
          confirmations: 29,
          phone: '+998711154000'
        },
        {
          type: 'water',
          title: 'Порыв водопровода Д=400: Чорсу',
          description: 'Утечка на распределительной водопроводной сети. Временно приостановлена подача холодной воды. Организован подвоз автоцистернами.',
          address: 'ул. Заркайнар, район рынка Чорсу',
          district: 'Шайхантахурский',
          mahalla: 'Махалля Чорсу',
          location: { type: 'Point', coordinates: [69.2361, 41.3275] },
          status: 'in_progress',
          progress: 45,
          processStage: 'Разрытие грунта, сварочные работы на стальном трубопроводе',
          isPlanned: false,
          estimatedResolution: 'Сегодня к 20:00',
          affectedHouses: 22,
          affectedResidents: 4100,
          confirmations: 38,
          phone: '+998711055000'
        },
        {
          type: 'gas',
          title: 'Утечка на ГРП: Ракат',
          description: 'Запах газа на перекрестке. Специалисты службы «104» перекрыли задвижку для ревизии регулятора давления.',
          address: 'ул. Ракатбоши и прилегающие проезды',
          district: 'Яккасарайский',
          mahalla: 'Махалля Ракат',
          location: { type: 'Point', coordinates: [69.2554, 41.2982] },
          status: 'active',
          progress: 35,
          processStage: 'Продувка газопровода и опрессовка распределительного узла',
          isPlanned: false,
          estimatedResolution: 'Сегодня к 17:45',
          affectedHouses: 11,
          affectedResidents: 920,
          confirmations: 19,
          phone: '+998711040000'
        },
        {
          type: 'electricity',
          title: 'Плановые работы: реконструкция сетей',
          description: 'Плановый капитальный ремонт трансформаторной подстанции и замена открытых проводов на СИП для исключения аварий зимой.',
          address: 'пр-т Мирзо Улугбека, ул. Сайрам, дома 15–33',
          district: 'Мирзо-Улугбекский',
          mahalla: 'Махалля Буюк Ипак Йули',
          location: { type: 'Point', coordinates: [69.3242, 41.3341] },
          status: 'planned',
          progress: 15,
          processStage: 'Подготовительные работы, согласование схемы переключений',
          isPlanned: true,
          plannedStart: 'Завтра, 09:00',
          estimatedResolution: 'Завтра к 17:00',
          affectedHouses: 16,
          affectedResidents: 3200,
          confirmations: 8,
          phone: '+998711154000'
        },
        {
          type: 'electricity',
          title: 'Отключение света: Янги Сергели',
          description: 'Техническое повреждение автоматического выключателя в щитовой. Работает аварийная бригада.',
          address: 'массив Сергели-4, дома 18, 19, 20, 21',
          district: 'Сергелийский',
          mahalla: 'Махалля Янги Сергели',
          location: { type: 'Point', coordinates: [69.2195, 41.2268] },
          status: 'in_progress',
          progress: 80,
          processStage: 'Тестирование автоматики перед подачей электроэнергии',
          isPlanned: false,
          estimatedResolution: 'Сегодня к 18:15',
          affectedHouses: 6,
          affectedResidents: 1400,
          confirmations: 16,
          phone: '+998711154000'
        }
      ]);
      console.log('Seeded default outages successfully.');
    }

    const usersCount = await User.countDocuments();
    if (usersCount === 0) {
      const org = await Organization.create({
        name: 'Городская диспетчерская РЭС',
        email: 'dispatch@netsveta.dev',
        serviceTypes: ['electricity', 'water', 'gas'],
        assignedAreas: ['Ташкент']
      });
      const passAdmin = await bcrypt.hash('admin123', 10);
      const passOrg = await bcrypt.hash('org12345', 10);
      await User.create([
        { name: 'Главный Администратор', email: 'admin@netsveta.dev', password: passAdmin, role: 'admin' },
        { name: 'Диспетчер РЭС', email: 'org@netsveta.dev', password: passOrg, role: 'organization', organization: org._id }
      ]);
      console.log('Seeded default admin and org accounts.');
    }
  } catch (err) {
    console.warn('Initial seed error:', err.message);
  }
}

connectDB()
  .then(async () => {
    await seedDefaultDataIfEmpty();
    server.listen(PORT, () => {
      console.log(`WarnTech API running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log(`API health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
