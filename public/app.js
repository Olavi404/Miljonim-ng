const state = {
  tasks: [],
  selectedTask: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  safeScore: 0,
  usedLifelines: {
    fifty: false,
    hint: false,
    audience: false,
  },
  locked: false,
};

const points = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000,
  500000, 1000000,
];
const safeLevels = new Set([4, 9, 14]);
const letters = ["A", "B", "C", "D"];
const staticBaseUrl = new URL("../", document.currentScript.src);

const taskList = document.querySelector("#task-list");
const taskDetails = document.querySelector("#task-details");
const taskView = document.querySelector("#task-view");
const gameView = document.querySelector("#game-view");
const moneyList = document.querySelector("#money-list");
const questionCounter = document.querySelector("#question-counter");
const currentSafeScore = document.querySelector("#current-safe-score");
const questionText = document.querySelector("#question-text");
const answers = document.querySelector("#answers");
const feedback = document.querySelector("#feedback");

document.querySelector("#new-game-button").addEventListener("click", showTaskView);
document.querySelector("#quit-button").addEventListener("click", quitGame);
document.querySelector("#fifty-button").addEventListener("click", useFiftyFifty);
document.querySelector("#hint-button").addEventListener("click", useHint);
document.querySelector("#audience-button").addEventListener("click", useAudience);

function formatPoints(value) {
  return new Intl.NumberFormat("et-EE").format(value);
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Päring ebaõnnestus.");
  }
  return data;
}

async function requestText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Faili laadimine ebaõnnestus.");
  }
  return response.text();
}

async function loadTasks() {
  try {
    state.tasks = await requestJson("/api/tasks");
  } catch {
    state.tasks = await requestJson(new URL("input/tasks.json", staticBaseUrl));
  }
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  if (!state.tasks.length) {
    taskList.innerHTML = '<p class="empty-state">input/ kaustas ei ole ülesandeid.</p>';
    return;
  }

  state.tasks.forEach((task) => {
    const button = document.createElement("button");
    button.className = "task-card";
    button.type = "button";
    button.textContent = `${task.id} - ${task.title}`;
    button.addEventListener("click", () => selectTask(task.id));
    taskList.append(button);
  });
}

async function selectTask(taskId) {
  try {
    state.selectedTask = await requestJson(`/api/tasks/${taskId}`);
  } catch {
    state.selectedTask = await loadStaticTask(taskId);
  }
  [...document.querySelectorAll(".task-card")].forEach((button) => {
    button.classList.toggle("active", button.textContent.startsWith(`${taskId} -`));
  });
  renderTaskDetails();
}

async function loadStaticTask(taskId) {
  const manifest = await requestJson(new URL("input/tasks.json", staticBaseUrl));
  const task = manifest.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Ülesannet ei leitud.");
  }

  const taskBaseUrl = new URL(`input/${taskId}/`, staticBaseUrl);
  const assignment = await requestText(new URL("assignment.md", taskBaseUrl));
  const files = await Promise.all(
    task.files.map(async (filePath) => ({
      path: filePath,
      content: await requestText(new URL(filePath, taskBaseUrl)),
    })),
  );

  return {
    id: task.id,
    title: task.title || getTitleFromAssignment(assignment, task.id),
    assignment,
    files,
  };
}

function renderTaskDetails() {
  const task = state.selectedTask;
  const files = task.files.length
    ? task.files.map((file) => `<span class="file-pill">${file.path}</span>`).join("")
    : '<span class="file-pill">Lahendusfaile ei leitud</span>';

  taskDetails.innerHTML = `
    <h2>${task.id} - ${task.title}</h2>
    <div class="file-list">${files}</div>
    <button id="start-button" class="primary-button" type="button">Genereeri küsimused ja alusta</button>
    <h2>Ülesande kirjeldus</h2>
    <div class="assignment">${escapeHtml(task.assignment)}</div>
  `;
  document.querySelector("#start-button").addEventListener("click", startGame);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function startGame() {
  if (!state.selectedTask) return;

  try {
    state.questions = await requestJson(`/api/tasks/${state.selectedTask.id}/questions`, { method: "POST" });
  } catch {
    state.questions = generateQuestions(state.selectedTask);
  }
  state.currentIndex = 0;
  state.score = 0;
  state.safeScore = 0;
  state.locked = false;
  state.usedLifelines = { fifty: false, hint: false, audience: false };

  taskView.classList.add("hidden");
  gameView.classList.remove("hidden");
  renderMoneyList();
  renderQuestion();
}

function getTitleFromAssignment(markdown, fallback) {
  const heading = markdown.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim() : `Ülesanne ${fallback}`;
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

function makeQuestion(level, question, options, correctIndex, explanation) {
  const correct = options[correctIndex];
  const shuffledOptions = shuffle(options);
  return {
    level,
    question,
    options: shuffledOptions,
    correctIndex: shuffledOptions.indexOf(correct),
    explanation,
  };
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

function renderMoneyList() {
  moneyList.innerHTML = "";
  points
    .map((point, index) => ({ point, index }))
    .reverse()
    .forEach(({ point, index }) => {
      const item = document.createElement("li");
      item.classList.toggle("current", index === state.currentIndex);
      item.classList.toggle("safe", safeLevels.has(index));
      item.innerHTML = `<span>${index + 1}</span><strong>${formatPoints(point)}</strong>`;
      moneyList.append(item);
    });
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  state.locked = false;
  feedback.classList.add("hidden");
  feedback.textContent = "";

  questionCounter.textContent = `Küsimus ${state.currentIndex + 1}/15 · ${question.difficulty}`;
  currentSafeScore.textContent = `Turvatase: ${formatPoints(state.safeScore)} punkti`;
  questionText.textContent = question.question;
  answers.innerHTML = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.dataset.index = index;
    button.textContent = `${letters[index]}. ${option}`;
    button.addEventListener("click", () => answerQuestion(index));
    answers.append(button);
  });

  document.querySelector("#fifty-button").disabled = state.usedLifelines.fifty;
  document.querySelector("#hint-button").disabled = state.usedLifelines.hint;
  document.querySelector("#audience-button").disabled = state.usedLifelines.audience;
  renderMoneyList();
}

function answerQuestion(selectedIndex) {
  if (state.locked) return;
  state.locked = true;

  const question = state.questions[state.currentIndex];
  const answerButtons = [...document.querySelectorAll(".answer")];
  const isCorrect = selectedIndex === question.correctIndex;

  answerButtons.forEach((button) => {
    const index = Number(button.dataset.index);
    button.disabled = true;
    if (index === question.correctIndex) button.classList.add("correct");
    if (index === selectedIndex && !isCorrect) button.classList.add("wrong");
  });

  if (!isCorrect) {
    feedback.classList.remove("hidden");
    feedback.innerHTML = `<strong>Vale vastus.</strong> ${question.explanation}<br>Lõpptulemus: ${formatPoints(state.safeScore)} punkti.`;
    return;
  }

  state.score = points[state.currentIndex];
  if (safeLevels.has(state.currentIndex)) {
    state.safeScore = state.score;
  }

  if (state.currentIndex === state.questions.length - 1) {
    feedback.classList.remove("hidden");
    feedback.innerHTML = `<strong>Võit!</strong> ${question.explanation}<br>Lõpptulemus: ${formatPoints(state.score)} punkti.`;
    return;
  }

  feedback.classList.remove("hidden");
  feedback.innerHTML = `<strong>Õige!</strong> ${question.explanation}<br><button id="next-button" class="primary-button" type="button">Järgmine küsimus</button>`;
  document.querySelector("#next-button").addEventListener("click", () => {
    state.currentIndex += 1;
    renderQuestion();
  });
}

function useFiftyFifty() {
  if (state.usedLifelines.fifty || state.locked) return;
  state.usedLifelines.fifty = true;

  const question = state.questions[state.currentIndex];
  const wrongButtons = [...document.querySelectorAll(".answer")]
    .filter((button) => Number(button.dataset.index) !== question.correctIndex)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  wrongButtons.forEach((button) => {
    button.disabled = true;
    button.textContent = "";
  });
  document.querySelector("#fifty-button").disabled = true;
}

function useHint() {
  if (state.usedLifelines.hint || state.locked) return;
  state.usedLifelines.hint = true;
  const question = state.questions[state.currentIndex];
  feedback.classList.remove("hidden");
  feedback.textContent = `AI vihje: mõtle sellele, milline variant sobib kõige paremini selgitusega: ${question.explanation}`;
  document.querySelector("#hint-button").disabled = true;
}

function useAudience() {
  if (state.usedLifelines.audience || state.locked) return;
  state.usedLifelines.audience = true;
  const question = state.questions[state.currentIndex];
  const correctChance = state.currentIndex < 5 ? 62 : state.currentIndex < 10 ? 50 : 42;
  const votes = [0, 0, 0, 0];
  votes[question.correctIndex] = correctChance + Math.floor(Math.random() * 12);
  let remaining = 100 - votes[question.correctIndex];

  votes.forEach((vote, index) => {
    if (index === question.correctIndex) return;
    const value = index === 3 ? remaining : Math.floor(Math.random() * remaining);
    votes[index] = value;
    remaining -= value;
  });

  feedback.classList.remove("hidden");
  feedback.innerHTML = `<strong>Publiku hääletus:</strong><br>${votes
    .map((vote, index) => `${letters[index]} - ${vote}%`)
    .join("<br>")}`;
  document.querySelector("#audience-button").disabled = true;
}

function quitGame() {
  feedback.classList.remove("hidden");
  feedback.innerHTML = `<strong>Mäng jäeti pooleli.</strong><br>Tulemus: ${formatPoints(state.score)} punkti.`;
  state.locked = true;
  [...document.querySelectorAll(".answer, .lifelines button")].forEach((button) => {
    if (button.id !== "quit-button") button.disabled = true;
  });
}

function showTaskView() {
  gameView.classList.add("hidden");
  taskView.classList.remove("hidden");
}

loadTasks().catch((error) => {
  taskList.innerHTML = `<p class="empty-state">${error.message}</p>`;
});
