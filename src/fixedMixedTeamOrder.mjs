const masculineFirstNames = new Set([
  "adriano", "alex", "alexandre", "anderson", "andre", "antonio", "atila",
  "bruno", "caio", "calos", "carlo", "carlos", "charles", "cristiano", "daniel", "davi",
  "diego", "eduardo", "elton", "fabio", "felipe", "fernando", "francisco",
  "gabriel", "gilberto", "guilherme", "gustavo", "henrique", "igor", "joao",
  "jorge", "jose", "julio", "junior", "kaio", "leandro", "leo", "leonardo", "lucas",
  "luca", "luiz", "marcelo", "marcio", "marcos", "mateus", "matheus",
  "miguel", "murilo", "nicolas", "nicola", "oseias", "patrick", "paulo",
  "pedro", "rafael", "renato", "ricardo", "roberto", "rodrigo", "samuel",
  "sergio", "thales", "thiago", "tiago", "victor", "vinicius", "wadson",
  "wagner", "wesley", "william",
]);

const feminineFirstNames = new Set([
  "aline", "alliyah", "alyne", "amanda", "ana", "andrea", "barbara", "beatriz",
  "bianca", "brenda", "camila", "carla", "carol", "carolina", "cassia",
  "claudia", "cristina", "daniela", "debora", "eliane", "emilly", "eveline",
  "fabiana", "fernanda", "flavia", "francisca", "gabi", "gabriela", "gleicy",
  "glaucia", "isabel", "isabela", "jessica", "julia", "juliana", "karina",
  "karen", "katia", "kelly", "larissa", "leticia", "luciana", "luiza",
  "marcia", "maria", "mariana", "marina", "michele", "monica", "natalia",
  "neila", "patricia", "paula", "raquel", "rebeca", "renata", "sandra",
  "simone", "sisi", "tania", "thamiris", "thamirys", "vanessa", "veronica",
  "viviane", "yohanna",
]);

function normalizeFirstName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/u)[0] || "";
}

export function classifyParticipantGender(value) {
  const firstName = normalizeFirstName(value);

  if (!firstName) return "unknown";
  if (masculineFirstNames.has(firstName)) return "masculine";
  if (feminineFirstNames.has(firstName)) return "feminine";

  return "unknown";
}

export function orderFixedMixedPair(firstParticipant, secondParticipant) {
  const firstGender = classifyParticipantGender(firstParticipant);
  const secondGender = classifyParticipantGender(secondParticipant);
  const shouldSwap = firstGender === "feminine" && secondGender === "masculine";

  return shouldSwap
    ? [secondParticipant, firstParticipant]
    : [firstParticipant, secondParticipant];
}
