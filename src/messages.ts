export interface Messages {
  empty: () => string;
  unclosedQuote: () => string;
  unexpectedQuotedString: (name: string, prefix: string) => string;
  expectedFieldName: (prefix: string) => string;
  invalidCharacter: (ch: string) => string;
  unexpectedToken: (value: string) => string;
  expectedToken: (expected: string, got: string) => string;
  unexpectedEnd: () => string;
  functionNoParens: (name: string) => string;
  unknownIdentifier: (name: string) => string;
  unknownFunction: (name: string) => string;
  functionArity: (name: string, expected: string, got: number) => string;
  atLeast: (n: number) => string;
  nOrM: (n: number, m: number) => string;
  unclosedParen: () => string;
  unclosedParenAfter: (name: string) => string;
  fieldNotFound: (name: string) => string;
  opName: (op: string) => string;
  typeMismatch: (op: string, left: string, right: string) => string;
  nestedAggregates: () => string;
  functionArgType: (name: string, inputType: string) => string;
  secondArgMustBeNumber: (name: string) => string;
  aggregateConflict: (fieldName: string) => string;
}

export const en: Messages = {
  empty: () => 'Formula is empty',
  unclosedQuote: () => 'Unclosed quoted string',
  unexpectedQuotedString: (name, prefix) =>
    `Unexpected quoted string "${name}". Use ${prefix}${name} to reference fields`,
  expectedFieldName: (prefix) => `Expected field name after "${prefix}"`,
  invalidCharacter: (ch) => `Invalid character "${ch}": check the formula`,
  unexpectedToken: (value) => `Unexpected token "${value}"`,
  expectedToken: (expected, got) => `Expected ${expected}, got "${got}"`,
  unexpectedEnd: () => 'Unexpected end of expression',
  functionNoParens: (name) =>
    `Function "${name}" must be called with parentheses: ${name}(...)`,
  unknownIdentifier: (name) =>
    `Unknown identifier "${name}". Fields must start with the field prefix`,
  unknownFunction: (name) => `Unknown function "${name}"`,
  functionArity: (name, expected, got) =>
    `Function ${name} expects ${expected} argument(s), got ${got}`,
  atLeast: (n) => `at least ${n}`,
  nOrM: (n, m) => `${n} or ${m}`,
  unclosedParen: () => 'Unclosed parenthesis',
  unclosedParenAfter: (name) => `Unclosed parenthesis after ${name}(`,
  fieldNotFound: (name) => `Field "${name}" not found in the dataset`,
  opName: (op) =>
    ({ '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' })[op] ?? op,
  typeMismatch: (op, left, right) => `Cannot ${op} ${left} and ${right}`,
  nestedAggregates: () => 'Nested aggregates are not supported',
  functionArgType: (name, inputType) =>
    `Function ${name} is not applicable to type ${inputType}`,
  secondArgMustBeNumber: (name) =>
    `Second argument of ${name} must be a number`,
  aggregateConflict: (fieldName) =>
    `Missing aggregate function for field "${fieldName}"`,
};

export const ru: Messages = {
  empty: () => 'Формула пуста',
  unclosedQuote: () => 'Незакрытая кавычка',
  unexpectedQuotedString: (name, prefix) =>
    `Неожиданная строка в кавычках "${name}". Используйте ${prefix}${name} для ссылки на поля`,
  expectedFieldName: (prefix) => `Ожидалось имя поля после "${prefix}"`,
  invalidCharacter: (ch) =>
    `Недопустимый символ "${ch}": проверьте формулу`,
  unexpectedToken: (value) => `Неожиданный токен "${value}"`,
  expectedToken: (expected, got) =>
    `Ожидался ${expected}, получено "${got}"`,
  unexpectedEnd: () => 'Неожиданный конец выражения',
  functionNoParens: (name) =>
    `Функция "${name}" должна вызываться со скобками: ${name}(...)`,
  unknownIdentifier: (name) =>
    `Неизвестный идентификатор "${name}". Поля должны начинаться с префикса`,
  unknownFunction: (name) => `Неизвестная функция "${name}"`,
  functionArity: (name, expected, got) =>
    `Функция ${name} ожидает ${expected} аргумент(ов), получено ${got}`,
  atLeast: (n) => `не менее ${n}`,
  nOrM: (n, m) => `${n} или ${m}`,
  unclosedParen: () => 'Незакрытая скобка',
  unclosedParenAfter: (name) => `Незакрытая скобка после ${name}(`,
  fieldNotFound: (name) =>
    `Поле "${name}" не найдено в наборе данных`,
  opName: (op) =>
    ({ '+': 'сложить', '-': 'вычесть', '*': 'умножить', '/': 'разделить' })[op] ?? op,
  typeMismatch: (op, left, right) => `Нельзя ${op} ${left} и ${right}`,
  nestedAggregates: () =>
    'Вложенные агрегатные функции не поддерживаются',
  functionArgType: (name, inputType) =>
    `Функция ${name} не применима к типу ${inputType}`,
  secondArgMustBeNumber: (name) =>
    `Второй аргумент ${name} должен быть числом`,
  aggregateConflict: (fieldName) =>
    `Отсутствует агрегатная функция для поля "${fieldName}"`,
};
