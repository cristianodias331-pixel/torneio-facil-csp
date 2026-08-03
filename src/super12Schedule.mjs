const SUPER_12_SEED = [
  [[12, 1], [6, 8]],
  [[2, 9], [10, 7]],
  [[4, 3], [5, 11]],
];

function rotatePlayer(player, roundIndex) {
  return player === 12 ? 12 : ((player - 1 + roundIndex) % 11) + 1;
}

// Onze rodadas completas: cada atleta tem todos os outros como parceiro uma
// vez e enfrenta cada um deles exatamente duas vezes como adversário.
export const super12IndividualTemplate = Array.from({ length: 11 }, (_, roundIndex) => (
  SUPER_12_SEED.map((game) => (
    game.map((team) => team.map((player) => rotatePlayer(player, roundIndex)))
  ))
));
