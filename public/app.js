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

async function loadTasks() {
  state.tasks = await requestJson("/api/tasks");
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
  state.selectedTask = await requestJson(`/api/tasks/${taskId}`);
  [...document.querySelectorAll(".task-card")].forEach((button) => {
    button.classList.toggle("active", button.textContent.startsWith(`${taskId} -`));
  });
  renderTaskDetails();
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

  state.questions = await requestJson(`/api/tasks/${state.selectedTask.id}/questions`, { method: "POST" });
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
