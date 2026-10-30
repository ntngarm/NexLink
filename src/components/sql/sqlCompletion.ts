import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { MySQL, sql } from "@codemirror/lang-sql";

// ฟังก์ชัน MySQL ที่ใช้บ่อย
const MYSQL_FUNCTIONS = [
  // aggregate
  "COUNT", "SUM", "AVG", "MIN", "MAX", "GROUP_CONCAT",
  // control flow / null
  "IF", "IFNULL", "NULLIF", "COALESCE", "ISNULL",
  // string
  "CONCAT", "CONCAT_WS", "SUBSTRING", "SUBSTR", "LEFT", "RIGHT", "LENGTH", "CHAR_LENGTH",
  "UPPER", "LOWER", "TRIM", "LTRIM", "RTRIM", "REPLACE", "LPAD", "RPAD", "INSTR", "LOCATE",
  "FORMAT", "REVERSE", "REPEAT", "SUBSTRING_INDEX", "FIND_IN_SET",
  // date / time
  "NOW", "CURDATE", "CURTIME", "CURRENT_DATE", "CURRENT_TIMESTAMP", "DATE", "TIME",
  "DATE_FORMAT", "STR_TO_DATE", "DATE_ADD", "DATE_SUB", "DATEDIFF", "TIMESTAMPDIFF",
  "TIMESTAMPADD", "ADDDATE", "SUBDATE", "YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND",
  "WEEK", "WEEKDAY", "DAYOFWEEK", "DAYOFMONTH", "DAYOFYEAR", "LAST_DAY", "UNIX_TIMESTAMP",
  "FROM_UNIXTIME", "EXTRACT", "MAKEDATE", "TIME_FORMAT",
  // numeric
  "ROUND", "FLOOR", "CEIL", "CEILING", "ABS", "MOD", "TRUNCATE", "POW", "POWER", "SQRT", "RAND",
  // conversion
  "CAST", "CONVERT",
  // misc
  "DISTINCT", "EXISTS", "UUID", "MD5", "SHA1", "SHA2", "JSON_OBJECT", "JSON_ARRAY",
  "JSON_EXTRACT", "JSON_UNQUOTE", "ROW_NUMBER", "RANK", "DENSE_RANK",
];

const functionOptions: Completion[] = MYSQL_FUNCTIONS.map((name) => ({
  label: name,
  type: "function",
  apply: `${name}(`,
  boost: -1,
}));

const functionSource = (ctx: CompletionContext): CompletionResult | null => {
  const word = ctx.matchBefore(/\w+/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  // ไม่เสนอฟังก์ชันหลัง "ตาราง." (ตรงนั้นควรเป็นคอลัมน์)
  if (ctx.state.sliceDoc(word.from - 1, word.from) === ".") return null;
  return { from: word.from, options: functionOptions, validFor: /^\w*$/ };
};

/** เสนอคอลัมน์ของตารางที่อยู่ใน FROM / JOIN โดยไม่ต้องพิมพ์ชื่อตารางนำหน้า */
const columnSource = (schema: Record<string, string[]>) => {
  const lower = new Map(Object.keys(schema).map((t) => [t.toLowerCase(), t]));
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/\w+/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    if (ctx.state.sliceDoc(word.from - 1, word.from) === ".") return null;

    const text = ctx.state.doc.toString();
    const used = new Set<string>();
    for (const m of text.matchAll(/\b(?:from|join)\s+`?(\w+)`?/gi)) {
      const table = lower.get(m[1].toLowerCase());
      if (table) used.add(table);
    }
    if (used.size === 0) return null;

    const options: Completion[] = [];
    for (const table of used) {
      for (const column of schema[table]) {
        options.push({ label: column, type: "property", detail: table, boost: 1 });
      }
    }
    return { from: word.from, options, validFor: /^\w*$/ };
  };
};

/** extension ภาษา SQL (MySQL) พร้อมเติมคำ ตาราง / คอลัมน์ / ฟังก์ชัน */
export const sqlWithCompletion = (schema: Record<string, string[]>) => [
  sql({ dialect: MySQL, schema, upperCaseKeywords: true }),
  MySQL.language.data.of({ autocomplete: functionSource }),
  MySQL.language.data.of({ autocomplete: columnSource(schema) }),
];
