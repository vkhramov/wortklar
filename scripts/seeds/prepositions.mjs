/**
 * Prepositions seed for Wortklar.
 *
 * Row: [lemma, en, ru, exDe, exEn, exRu, level, topics, frequency, extra]
 *
 * - en / ru: alternatives separated by "/" (same convention as the other seeds).
 * - extra always contains: caseRequired, wechsel, caseHint {en, ru}.
 *   caseHint is language-neutral and must NOT contain the German lemma itself.
 * - extra.notes (optional) {en, ru}: usage notes; these MAY contain German examples.
 */

const ACC_HINT = {
  en: "Always takes the accusative case.",
  ru: "Всегда требует винительный падеж.",
};
const DAT_HINT = {
  en: "Always takes the dative case.",
  ru: "Всегда требует дательный падеж.",
};
const GEN_HINT = {
  en: "Takes the genitive case; colloquially the dative often replaces it.",
  ru: "Требует родительный падеж; в разговорной речи его часто заменяет дательный.",
};
const GEN_FORMAL_HINT = {
  en: "Takes the genitive case; typical of written and formal German.",
  ru: "Требует родительный падеж; характерен для письменной и официальной речи.",
};
const WECHSEL_HINT = {
  en: "Two-way preposition: dative for location (where?), accusative for direction (where to?).",
  ru: "Двусторонний предлог: датив для места (где?), аккузатив для направления (куда?).",
};

const acc = (notes, caseHint = ACC_HINT) => ({
  caseRequired: "Akkusativ",
  wechsel: false,
  caseHint,
  ...(notes ? { notes } : {}),
});
const dat = (notes, caseHint = DAT_HINT) => ({
  caseRequired: "Dativ",
  wechsel: false,
  caseHint,
  ...(notes ? { notes } : {}),
});
const gen = (notes, caseHint = GEN_HINT) => ({
  caseRequired: "Genitiv",
  wechsel: false,
  caseHint,
  ...(notes ? { notes } : {}),
});
const wechsel = (notes) => ({
  caseRequired: "Wechsel",
  wechsel: true,
  caseHint: WECHSEL_HINT,
  ...(notes ? { notes } : {}),
});

export const PREPOSITIONS = [
  // ───────────── Wechselpräpositionen (Dativ = Wo? / Akkusativ = Wohin?) ─────────────
  [
    "in", "in/into/inside", "в/во (внутри чего-либо)",
    "Ich wohne seit drei Jahren in Berlin.",
    "I have been living in Berlin for three years.",
    "Я живу в Берлине уже три года.",
    "A1", ["grammar-essentials", "city"], 5,
    wechsel({
      en: "Wo? Ich bin in der Küche (dative). Wohin? Ich gehe in die Küche (accusative). Also used for months, seasons and years: in diesem Jahr, im Sommer.",
      ru: "Где? Ich bin in der Küche (датив). Куда? Ich gehe in die Küche (аккузатив). Также для месяцев, времён года и лет: in diesem Jahr, im Sommer.",
    }),
  ],
  [
    "an", "at/on (vertical surface)/to the edge of", "у/на (вертикальной поверхности)/к (рядом с)",
    "Das Bild hängt an der Wand.",
    "The picture hangs on the wall.",
    "Картина висит на стене.",
    "A1", ["grammar-essentials", "home"], 5,
    wechsel({
      en: "Wo? Das Bild hängt an der Wand. Wohin? Ich hänge das Bild an die Wand. Also for days and parts of the day: am Montag, am Abend.",
      ru: "Где? Das Bild hängt an der Wand. Куда? Ich hänge das Bild an die Wand. Также для дней и частей дня: am Montag, am Abend.",
    }),
  ],
  [
    "auf", "on/onto (horizontal surface)/at (event)", "на (горизонтальной поверхности)/на (мероприятии)",
    "Das Buch liegt auf dem Tisch.",
    "The book is lying on the table.",
    "Книга лежит на столе.",
    "A1", ["grammar-essentials", "home"], 5,
    wechsel({
      en: "Wo? Das Buch liegt auf dem Tisch. Wohin? Ich lege das Buch auf den Tisch. Also: auf der Party, auf Deutsch.",
      ru: "Где? Das Buch liegt auf dem Tisch. Куда? Ich lege das Buch auf den Tisch. Также: auf der Party, auf Deutsch.",
    }),
  ],
  [
    "über", "over/above/across/about", "над/через/о (о чём-либо)",
    "Die Lampe hängt über dem Tisch.",
    "The lamp hangs above the table.",
    "Лампа висит над столом.",
    "A2", ["grammar-essentials", "communication"], 5,
    wechsel({
      en: "Wo? Die Lampe hängt über dem Tisch. Wohin? Er hängt die Lampe über den Tisch. In the meaning «about a topic» it always takes the accusative: Wir sprechen über das Wetter.",
      ru: "Где? Die Lampe hängt über dem Tisch. Куда? Er hängt die Lampe über den Tisch. В значении «о теме» всегда аккузатив: Wir sprechen über das Wetter.",
    }),
  ],
  [
    "unter", "under/below/among", "под/среди",
    "Die Katze schläft unter dem Bett.",
    "The cat is sleeping under the bed.",
    "Кошка спит под кроватью.",
    "A2", ["grammar-essentials", "home"], 4,
    wechsel({
      en: "Wo? Die Katze schläft unter dem Bett. Wohin? Die Katze läuft unter das Bett. Also «among»: unter Freunden.",
      ru: "Где? Die Katze schläft unter dem Bett. Куда? Die Katze läuft unter das Bett. Также «среди»: unter Freunden.",
    }),
  ],
  [
    "vor", "in front of/before/ago", "перед/до/(время) назад",
    "Das Auto steht vor dem Haus.",
    "The car is parked in front of the house.",
    "Машина стоит перед домом.",
    "A1", ["grammar-essentials", "time"], 5,
    wechsel({
      en: "Wo? Das Auto steht vor dem Haus. Wohin? Ich fahre das Auto vor das Haus. For time it takes the dative: vor einer Woche (a week ago), vor dem Essen (before the meal).",
      ru: "Где? Das Auto steht vor dem Haus. Куда? Ich fahre das Auto vor das Haus. Во временном значении — датив: vor einer Woche (неделю назад), vor dem Essen (перед едой).",
    }),
  ],
  [
    "hinter", "behind", "за/позади",
    "Der Garten ist hinter dem Haus.",
    "The garden is behind the house.",
    "Сад находится за домом.",
    "A2", ["grammar-essentials", "home"], 4,
    wechsel({
      en: "Wo? Der Garten ist hinter dem Haus. Wohin? Das Kind läuft hinter das Haus.",
      ru: "Где? Der Garten ist hinter dem Haus. Куда? Das Kind läuft hinter das Haus.",
    }),
  ],
  [
    "neben", "next to/beside", "рядом с/возле",
    "Im Kino sitze ich neben meiner Schwester.",
    "At the cinema I sit next to my sister.",
    "В кино я сижу рядом со своей сестрой.",
    "A2", ["grammar-essentials", "city"], 4,
    wechsel({
      en: "Wo? Ich sitze neben meiner Schwester. Wohin? Ich setze mich neben meine Schwester.",
      ru: "Где? Ich sitze neben meiner Schwester. Куда? Ich setze mich neben meine Schwester.",
    }),
  ],
  [
    "zwischen", "between", "между",
    "Die Bank liegt zwischen dem Bahnhof und dem Park.",
    "The bank is located between the station and the park.",
    "Банк находится между вокзалом и парком.",
    "A2", ["grammar-essentials", "city"], 4,
    wechsel({
      en: "Wo? Der Stuhl steht zwischen dem Tisch und dem Fenster. Wohin? Ich stelle den Stuhl zwischen den Tisch und das Fenster.",
      ru: "Где? Der Stuhl steht zwischen dem Tisch und dem Fenster. Куда? Ich stelle den Stuhl zwischen den Tisch und das Fenster.",
    }),
  ],

  // ───────────── Dativ ─────────────
  [
    "mit", "with/by (means of transport)", "с/на (о транспорте)",
    "Ich fahre jeden Tag mit dem Bus zur Arbeit.",
    "I take the bus to work every day.",
    "Я каждый день езжу на работу на автобусе.",
    "A1", ["grammar-essentials", "transport"], 5,
    dat({
      en: "Used for company (mit Freunden), tools (mit dem Stift) and vehicles (mit dem Zug).",
      ru: "Для совместности (mit Freunden), инструмента (mit dem Stift) и транспорта (mit dem Zug).",
    }),
  ],
  [
    "zu", "to/at/for", "к/в/на (направление к человеку или месту)",
    "Heute gehe ich zu meiner Oma.",
    "Today I am going to my grandma's.",
    "Сегодня я иду к своей бабушке.",
    "A1", ["grammar-essentials", "transport"], 5,
    dat({
      en: "Used for going to people and many places: zu Hause (home), zum Arzt, zur Schule. Contracts to zum (zu dem) and zur (zu der).",
      ru: "Для движения к людям и многим местам: zu Hause (домой), zum Arzt, zur Schule. Сливается в zum (zu dem) и zur (zu der).",
    }),
  ],
  [
    "von", "from/of/by", "от/из/о (о ком-либо)/(автор)",
    "Das Geschenk ist von meinem Bruder.",
    "The present is from my brother.",
    "Этот подарок от моего брата.",
    "A1", ["grammar-essentials", "communication"], 5,
    dat({
      en: "Also replaces the genitive in speech (das Auto von meinem Vater) and marks the author (ein Buch von Goethe). Contracts to vom (von dem).",
      ru: "В речи заменяет родительный падеж (das Auto von meinem Vater) и указывает автора (ein Buch von Goethe). Сливается в vom (von dem).",
    }),
  ],
  [
    "nach", "to (cities, countries)/after/according to", "в (города, страны)/после/согласно",
    "Nach dem Essen trinken wir Kaffee.",
    "After the meal we drink coffee.",
    "После еды мы пьём кофе.",
    "A1", ["grammar-essentials", "time", "travel"], 5,
    dat({
      en: "Use it for cities and countries without an article (nach Berlin) and for «after» (nach dem Unterricht). Also: nach Hause (home, direction).",
      ru: "Для городов и стран без артикля (nach Berlin) и в значении «после» (nach dem Unterricht). Также: nach Hause (домой, направление).",
    }),
  ],
  [
    "aus", "from/out of/made of", "из/от/(материал) из",
    "Meine Eltern kommen aus Polen.",
    "My parents come from Poland.",
    "Мои родители родом из Польши.",
    "A1", ["grammar-essentials", "basics"], 5,
    dat({
      en: "Origin and place of birth (aus Spanien), movement out of a closed space (aus dem Haus) and material (aus Holz).",
      ru: "Происхождение (aus Spanien), движение изнутри (aus dem Haus) и материал (aus Holz).",
    }),
  ],
  [
    "bei", "at/near/with (someone's place)/during", "у/возле/при/в гостях у",
    "Ich wohne noch bei meinen Eltern.",
    "I still live with my parents.",
    "Я всё ещё живу у своих родителей.",
    "A1", ["grammar-essentials", "family"], 5,
    dat({
      en: "Means being at someone's home or workplace (beim Arzt, bei Siemens) or close to a place (bei München). Contracts to beim (bei dem).",
      ru: "Означает «находиться у кого-то дома или на работе» (beim Arzt, bei Siemens) или «близко от места» (bei München). Сливается в beim (bei dem).",
    }),
  ],
  [
    "seit", "since/for (duration up to now)", "с (какого-то момента)/уже (о длительности)",
    "Ich lerne seit einem Jahr Deutsch.",
    "I have been learning German for a year.",
    "Я учу немецкий уже год.",
    "A1", ["grammar-essentials", "time"], 5,
    dat({
      en: "The verb stays in the present tense (not the perfect) for something that began in the past and continues now.",
      ru: "Глагол остаётся в настоящем времени (не в перфекте), если действие началось в прошлом и продолжается сейчас.",
    }),
  ],
  [
    "außer", "except/apart from/besides", "кроме",
    "Alle außer mir sind schon da.",
    "Everyone except me is already here.",
    "Все, кроме меня, уже здесь.",
    "A2", ["grammar-essentials", "communication"], 3,
    dat(),
  ],
  [
    "gegenüber", "opposite/across from/towards", "напротив/по отношению к",
    "Die Bäckerei ist gegenüber dem Bahnhof.",
    "The bakery is opposite the station.",
    "Пекарня находится напротив вокзала.",
    "A2", ["grammar-essentials", "city"], 3,
    dat({
      en: "Often follows a pronoun: mir gegenüber (opposite me). With nouns it can stand before or after: dem Bahnhof gegenüber.",
      ru: "После местоимений обычно стоит после них: mir gegenüber (напротив меня). С существительными — до или после: dem Bahnhof gegenüber.",
    }),
  ],
  [
    "ab", "from/starting from/as of", "с/начиная с",
    "Ab nächster Woche arbeite ich in Teilzeit.",
    "From next week I will be working part-time.",
    "Начиная со следующей недели я буду работать на неполный день.",
    "B1", ["grammar-essentials", "time", "work"], 3,
    dat({
      en: "Mainly for the start of a time or a price/age limit: ab Montag, ab 18 Jahren, ab 10 Euro.",
      ru: "В основном для начала периода или нижней границы цены/возраста: ab Montag, ab 18 Jahren, ab 10 Euro.",
    }),
  ],
  [
    "entgegen", "contrary to/towards", "вопреки/навстречу",
    "Entgegen allen Erwartungen kam der Zug pünktlich.",
    "Contrary to all expectations the train arrived on time.",
    "Вопреки всем ожиданиям поезд пришёл вовремя.",
    "B2", ["grammar-essentials", "communication"], 1,
    dat({
      en: "Usually stands before its noun in the sense of «contrary to». After the noun it means «towards»: dem Wind entgegen.",
      ru: "Обычно стоит перед существительным в значении «вопреки». После существительного значит «навстречу»: dem Wind entgegen.",
    }),
  ],
  [
    "dank", "thanks to", "благодаря",
    "Dank dem Navi haben wir den Weg schnell gefunden.",
    "Thanks to the satnav we found the way quickly.",
    "Благодаря навигатору мы быстро нашли дорогу.",
    "B2", ["grammar-essentials", "technology"], 2,
    dat({
      en: "Both the dative and the genitive are correct; the dative is more common in everyday use, the genitive in formal writing.",
      ru: "Правильны и датив, и родительный падеж; в повседневной речи чаще датив, в официальных текстах — родительный.",
    }),
  ],
  [
    "laut", "according to", "согласно/по словам",
    "Laut dem Wetterbericht regnet es morgen.",
    "According to the weather forecast it will rain tomorrow.",
    "Согласно прогнозу погоды, завтра будет дождь.",
    "B1", ["grammar-essentials", "weather", "communication"], 2,
    dat({
      en: "Both the dative and the genitive occur; with a noun without an article it needs no ending: laut Plan.",
      ru: "Встречаются и датив, и родительный падеж; с существительным без артикля окончание не нужно: laut Plan.",
    }),
  ],
  [
    "gemäß", "in accordance with", "в соответствии с",
    "Gemäß der Hausordnung ist Rauchen im Treppenhaus verboten.",
    "According to the house rules smoking is forbidden in the stairwell.",
    "Согласно правилам проживания курить на лестничной клетке запрещено.",
    "B2", ["grammar-essentials", "housing"], 1,
    dat({
      en: "Formal word from official texts; it may stand before or after the noun: der Hausordnung gemäß.",
      ru: "Официальное слово из деловых текстов; может стоять до или после существительного: der Hausordnung gemäß.",
    }),
  ],

  // ───────────── Akkusativ ─────────────
  [
    "für", "for", "для/за",
    "Das Geschenk ist für dich.",
    "The present is for you.",
    "Этот подарок для тебя.",
    "A1", ["grammar-essentials", "communication"], 5,
    acc({
      en: "Beneficiary, purpose, price and duration: für meine Mutter, für zwei Euro, für eine Woche.",
      ru: "Получатель, цель, цена и срок: für meine Mutter, für zwei Euro, für eine Woche.",
    }),
  ],
  [
    "durch", "through/by means of", "через/сквозь/посредством",
    "Wir fahren durch einen langen Tunnel.",
    "We are driving through a long tunnel.",
    "Мы едем через длинный туннель.",
    "A2", ["grammar-essentials", "transport"], 4,
    acc(),
  ],
  [
    "um", "around/at (a clock time)/about", "вокруг/в (о времени по часам)/около",
    "Der Unterricht beginnt um acht Uhr.",
    "The class starts at eight o'clock.",
    "Урок начинается в восемь часов.",
    "A1", ["grammar-essentials", "time"], 5,
    acc({
      en: "For exact clock times (um 8 Uhr), for going around something (um die Ecke) and in fixed phrases: um ... zu + infinitive.",
      ru: "Для точного времени (um 8 Uhr), для движения вокруг чего-либо (um die Ecke) и в конструкции um ... zu + инфинитив.",
    }),
  ],
  [
    "gegen", "against/around (approximate time)/towards", "против/около (о времени)/о (столкновение)",
    "Ich bin gegen diesen Plan.",
    "I am against this plan.",
    "Я против этого плана.",
    "A2", ["grammar-essentials", "communication"], 4,
    acc({
      en: "Also approximate time: gegen Abend (towards evening), gegen 18 Uhr (around six).",
      ru: "Также приблизительное время: gegen Abend (ближе к вечеру), gegen 18 Uhr (около шести).",
    }),
  ],
  [
    "ohne", "without", "без",
    "Ich trinke meinen Kaffee ohne Zucker.",
    "I drink my coffee without sugar.",
    "Я пью кофе без сахара.",
    "A1", ["grammar-essentials", "food"], 5,
    acc({
      en: "Usually no article before an uncountable or general noun: ohne Zucker, ohne Hilfe.",
      ru: "Перед неисчисляемым или общим существительным артикль обычно опускается: ohne Zucker, ohne Hilfe.",
    }),
  ],
  [
    "bis", "until/by/as far as", "до",
    "Das Geschäft ist bis 20 Uhr geöffnet.",
    "The shop is open until 8 p.m.",
    "Магазин открыт до 20 часов.",
    "A1", ["grammar-essentials", "time"], 5,
    acc(
      {
        en: "Before a noun it is normally combined with another preposition: bis zum Bahnhof, bis nach Köln, bis morgen (no article).",
        ru: "Перед существительным обычно сочетается с другим предлогом: bis zum Bahnhof, bis nach Köln, bis morgen (без артикля).",
      },
      {
        en: "Formally takes the accusative case, but it is mostly followed by a time, a name or a second preposition that decides the case.",
        ru: "Формально требует винительный падеж, но чаще всего за ним идут время, имя или второй предлог, который и определяет падеж.",
      },
    ),
  ],
  [
    "entlang", "along", "вдоль",
    "Wir gehen den Fluss entlang.",
    "We are walking along the river.",
    "Мы идём вдоль реки.",
    "B1", ["grammar-essentials", "city", "nature"], 3,
    acc(
      {
        en: "Stands after its noun and takes the accusative: die Straße entlang. Before the noun it may take the genitive or dative: entlang der Straße.",
        ru: "Обычно стоит после существительного и требует аккузатив: die Straße entlang. Перед существительным возможны родительный или дательный: entlang der Straße.",
      },
      {
        en: "Usually follows its noun and then takes the accusative case.",
        ru: "Обычно стоит после существительного и тогда требует винительный падеж.",
      },
    ),
  ],
  [
    "pro", "per", "за/на каждый",
    "Das Zimmer kostet sechzig Euro pro Nacht.",
    "The room costs sixty euros per night.",
    "Номер стоит шестьдесят евро за ночь.",
    "B1", ["grammar-essentials", "money", "travel"], 3,
    acc({
      en: "Used without an article: pro Tag, pro Person, pro Stunde.",
      ru: "Употребляется без артикля: pro Tag, pro Person, pro Stunde.",
    }),
  ],
  [
    "per", "by (means)/via", "посредством/по (почте, электронной почте)",
    "Ich schicke dir die Datei per E-Mail.",
    "I will send you the file by email.",
    "Я отправлю тебе файл по электронной почте.",
    "B1", ["grammar-essentials", "technology", "communication"], 3,
    acc({
      en: "Common in set expressions without an article: per E-Mail, per Post, per Handy, per Überweisung.",
      ru: "Часто в устойчивых выражениях без артикля: per E-Mail, per Post, per Handy, per Überweisung.",
    }),
  ],

  // ───────────── Genitiv ─────────────
  [
    "trotz", "despite/in spite of", "несмотря на",
    "Trotz des Regens gehen wir spazieren.",
    "Despite the rain we go for a walk.",
    "Несмотря на дождь, мы идём гулять.",
    "B1", ["grammar-essentials", "weather"], 3,
    gen(),
  ],
  [
    "während", "during", "во время",
    "Während des Films hat er geschlafen.",
    "He slept during the film.",
    "Во время фильма он спал.",
    "B1", ["grammar-essentials", "time"], 4,
    gen({
      en: "As a conjunction the same word introduces a subordinate clause: Während ich koche, ...",
      ru: "Как союз то же слово вводит придаточное предложение: Während ich koche, ...",
    }),
  ],
  [
    "wegen", "because of/due to", "из-за",
    "Wegen des Staus kam ich zu spät.",
    "I was late because of the traffic jam.",
    "Из-за пробки я опоздал.",
    "B1", ["grammar-essentials", "communication"], 4,
    gen({
      en: "In everyday speech people often say wegen dem Stau, but the genitive is the standard form in writing.",
      ru: "В разговорной речи часто говорят wegen dem Stau, но в письменной речи нормой является родительный падеж.",
    }),
  ],
  [
    "statt", "instead of", "вместо",
    "Statt des Busses nehmen wir das Fahrrad.",
    "Instead of the bus we take the bike.",
    "Вместо автобуса мы поедем на велосипеде.",
    "B1", ["grammar-essentials", "transport"], 3,
    gen(),
  ],
  [
    "anstatt", "instead of", "вместо",
    "Anstatt eines Anrufs schreibe ich lieber eine Nachricht.",
    "Instead of a call I would rather write a message.",
    "Вместо звонка я лучше напишу сообщение.",
    "B1", ["grammar-essentials", "communication"], 2,
    gen({
      en: "Slightly more formal variant of the shorter form with the same meaning.",
      ru: "Чуть более официальный вариант более короткой формы с тем же значением.",
    }),
  ],
  [
    "innerhalb", "within/inside of", "внутри/в течение",
    "Innerhalb einer Woche bekommst du eine Antwort.",
    "You will get an answer within a week.",
    "В течение недели ты получишь ответ.",
    "B1", ["grammar-essentials", "time", "city"], 3,
    gen({
      en: "Both for place (innerhalb der Stadt) and for time spans (innerhalb eines Monats). Before a plural noun without article it takes von: innerhalb von zwei Tagen.",
      ru: "И для места (innerhalb der Stadt), и для срока (innerhalb eines Monats). Перед множественным числом без артикля — с von: innerhalb von zwei Tagen.",
    }),
  ],
  [
    "außerhalb", "outside (of)/beyond", "вне/за пределами",
    "Sie wohnt außerhalb der Stadt.",
    "She lives outside the city.",
    "Она живёт за городом.",
    "B1", ["grammar-essentials", "city"], 3,
    gen(),
  ],
  [
    "oberhalb", "above (higher than)", "выше (чего-либо)",
    "Das Dorf liegt oberhalb des Sees.",
    "The village lies above the lake.",
    "Деревня расположена выше озера.",
    "B2", ["grammar-essentials", "nature"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "unterhalb", "below (lower than)", "ниже (чего-либо)",
    "Unterhalb der Brücke fließt ein kleiner Bach.",
    "A small stream flows below the bridge.",
    "Ниже моста течёт небольшой ручей.",
    "B2", ["grammar-essentials", "nature"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "aufgrund", "due to/on the grounds of", "вследствие/на основании",
    "Aufgrund der Krankheit bleibt er heute zu Hause.",
    "Due to illness he is staying at home today.",
    "По причине болезни он сегодня остаётся дома.",
    "B2", ["grammar-essentials", "work", "health"], 2,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "diesseits", "on this side of", "по эту сторону",
    "Diesseits des Flusses liegt die Altstadt.",
    "The old town lies on this side of the river.",
    "По эту сторону реки находится старый город.",
    "B2", ["grammar-essentials", "city", "nature"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "jenseits", "on the other side of/beyond", "по ту сторону/за пределами",
    "Jenseits der Grenze beginnt ein anderes Land.",
    "Beyond the border another country begins.",
    "За границей начинается другая страна.",
    "B2", ["grammar-essentials", "travel", "nature"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "mittels", "by means of", "посредством/с помощью",
    "Mittels eines Schlüssels öffnet man die Tür.",
    "One opens the door by means of a key.",
    "С помощью ключа открывают дверь.",
    "B2", ["grammar-essentials", "technology"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "angesichts", "in view of/given", "ввиду/учитывая",
    "Angesichts der hohen Preise sparen viele Leute beim Einkaufen.",
    "Given the high prices, many people save when shopping.",
    "Ввиду высоких цен многие люди экономят на покупках.",
    "B2", ["grammar-essentials", "money", "shopping"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
  [
    "bezüglich", "regarding/concerning", "относительно/касательно",
    "Bezüglich Ihrer Anfrage melde ich mich morgen bei Ihnen.",
    "Regarding your enquiry, I will get back to you tomorrow.",
    "Относительно вашего запроса я свяжусь с вами завтра.",
    "B2", ["grammar-essentials", "work", "communication"], 1,
    gen(undefined, GEN_FORMAL_HINT),
  ],
];
