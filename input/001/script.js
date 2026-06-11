const firstNumber = document.querySelector("#first-number");
const secondNumber = document.querySelector("#second-number");
const operator = document.querySelector("#operator");
const result = document.querySelector("#result");
const button = document.querySelector("#calculate-button");

button.addEventListener("click", () => {
  const a = Number(firstNumber.value);
  const b = Number(secondNumber.value);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    result.textContent = "Palun sisesta mõlemale väljale arv.";
    return;
  }

  if (operator.value === "/" && b === 0) {
    result.textContent = "Nulliga jagada ei saa.";
    return;
  }

  const calculations = {
    "+": a + b,
    "-": a - b,
    "*": a * b,
    "/": a / b,
  };

  result.textContent = `Tulemus: ${calculations[operator.value]}`;
});
