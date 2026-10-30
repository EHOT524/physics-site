/* Режимы программы: какие темы (id разделов THEORY) входят в каждый класс и экзамен.
   Одна тема может входить в несколько режимов — её теория и задачи общие. */

var MODES = {
  '7': { short: '7', title: '7 класс', groups: [
    { title: 'Введение', ids: ['g7-intro'] },
    { title: 'Строение вещества', ids: ['g7-matter'] },
    { title: 'Взаимодействие тел', ids: ['g7-motion', 'g7-density', 'g7-forces'] },
    { title: 'Давление', ids: ['g7-pressure', 'g7-archimedes'] },
    { title: 'Работа и энергия', ids: ['g7-work'] }
  ]},
  '8': { short: '8', title: '8 класс', groups: [
    { title: 'Тепловые явления', ids: ['g8-heat', 'g8-phase'] },
    { title: 'Электрические явления', ids: ['g8-electro', 'g8-current'] },
    { title: 'Электромагнитные явления', ids: ['g8-magnet'] },
    { title: 'Световые явления', ids: ['g8-light'] }
  ]},
  '9': { short: '9', title: '9 класс', groups: [
    { title: 'Законы движения и взаимодействия', ids: ['g9-kin', 'g9-dyn', 'g9-cons'] },
    { title: 'Колебания и волны', ids: ['g9-osc'] },
    { title: 'Электромагнитное поле', ids: ['g9-em'] },
    { title: 'Атом и ядро', ids: ['g9-atom'] },
    { title: 'Вселенная', ids: ['g9-space'] }
  ]},
  '10': { short: '10', title: '10 класс', groups: [
    { title: 'Механика', ids: ['kin', 'dyn', 'stat', 'cons'] },
    { title: 'Молекулярная физика и термодинамика', ids: ['mkt', 'thermo'] },
    { title: 'Электродинамика', ids: ['estat', 'dc', 'g10-media'] }
  ]},
  '11': { short: '11', title: '11 класс', groups: [
    { title: 'Магнитное поле и индукция', ids: ['mag', 'ind'] },
    { title: 'Колебания и волны', ids: ['osc', 'emosc'] },
    { title: 'Оптика и СТО', ids: ['opt', 'g11-sto'] },
    { title: 'Квантовая физика', ids: ['quant', 'nuc'] },
    { title: 'Строение Вселенной', ids: ['g9-space'] }
  ]},
  'oge': { short: 'ОГЭ', title: 'ОГЭ', exam: true, intro: 'oge-exam', introGroup: 'Об экзамене', groups: [
    { title: 'Механические явления', ids: ['g9-kin', 'g7-motion', 'g7-density', 'g7-forces', 'g9-dyn', 'g9-cons', 'g7-work', 'g7-pressure', 'g7-archimedes', 'g9-osc'] },
    { title: 'Тепловые явления', ids: ['g7-matter', 'g8-heat', 'g8-phase'] },
    { title: 'Электромагнитные явления', ids: ['g8-electro', 'g8-current', 'g8-magnet', 'g9-em', 'g8-light'] },
    { title: 'Квантовые явления', ids: ['g9-atom'] },
    { title: 'Методы познания', ids: ['g7-intro'] }
  ]},
  'ege': { short: 'ЕГЭ', title: 'ЕГЭ', exam: true, intro: 'exam', introGroup: 'Об экзамене', groups: [] }
};

// ЕГЭ — темы кодификатора из theory.js
TOPICS.forEach(function (t) {
  var g = MODES.ege.groups.find(function (x) { return x.title === t.group; });
  if (!g) MODES.ege.groups.push(g = { title: t.group, ids: [] });
  g.ids.push(t.id);
});
