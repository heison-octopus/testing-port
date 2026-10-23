import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const project = "/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP";
const htmlPath = `${project}/output/D2 vask-skill-builder-map/vask-to-eight-skills.html`;
const outputPath = `${project}/output/vask-to-eight-skills.xlsx`;
const html = await fs.readFile(htmlPath, "utf8");
const start = html.indexOf("const skills=[");
const end = html.indexOf("    const stage=", start);
if (start < 0 || end < 0) throw new Error("Mapping data block not found in HTML source");
const mappingCode = html.slice(start, end);
const { skills, all } = new Function(`${mappingCode}\nreturn {skills, all};`)();

const skillLabels = skills.map(([id, title]) => ({ id, title }));
const bandLabel = (band) => band === 1 ? "Beginner (steps 1-4)" : band === 2 ? "Intermediate (steps 5-8)" : band === 3 || band === 4 ? "Advanced (steps 9-16)" : "No automatic step";
const relationshipLabel = { direct: "Direct skill overlap", enabler: "Value / attitude enabler", context: "Knowledge / activity context" };
const scopeLabel = { student: "Student-relevant", contextual: "Context-dependent", out: "Outside typical student scope" };
const dimensionLabel = { V: "Value", A: "Attitude", S: "Skill", K: "Knowledge" };

const detailRows = all.map((item) => {
  const bySkill = Object.fromEntries(item.maps.map((m) => [m.skill, bandLabel(m.band)]));
  return [item.dim, dimensionLabel[item.dim], item.name, scopeLabel[item.scope], relationshipLabel[item.relation], ...skillLabels.map((s) => bySkill[s.id] || ""), item.maps.length];
});

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const detail = workbook.worksheets.add("Mapping detail");
summary.showGridLines = false;
detail.showGridLines = false;
summary.tabColor = "#17365D";
detail.tabColor = "#5B9BD5";

summary.getRange("A2:I2").merge();
summary.getRange("A2").values = [["VASK to Skills Builder distribution"]];
summary.getRange("A3:I3").merge();
summary.getRange("A3").values = [["Counts are proposed mapping links, not direct equivalence to a Skills Builder step. Values, attitudes and knowledge normally remain in No automatic step."]];
summary.getRange("A5:I5").values = [["Candidate band", ...skillLabels.map((s) => s.title)]];
summary.getRange("A6:A9").values = [["No automatic step"], ["Beginner (steps 1-4)"], ["Intermediate (steps 5-8)"], ["Advanced (steps 9-16)"]];

const detailStart = 4;
const detailEnd = detailStart + detailRows.length - 1;
for (let c = 0; c < skillLabels.length; c++) {
  const sourceCol = String.fromCharCode("F".charCodeAt(0) + c);
  const targetCol = String.fromCharCode("B".charCodeAt(0) + c);
  for (let r = 6; r <= 9; r++) {
    summary.getRange(`${targetCol}${r}`).formulas = [[`=COUNTIF('Mapping detail'!${sourceCol}$${detailStart}:${sourceCol}$${detailEnd},$A${r})`]];
  }
}

summary.getRange("A12:E12").values = [["Student scope", "VASK items", "Mapped items", "Context-only items", "Share of VASK list"]];
summary.getRange("A13:A15").values = [["Student-relevant"], ["Context-dependent"], ["Outside typical student scope"]];
for (let r = 13; r <= 15; r++) {
  summary.getRange(`B${r}`).formulas = [[`=COUNTIF('Mapping detail'!$D$${detailStart}:$D$${detailEnd},$A${r})`]];
  summary.getRange(`C${r}`).formulas = [[`=COUNTIFS('Mapping detail'!$D$${detailStart}:$D$${detailEnd},$A${r},'Mapping detail'!$N$${detailStart}:$N$${detailEnd},">0")`]];
  summary.getRange(`D${r}`).formulas = [[`=COUNTIFS('Mapping detail'!$D$${detailStart}:$D$${detailEnd},$A${r},'Mapping detail'!$N$${detailStart}:$N$${detailEnd},0)`]];
  summary.getRange(`E${r}`).formulas = [[`=B${r}/SUM($B$13:$B$15)`]];
}

detail.getRange("A1:N1").merge();
detail.getRange("A1").values = [["Sources: VASK清單.docx; UF2.0 Cantonese Framework.pdf; Handbook for Educators DIGITAL.pdf"]];
detail.getRange("A3:N3").values = [["VASK", "Dimension", "Item", "Student scope", "Relationship", ...skillLabels.map((s) => s.title), "Mapped skill count"]];
detail.getRange(`A${detailStart}`).write(detailRows);

const font = "Arial";
summary.getRange("A2:I15").format.font = { name: font, size: 10, color: "#1F2937" };
summary.getRange("A2").format.font = { name: font, size: 16, bold: true, color: "#172033" };
summary.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#526177" };
summary.getRange("A5:I5").format = { fill: "#17365D", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9E2F3" } };
summary.getRange("A6:I9").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("A6:A9").format.font = { name: font, size: 10, bold: true, color: "#1F2937" };
summary.getRange("B6:I9").format = { horizontalAlignment: "center", verticalAlignment: "center", numberFormat: "#,##0" };
summary.getRange("A12:E12").format = { fill: "#365F91", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9E2F3" } };
summary.getRange("A13:E15").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("B13:E15").format.horizontalAlignment = "right";
summary.getRange("E13:E15").format.numberFormat = "0.0%";
summary.getRange("A15:E15").format.fill = "#FDE9E7";
summary.getRange("A15:E15").format.font = { name: font, size: 10, color: "#A61B1B", bold: true };
summary.getRange("A2:I15").format.verticalAlignment = "center";
summary.getRange("A:A").format.columnWidth = 27;
summary.getRange("B:I").format.columnWidth = 19;
summary.getRange("A3:I3").format.wrapText = true;
summary.getRange("3:3").format.rowHeight = 34;
summary.freezePanes.freezeRows(5);

detail.getRange(`A1:N${detailEnd}`).format.font = { name: font, size: 10, color: "#1F2937" };
detail.getRange("A1").format.font = { name: font, size: 10, italic: true, color: "#526177" };
detail.getRange("A3:N3").format = { fill: "#17365D", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9E2F3" } };
detail.getRange(`A4:N${detailEnd}`).format.borders = { insideHorizontal: { style: "thin", color: "#E5E7EB" } };
detail.getRange(`A4:B${detailEnd}`).format.horizontalAlignment = "center";
detail.getRange(`D4:M${detailEnd}`).format.verticalAlignment = "center";
detail.getRange(`F4:M${detailEnd}`).format.wrapText = true;
detail.getRange("A:A").format.columnWidth = 8;
detail.getRange("B:B").format.columnWidth = 12;
detail.getRange("C:C").format.columnWidth = 34;
detail.getRange("D:D").format.columnWidth = 24;
detail.getRange("E:E").format.columnWidth = 25;
detail.getRange("F:M").format.columnWidth = 22;
detail.getRange("N:N").format.columnWidth = 14;
detail.getRange(`A4:A${detailEnd}`).conditionalFormats.add("containsText", { text: "V", format: { fill: "#F9EAF6", font: { color: "#7C286C", bold: true } } });
detail.getRange(`A4:A${detailEnd}`).conditionalFormats.add("containsText", { text: "A", format: { fill: "#FFF1DF", font: { color: "#99500B", bold: true } } });
detail.getRange(`A4:A${detailEnd}`).conditionalFormats.add("containsText", { text: "S", format: { fill: "#EAF2FF", font: { color: "#174EA6", bold: true } } });
detail.getRange(`A4:A${detailEnd}`).conditionalFormats.add("containsText", { text: "K", format: { fill: "#E7F7EF", font: { color: "#0C6B3D", bold: true } } });
detail.getRange(`D4:D${detailEnd}`).conditionalFormats.add("containsText", { text: "Outside typical student scope", format: { fill: "#FDE9E7", font: { color: "#A61B1B", bold: true } } });
detail.getRange(`D4:D${detailEnd}`).conditionalFormats.add("containsText", { text: "Context-dependent", format: { fill: "#FFF2CC", font: { color: "#8A5A00" } } });
detail.freezePanes.freezeRows(3);
detail.freezePanes.freezeColumns(3);

workbook.recalculate();
const summaryInspect = await workbook.inspect({ kind: "table", range: "Summary!A2:I15", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 12 });
console.log(summaryInspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const summaryPreview = await workbook.render({ sheetName: "Summary", range: "A1:I16", scale: 1.5, format: "png" });
await fs.writeFile(`${project}/tmp/vask-map/xlsx-summary.png`, new Uint8Array(await summaryPreview.arrayBuffer()));
const detailPreview = await workbook.render({ sheetName: "Mapping detail", range: "A1:N24", scale: 1, format: "png" });
await fs.writeFile(`${project}/tmp/vask-map/xlsx-detail.png`, new Uint8Array(await detailPreview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, itemCount: all.length, detailEnd }));
