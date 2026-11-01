/**
 * Editorial patches applied by generate-vocab.mjs after seeds are merged
 * (before de-duplication and curation).
 *
 * Keys are "pos:lemma" (noun lemma without article).
 * PATCHES values are shallow-merged into the entry (example/notes merge one level deeper;
 * notes: null deletes the note). REMOVE drops entries entirely.
 *
 * Most patches below give a second entry its own example sentence when two seeds
 * accidentally used the same sentence (every example in the deck must be unique).
 */
const ex = (de, en, ru) => ({ example: { de, en, ru } });

export const PATCHES = {
  'noun:WLAN': { ru: ['вай-фай'], en: ['Wi-Fi'] },
  'verb:auskennen': { lemma: 'sich auskennen' },

  // --- unique example sentences (resolve cross-seed collisions) ---
  'noun:Fleisch': ex('Zum Grillen kaufen wir viel Fleisch.', "We're buying a lot of meat for the barbecue.", 'Для барбекю мы покупаем много мяса.'),
  'noun:Antwort': ex('Ich warte noch auf deine Antwort.', "I'm still waiting for your answer.", 'Я всё ещё жду твоего ответа.'),
  'noun:Geschichte': ex('Das ist eine lustige Geschichte.', 'That is a funny story.', 'Это забавная история.'),
  'noun:Nuss': ex('Im Müsli sind Nüsse und Rosinen.', 'There are nuts and raisins in the muesli.', 'В мюсли есть орехи и изюм.'),
  'noun:Platz': ex('Entschuldigung, ist hier noch ein Platz frei?', 'Excuse me, is there still a seat free here?', 'Извините, здесь ещё есть свободное место?'),
  'noun:Himmel': ex('Am Abend ist der Himmel rot.', 'In the evening the sky is red.', 'Вечером небо красное.'),
  'noun:Dank': ex('Ich schicke dir meinen herzlichen Dank.', "I'm sending you my heartfelt thanks.", 'Я посылаю тебе сердечную благодарность.'),
  'preposition:um': ex('Wir treffen uns um halb sieben vor dem Kino.', "We're meeting at half past six in front of the cinema.", 'Мы встречаемся в половине седьмого перед кинотеатром.'),
  'verb:machen': ex('Meine Schwester macht jeden Tag Sport.', 'My sister does sport every day.', 'Моя сестра каждый день занимается спортом.'),
  'verb:schlafen': ex('Ich schlafe am Wochenende gern lange.', 'I like to sleep in on weekends.', 'По выходным я люблю поспать подольше.'),
  'verb:stehen': ex('Die Kinder stehen schon an der Tür.', 'The children are already standing at the door.', 'Дети уже стоят у двери.'),
  'verb:liegen': ex('Die Zeitung liegt noch auf dem Sofa.', 'The newspaper is still lying on the sofa.', 'Газета всё ещё лежит на диване.'),
  'verb:mitkommen': ex('Kommst du morgen zum Essen mit?', 'Are you coming along to dinner tomorrow?', 'Ты придёшь завтра с нами на ужин?'),
  'verb:ausfüllen': ex('Ich fülle gerade das Anmeldeformular aus.', "I'm just filling out the registration form.", 'Я как раз заполняю регистрационную форму.'),
  'verb:abbiegen': ex('Bei der Kirche müssen Sie links abbiegen.', 'You have to turn left at the church.', 'У церкви Вам нужно повернуть налево.'),
  'verb:sich freuen': ex('Die Kinder freuen sich auf die Ferien.', 'The children are looking forward to the holidays.', 'Дети радуются предстоящим каникулам.'),
  'verb:hängen': ex('Die Jacke hängt im Flur.', 'The jacket is hanging in the hallway.', 'Куртка висит в прихожей.'),
  'verb:lösen': ex('Kannst du diese Aufgabe lösen?', 'Can you solve this task?', 'Ты можешь решить это задание?'),
  'verb:rauchen': ex('Mein Onkel raucht nicht mehr.', "My uncle doesn't smoke any more.", 'Мой дядя больше не курит.'),
  'verb:aufbauen': ex('Wir bauen morgen das Regal auf.', "We're putting up the shelf tomorrow.", 'Завтра мы соберём стеллаж.'),
  'phrase:Wo ist der Bahnhof?': ex('Wo ist der Bahnhof? Mein Zug fährt gleich.', 'Where is the station? My train leaves soon.', 'Где вокзал? Мой поезд скоро отправляется.'),
};

export const REMOVE = [];
