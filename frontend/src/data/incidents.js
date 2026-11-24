export const INCIDENT_TYPES = {
  ELECTRICITY: 'electricity',
  WATER: 'water',
  GAS: 'gas',
};

export const INCIDENT_STATUSES = {
  ACTIVE: 'active', // Нет света / воды / газа (авария)
  IN_PROGRESS: 'in_progress', // Идут восстановительные работы
  RESOLVED: 'resolved', // Подача восстановлена
  PLANNED: 'planned', // Скоро работы / Плановые работы
};

export const TASHKENT_DISTRICTS = [
  'Все районы',
  'Юнусабадский',
  'Чиланзарский',
  'Мирзо-Улугбекский',
  'Шайхантахурский',
  'Яккасарайский',
  'Мирабадский',
  'Сергелийский',
  'Учтепинский',
  'Алмазарский',
  'Яшнабадский',
  'Бектемирский',
];

// Без выдуманных данных: только реальные точки, которые ставят пользователи и администратор
export const INITIAL_INCIDENTS = [];
