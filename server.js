const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const INPUT_DIR = path.join(ROOT, "input");
const PUBLIC_DIR = path.join(ROOT, "public");

const ignoredNames = new Set(["node_modules", ".git", "vendor", ".DS_Store"]);
const textExtensions = new Set([
  ".md",
  ".txt",
  ".html",
  ".css",
  ".js",
  ".json",
  ".py",
  ".php",
  ".java",
  ".cs",
  ".xml",
  ".yml",
  ".yaml",
]);

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}

function isNumericTaskFolder(name) {
  return /^\d+$/.test(name);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getTitleFromAssignment(markdown, fallback) {
  const heading = markdown.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim() : `Ülesanne ${fallback}`;
}

async function listTasks() {
  if (!(await pathExists(INPUT_DIR))) {
    return [];
  }

  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory() && isNumericTaskFolder(entry.name))
    .map((entry) => entry.name)
    .sort();

  const tasks = [];
  for (const id of folders) {
    const assignmentPath = path.join(INPUT_DIR, id, "assignment.md");
    if (!(await pathExists(assignmentPath))) {
      continue;
    }

    const assignment = await fs.readFile(assignmentPath, "utf8");
    tasks.push({ id, title: getTitleFromAssignment(assignment, id) });
  }

  return tasks;
}

async function readTaskFiles(taskDir, currentDir = taskDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(taskDir, absolutePath).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      files.push(...(await readTaskFiles(taskDir, absolutePath)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) {
      files.push({ path: relativePath, content: "[Binaarfail või toetamata tekstiformaat]" });
      continue;
    }

    const stat = await fs.stat(absolutePath);
    if (stat.size > 40000) {
      files.push({ path: relativePath, content: "[Fail on liiga suur, sisu lühendatud]" });
      continue;
    }

    files.push({ path: relativePath, content: await fs.readFile(absolutePath, "utf8") });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function getTaskContext(taskId) {
  if (!isNumericTaskFolder(taskId)) {
    throw new Error("Vigane ülesande id.");
  }

  const taskDir = path.join(INPUT_DIR, taskId);
  const assignmentPath = path.join(taskDir, "assignment.md");

  if (!(await pathExists(assignmentPath))) {
    throw new Error("Ülesannet ei leitud või assignment.md puudub.");
  }

  const assignment = await fs.readFile(assignmentPath, "utf8");
  const files = await readTaskFiles(taskDir);
  const solutionFiles = files.filter((file) => file.path !== "assignment.md");

  return {
    id: taskId,
    title: getTitleFromAssignment(assignment, taskId),
    assignment,
    files: solutionFiles,
  };
}

function pickTechnologies(files) {
  const names = files.map((file) => file.path.toLowerCase());
  const tech = [];
  if (names.some((name) => name.endsWith(".html"))) tech.push("HTML");
  if (names.some((name) => name.endsWith(".css"))) tech.push("CSS");
  if (names.some((name) => name.endsWith(".js"))) tech.push("JavaScript");
  if (names.some((name) => name.endsWith(".json"))) tech.push("JSON");
  if (names.some((name) => name.endsWith(".py"))) tech.push("Python");
  return tech.length ? tech : ["üldine failistruktuur"];
}

function inferTopics(context) {
  const text = `${context.assignment}\n${context.files.map((file) => file.content).join("\n")}`.toLowerCase();
  const topics = [];
  if (text.includes("addeventlistener")) topics.push("sündmuste kuulamine");
  if (text.includes("localstorage")) topics.push("localStorage");
  if (text.includes("fetch")) topics.push("andmete laadimine fetchiga");
  if (text.includes("json")) topics.push("JSON-andmed");
  if (text.includes("innerhtml")) topics.push("innerHTML ja turvariskid");
  if (text.includes("form")) topics.push("vormi töötlemine");
  if (text.includes("array") || text.includes(".map") || text.includes(".filter")) topics.push("massiivide töötlemine");
  return topics.length ? topics : ["lahenduse loogika", "nõuetele vastavus"];
}

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function withShuffledOptions(question) {
  const correct = question.options[question.correctIndex];
  const shuffled = shuffle(question.options);
  return { ...question, options: shuffled, correctIndex: shuffled.indexOf(correct) };
}

function makeQuestion(level, question, options, correctIndex, explanation) {
  return withShuffledOptions({ level, question, options, correctIndex, explanation });
}

function generateQuestions(context) {
  const tech = pickTechnologies(context.files).join(", ");
  const topics = inferTopics(context).join(", ");
  const fileList = context.files.map((file) => file.path).join(", ") || "lahendusfaile ei leitud";

  const bank = [
    makeQuestion(1, `Mis on ülesande "${context.title}" peamine eesmärk?`, [
      "Kontrollida ainult failinimede olemasolu",
      "Mõista ülesande nõudeid ja lahenduse loogikat",
      "Asendada kõik koodifailid piltidega",
      "Käivitada server ilma kasutajaliideseta",
    ], 1, "Projekt keskendub sellele, kas õppija saab aru nõuetest ja lahenduse loogikast."),
    makeQuestion(2, `Milliseid tehnoloogiaid on selle ülesande lahenduses näha?`, [
      tech,
      "Ainult andmebaasiserver",
      "Ainult pilditöötlus",
      "Operatsioonisüsteemi skriptid ilma rakenduseta",
    ], 0, `Failide põhjal kasutatakse siin: ${tech}.`),
    makeQuestion(3, "Miks on assignment.md faili lugemine oluline?", [
      "See kirjeldab ülesande nõudeid ja hindamiskriteeriume",
      "See kustutab vanad küsimused automaatselt",
      "See muudab brauseri keelt",
      "See asendab lahendusfailid",
    ], 0, "Küsimused peavad lähtuma ülesande püstitusest, mitte ainult lahendusfailidest."),
    makeQuestion(4, "Mida tähendab, et küsimus kontrollib arusaamist, mitte mälu?", [
      "Küsimus küsib ainult faili täpset nime",
      "Küsimus nõuab loogika, põhjuse või tagajärje mõistmist",
      "Küsimus on alati ilma vastusevariantideta",
      "Küsimus väldib ülesande sisu",
    ], 1, "Sisuline küsimus paneb selgitama, miks mingi lahenduse osa olemas on või kuidas see töötab."),
    makeQuestion(5, `Millised failid annavad AI-le selle ülesande kohta konteksti?`, [
      fileList,
      "Ainult serveri logid",
      "Ainult node_modules kaust",
      "Ainult brauseri küpsised",
    ], 0, `Selles ülesandes loeti lahendusfailid: ${fileList}.`),
    makeQuestion(6, `Milliste teemade ümber võiksid keskmise raskusega küsimused siin tekkida?`, [
      topics,
      "Ainult värvide nimed",
      "Ainult failide loomise kuupäevad",
      "Ainult arvuti riistvara",
    ], 0, `Lahenduse sisust paistavad teemad: ${topics}.`),
    makeQuestion(7, "Miks peab lahendusfaile lugedes ignoreerima näiteks node_modules ja .git kaustu?", [
      "Need võivad olla väga suured ega kirjelda õppija lahenduse sisu",
      "Need sisaldavad alati õigeid vastuseid",
      "Need on vajalikud ainult CSS-i värvimiseks",
      "Need muudavad assignment.md faili pealkirja",
    ], 0, "Ignoreerimine hoiab konteksti lühema ja aitab keskenduda õppija tehtud failidele."),
    makeQuestion(8, "Mis juhtub miljonimängu loogikas vale vastuse korral?", [
      "Mäng jätkub sama küsimusega lõputult",
      "Mäng lõpeb ja tulemus langeb viimasele turvatasemele",
      "Kõik vastused märgitakse õigeks",
      "Ülesande failid kustutatakse",
    ], 1, "Reeglite järgi vale vastus lõpetab mängu ja alles jääb viimane saavutatud turvatase."),
    makeQuestion(9, "Miks on igal küsimusel vaja täpselt ühte õiget vastust?", [
      "Mängu kontrolliloogika peab saama vastuse üheselt hinnata",
      "Siis saab küsimusi vähem olla",
      "See teeb README faili lühemaks",
      "See välistab vajaduse assignment.md järele",
    ], 0, "Üheselt õige vastus võimaldab automaatselt kontrollida, kas mängija vastas õigesti."),
    makeQuestion(10, "Miks võiks küsimuste genereerimine iga mängu alguses veidi muutuda?", [
      "Et õppija ei õpiks lihtsalt kindlat vastuste järjekorda pähe",
      "Et ülesande failid kaoksid",
      "Et punktid oleksid alati null",
      "Et turvatasemeid ei oleks vaja",
    ], 0, "Uued või segatud küsimused aitavad paremini kontrollida tegelikku arusaamist."),
    makeQuestion(11, "Milline risk tekib, kui AI-le antakse liiga vähe konteksti?", [
      "Küsimused võivad muutuda üldiseks ega kontrolli konkreetset lahendust",
      "Küsimused muutuvad automaatselt liiga lihtsaks HTML-iks",
      "Server ei saa enam porte kasutada",
      "Kõik vastusevariandid muutuvad piltideks",
    ], 0, "Ilma assignment.md ja lahendusfailideta ei saa AI teha sisulisi konkreetse töö põhiseid küsimusi."),
    makeQuestion(12, "Mida peaks tegema, kui lahenduses kasutatakse innerHTML-i kasutaja sisendi kuvamiseks?", [
      "Mõtlema XSS-riskile ja eelistama turvalisemat tekstisisu lisamist",
      "Kustutama assignment.md faili",
      "Lisama alati rohkem fonte",
      "Muutma kõik küsimused ühevariandiliseks",
    ], 0, "Kasutaja sisendi otse HTML-i lisamine võib avada XSS-turvariski."),
    makeQuestion(13, "Miks on küsimuste genereerimine eraldi moodulina või funktsioonina parem kui otse UI-koodi sees?", [
      "Seda saab hiljem lihtsamalt päris AI API vastu vahetada",
      "See keelab mitme ülesande kasutamise",
      "See teeb kõik vastused valeks",
      "See eemaldab vajaduse serveri järele",
    ], 0, "Selge eraldus teeb projekti edasiarendamise ja AI ühendamise lihtsamaks."),
    makeQuestion(14, "Kuidas kontrollida, kas uus ülesanne sobib rakendusega ilma koodi muutmata?", [
      "Lisada uus numbriline kaust input/ alla koos assignment.md ja lahendusfailidega",
      "Muuta alati server.js faili nime",
      "Kustutada kõik olemasolevad ülesanded",
      "Luua node_modules kausta käsitsi küsimused",
    ], 0, "Nõuete järgi peab uue ülesande lisamine käima input/ numbrilise alamkausta kaudu."),
    makeQuestion(15, "Mis on selle lahenduse kõige olulisem edasiarenduse koht?", [
      "Simuleeritud küsimusegeneraatori asendamine päris AI API ühendusega",
      "Kõigi punktide muutmine nulliks",
      "assignment.md faili keelamine",
      "Valikvastuste arvu vähendamine ühele",
    ], 0, "Praegu on AI osa simuleeritud, aga struktuur jätab selge koha päris API lisamiseks."),
  ];

  return bank.map((question, index) => ({
    ...question,
    level: index + 1,
    difficulty: index < 5 ? "lihtne" : index < 10 ? "keskmine" : "raske",
  }));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Keelatud");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
    };
    sendText(res, 200, data, types[ext] || "application/octet-stream");
  } catch {
    sendText(res, 404, "Faili ei leitud");
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/tasks") {
      sendJson(res, 200, await listTasks());
      return;
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (req.method === "GET" && taskMatch) {
      sendJson(res, 200, await getTaskContext(taskMatch[1]));
      return;
    }

    const questionMatch = url.pathname.match(/^\/api\/tasks\/(\d+)\/questions$/);
    if (req.method === "POST" && questionMatch) {
      const context = await getTaskContext(questionMatch[1]);
      sendJson(res, 200, generateQuestions(context));
      return;
    }

    sendJson(res, 404, { error: "API päringut ei leitud." });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    await handleApi(req, res);
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Miljonimäng töötab aadressil http://localhost:${PORT}`);
});
