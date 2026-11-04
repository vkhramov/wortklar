const LABELS: Record<string, { en: string; ru: string }> = {
  basics: { en: 'Basics', ru: 'Основы' },
  people: { en: 'People', ru: 'Люди' },
  family: { en: 'Family', ru: 'Семья' },
  home: { en: 'Home', ru: 'Дом' },
  housing: { en: 'Housing', ru: 'Жильё' },
  food: { en: 'Food', ru: 'Еда' },
  drink: { en: 'Drink', ru: 'Напитки' },
  shopping: { en: 'Shopping', ru: 'Покупки' },
  transport: { en: 'Transport', ru: 'Транспорт' },
  work: { en: 'Work', ru: 'Работа' },
  health: { en: 'Health', ru: 'Здоровье' },
  time: { en: 'Time', ru: 'Время' },
  weather: { en: 'Weather', ru: 'Погода' },
  nature: { en: 'Nature', ru: 'Природа' },
  hobbies: { en: 'Hobbies', ru: 'Хобби' },
  travel: { en: 'Travel', ru: 'Путешествия' },
  emotions: { en: 'Emotions', ru: 'Эмоции' },
  education: { en: 'Education', ru: 'Учёба' },
  technology: { en: 'Technology', ru: 'Техника' },
  clothing: { en: 'Clothing', ru: 'Одежда' },
  city: { en: 'City', ru: 'Город' },
  money: { en: 'Money', ru: 'Деньги' },
  cooking: { en: 'Cooking', ru: 'Готовка' },
  sports: { en: 'Sports', ru: 'Спорт' },
  animals: { en: 'Animals', ru: 'Животные' },
  body: { en: 'Body', ru: 'Тело' },
  descriptions: { en: 'Descriptions', ru: 'Описания' },
  'daily-life': { en: 'Daily life', ru: 'Быт' },
  communication: { en: 'Communication', ru: 'Общение' },
  appointments: { en: 'Appointments', ru: 'Встречи' },
  relationships: { en: 'Relationships', ru: 'Отношения' },
  'grammar-essentials': { en: 'Grammar', ru: 'Грамматика' },
  phrases: { en: 'Phrases', ru: 'Фразы' },
};

export function topicLabel(id: string, ui: 'ru' | 'en'): string {
  const row = LABELS[id];
  if (!row) return id;
  return ui === 'ru' ? row.ru : row.en;
}
