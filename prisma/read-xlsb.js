const XLSX = require("xlsx");

const filePath = "C:\\Users\\JULIEMERSON CUNHA\\Downloads\\planilha_construcao_individual.xlsb";
const wb = XLSX.readFile(filePath, { type: "binary", cellDates: true });

console.log("ABAS:", wb.SheetNames.join(", "));

// Focus on Calculos_Cronograma and Proposta
const targetSheets = ["Calculos_Cronograma", "Lista", "PLS", "Regras"];

for (const sheetName of targetSheets) {
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  console.log(`\n${"=".repeat(50)}\nABA: "${sheetName}"\n${"=".repeat(50)}`);

  let printed = 0;
  for (const row of data) {
    const nonEmpty = row.filter(c => String(c).trim() !== "");
    if (nonEmpty.length === 0) continue;
    if (printed >= 80) { console.log("... (truncado)"); break; }
    console.log(nonEmpty.map(c => String(c).substring(0, 35)).join(" | "));
    printed++;
  }
}

// Also scan Proposta for key rows with numbers/labels
const ws2 = wb.Sheets["Proposta_Constr_Individual"];
if (ws2) {
  const data = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: "" });
  console.log(`\n${"=".repeat(50)}\nABA: "Proposta_Constr_Individual" (resumo)\n${"=".repeat(50)}`);
  let printed = 0;
  for (const row of data) {
    const nonEmpty = row.filter(c => String(c).trim() !== "");
    if (nonEmpty.length < 2) continue;
    if (printed >= 100) { console.log("... (truncado)"); break; }
    console.log(nonEmpty.map(c => String(c).substring(0, 35)).join(" | "));
    printed++;
  }
}
