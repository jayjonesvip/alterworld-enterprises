const data = {};
const state = { match: null, history: loadHistory() };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function loadData() {
  const names = ["wrestlers", "moves", "missions", "manifest"];
  const payloads = await Promise.all(names.map((name) => fetch(`data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${name}.json`);
    return r.json();
  })));
  names.forEach((name, index) => { data[name] = payloads[index]; });
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  $("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "history") renderHistory();
}

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 3).join("").toUpperCase();
}

function statsHtml(wrestler) {
  return `<div class="stats">${[["STR", wrestler.str], ["SPD", wrestler.spd], ["SIZE", wrestler.size], ["SKILL", wrestler.skill], ["CHR", wrestler.chr]].map(([label, value]) => `<span class="stat"><b>${value}</b><small>${label}</small></span>`).join("")}</div>`;
}

function profileHtml(wrestler) {
  return `<h3>${escapeHtml(wrestler.name)}</h3><p>${escapeHtml(wrestler.fed || "Independent")} · ${escapeHtml(wrestler.specialty || "Pinfall")} · Finisher: ${escapeHtml(wrestler.finisher)}</p>${statsHtml(wrestler)}`;
}

function populateSetup() {
  const options = data.wrestlers.map((w, i) => `<option value="${i}">${escapeHtml(w.name)} — ${escapeHtml(w.fed)}</option>`).join("");
  $("#player-select").innerHTML = options;
  $("#opponent-select").innerHTML = options;
  $("#opponent-select").selectedIndex = Math.min(1, data.wrestlers.length - 1);
  updatePreviews();
}

function updatePreviews() {
  $("#player-preview").innerHTML = profileHtml(data.wrestlers[Number($("#player-select").value)]);
  $("#opponent-preview").innerHTML = profileHtml(data.wrestlers[Number($("#opponent-select").value)]);
}

function maxHp(wrestler) { return 70 + wrestler.size * 4 + wrestler.str * 3; }

function startMatch() {
  const playerIndex = Number($("#player-select").value);
  const opponentIndex = Number($("#opponent-select").value);
  if (playerIndex === opponentIndex) {
    $("#opponent-select").focus();
    alert("Choose two different wrestlers.");
    return;
  }
  const player = structuredClone(data.wrestlers[playerIndex]);
  const opponent = structuredClone(data.wrestlers[opponentIndex]);
  const type = $("input[name='match-type']:checked").value;
  state.match = {
    player: { ...player, hp: maxHp(player), maxHp: maxHp(player), down: false },
    opponent: { ...opponent, hp: maxHp(opponent), maxHp: maxHp(opponent), down: false },
    type, turn: 1, finished: false, log: [],
  };
  addCommentary(`${player.name} and ${opponent.name} are in the ring. The bell sounds.`);
  renderMatch();
  showView("match");
}

function availableMoves(actor, target) {
  let moves = data.moves.filter((move) => {
    if (!move.movename || move.movename.toLowerCase() === "empty") return false;
    if (state.match.type !== "Hardcore" && move.illegal) return false;
    return true;
  });
  moves = moves.sort((a, b) => {
    const aFit = a.damage <= actor.skill + actor.str ? 1 : 0;
    const bFit = b.damage <= actor.skill + actor.str ? 1 : 0;
    return bFit - aFit || a.damage - b.damage;
  });
  const varied = moves.filter((_, i) => i % Math.max(1, Math.floor(moves.length / 12)) === state.match.turn % Math.max(1, Math.floor(moves.length / 12)));
  return [...new Map([...varied, ...moves].map((move) => [move.movename, move])).values()].slice(0, 6);
}

function useMove(move, actorKey = "player") {
  const match = state.match;
  if (!match || match.finished) return;
  const targetKey = actorKey === "player" ? "opponent" : "player";
  const actor = match[actorKey];
  const target = match[targetKey];
  const attack = actor.skill * 4 + actor.spd * 2 + randomInt(28);
  const defense = target.skill * 2 + target.spd * 2 + Math.max(0, move.damage - 8) * 2 + randomInt(28);
  const connects = attack >= defense;
  if (connects) {
    const specialtyBonus = specialtyApplies(actor, match.type) ? 2 : 0;
    const damage = Math.max(1, move.damage + Math.floor(actor.str / 3) + specialtyBonus + randomInt(4));
    target.hp = Math.max(0, target.hp - damage);
    target.down = damage >= 10 || target.hp < target.maxHp * 0.35;
    addCommentary(formatComment(move.connect || "$wrestler connects with $move", actor, target, move));
  } else {
    addCommentary(formatComment(move.missed || "$wrestler tries $move but misses", actor, target, move));
    if (randomInt(100) < 22 + target.skill) addCommentary(`${target.name} turns the miss into a quick counter.`);
  }
  if (target.hp <= 0) return finishMatch(actorKey, "stoppage");
  if (actorKey === "player") {
    renderMatch();
    window.setTimeout(opponentTurn, 500);
  } else {
    match.turn += 1;
    renderMatch();
  }
}

function useFinisher(actorKey = "player") {
  const match = state.match;
  const targetKey = actorKey === "player" ? "opponent" : "player";
  const actor = match[actorKey];
  const target = match[targetKey];
  const chance = 58 + actor.skill * 2 + actor.chr - target.skill * 2;
  if (randomInt(100) < chance) {
    const damage = 18 + actor.str + randomInt(9);
    target.hp = Math.max(0, target.hp - damage);
    target.down = true;
    addCommentary(`${actor.name} hits ${target.name} with ${actor.finisher}!`);
  } else {
    addCommentary(`${actor.name} goes for ${actor.finisher}, but ${target.name} escapes.`);
  }
  if (target.hp <= 0) return finishMatch(actorKey, "finisher");
  if (actorKey === "player") { renderMatch(); window.setTimeout(opponentTurn, 500); }
  else { match.turn += 1; renderMatch(); }
}

function attemptPin(actorKey = "player") {
  const match = state.match;
  const targetKey = actorKey === "player" ? "opponent" : "player";
  const actor = match[actorKey];
  const target = match[targetKey];
  const damageRatio = 1 - target.hp / target.maxHp;
  const chance = Math.round(damageRatio * 82 + actor.chr * 1.4 - target.skill);
  addCommentary(`${actor.name} hooks the leg. One… two…`);
  if (randomInt(100) < chance) return finishMatch(actorKey, "pinfall");
  addCommentary(`${target.name} gets a shoulder up!`);
  target.down = false;
  if (actorKey === "player") { renderMatch(); window.setTimeout(opponentTurn, 500); }
  else { match.turn += 1; renderMatch(); }
}

function opponentTurn() {
  const match = state.match;
  if (!match || match.finished) return;
  const actor = match.opponent;
  const target = match.player;
  if (target.down && target.hp < target.maxHp * 0.42 && randomInt(100) < 48) return attemptPin("opponent");
  if (target.hp < target.maxHp * 0.30 && randomInt(100) < 36) return useFinisher("opponent");
  const moves = availableMoves(actor, target);
  const weighted = moves.sort((a, b) => (Math.abs(b.damage - actor.skill) - Math.abs(a.damage - actor.skill)));
  useMove(weighted[randomInt(Math.min(4, weighted.length))] || moves[0], "opponent");
}

function finishMatch(winnerKey, method) {
  const match = state.match;
  match.finished = true;
  const winner = match[winnerKey];
  const loser = match[winnerKey === "player" ? "opponent" : "player"];
  addCommentary(`${winner.name} defeats ${loser.name} by ${method}.`);
  state.history.unshift({ winner: winner.name, loser: loser.name, method, type: match.type, turns: match.turn, date: new Date().toISOString() });
  state.history = state.history.slice(0, 50);
  localStorage.setItem("aww-match-history", JSON.stringify(state.history));
  renderMatch();
}

function renderMatch() {
  const match = state.match;
  const { player, opponent } = match;
  $("#match-type-label").textContent = match.type.toUpperCase();
  $("#turn-counter").textContent = `TURN ${String(match.turn).padStart(2, "0")}`;
  $("#player-name").textContent = player.name;
  $("#opponent-name").textContent = opponent.name;
  $("#player-specialty").textContent = `${player.fed} · ${player.specialty}`;
  $("#opponent-specialty").textContent = `${opponent.fed} · ${opponent.specialty}`;
  $("#player-portrait").textContent = initials(player.name);
  $("#opponent-portrait").textContent = initials(opponent.name);
  setHealth("player", player);
  setHealth("opponent", opponent);
  const difference = (player.hp / player.maxHp) - (opponent.hp / opponent.maxHp);
  $("#momentum-label").textContent = Math.abs(difference) < .12 ? "EVEN" : difference > 0 ? player.name.split(" ")[0].toUpperCase() : opponent.name.split(" ")[0].toUpperCase();
  $("#commentary").innerHTML = match.log.map((line, index) => `<li><span>${String(match.log.length - index).padStart(2, "0")}</span>${escapeHtml(line)}</li>`).join("");
  const buttons = $("#move-buttons");
  buttons.innerHTML = "";
  availableMoves(player, opponent).forEach((move) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `${escapeHtml(move.movename)}<small>Damage ${move.damage}${move.illegal ? " · illegal" : ""}</small>`;
    button.addEventListener("click", () => useMove(move));
    buttons.append(button);
  });
  const finisher = $("#finisher-button");
  finisher.textContent = `Use finisher: ${player.finisher}`;
  finisher.hidden = match.finished || opponent.hp > opponent.maxHp * .42;
  finisher.onclick = () => useFinisher();
  const pin = $("#pin-button");
  pin.hidden = match.finished || !opponent.down;
  pin.onclick = () => attemptPin();
  $("#rematch-button").hidden = !match.finished;
  $("#rematch-button").onclick = startMatch;
  $$("#move-buttons button, #finisher-button, #pin-button").forEach((button) => { button.disabled = match.finished; });
  $("#move-hint").textContent = match.finished ? "Match complete." : opponent.down ? "Your opponent is down. Press the advantage or attempt a pin." : "Choose an available move.";
}

function setHealth(key, wrestler) {
  const pct = Math.max(0, Math.round(wrestler.hp / wrestler.maxHp * 100));
  $(`#${key}-health`).style.width = `${pct}%`;
  $(`#${key}-hp`).textContent = `${wrestler.hp} / ${wrestler.maxHp} stamina`;
}

function addCommentary(text) { state.match.log.unshift(text); state.match.log = state.match.log.slice(0, 60); }
function formatComment(template, actor, target, move) { return template.replaceAll("$wrestler", actor.name).replaceAll("$opponent", target.name).replaceAll("$moves", move.movename.toLowerCase()).replaceAll("$move", move.movename.toLowerCase()); }
function specialtyApplies(wrestler, type) { return (wrestler.specialty || "").toLowerCase().includes(type.toLowerCase()); }
function randomInt(max) { return Math.floor(Math.random() * Math.max(1, max)); }

function renderRoster(filter = "") {
  const needle = filter.trim().toLowerCase();
  const wrestlers = data.wrestlers.filter((w) => [w.name, w.fed, w.specialty, w.finisher].some((value) => String(value || "").toLowerCase().includes(needle)));
  $("#roster-grid").innerHTML = wrestlers.map((w) => `<article class="roster-card"><header><h3>${escapeHtml(w.name)}</h3><span class="fed">${escapeHtml(w.fed)}</span></header><p>${escapeHtml(w.specialty)} specialist · ${escapeHtml(w.finisher)}</p>${statsHtml(w)}</article>`).join("");
}

function renderMissions() {
  $("#mission-grid").innerHTML = data.missions.map((m) => `<article class="mission-card"><span class="mission-number">${String(m.mission).padStart(2, "0")}</span><div><h3>${escapeHtml(m.wrestler)} vs. ${escapeHtml(m.opponent)}</h3><p>${escapeHtml(m.desc || `Assignment from ${m.dispatcher || "the office"}.`)}</p><dl><div><dt>MATCH</dt><dd>${escapeHtml(m.typeofmat || m.matchtype)}</dd></div><div><dt>PART</dt><dd>${m.part}</dd></div></dl></div></article>`).join("");
}

function loadHistory() { try { return JSON.parse(localStorage.getItem("aww-match-history") || "[]"); } catch { return []; } }
function renderHistory() {
  const wins = state.history.filter((item) => item.winner === state.match?.player?.name).length;
  $("#history-summary").innerHTML = `<div><b>${state.history.length}</b><span>Matches saved</span></div><div><b>${wins}</b><span>Current-player wins</span></div><div><b>${state.history.length - wins}</b><span>Other results</span></div>`;
  $("#history-list").innerHTML = state.history.length ? state.history.map((item) => `<article class="history-item"><strong>${escapeHtml(item.winner)} defeated ${escapeHtml(item.loser)}</strong><span>${escapeHtml(item.type)} · ${escapeHtml(item.method)} · ${item.turns} turns</span></article>`).join("") : `<p>No matches saved yet.</p>`;
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }

async function init() {
  await loadData();
  $("#count-wrestlers").textContent = data.manifest.records.wrestlers;
  $("#count-moves").textContent = data.manifest.records.moves;
  $("#count-missions").textContent = data.manifest.records.missions;
  populateSetup();
  renderRoster();
  renderMissions();
  $$('[data-nav]').forEach((control) => control.addEventListener("click", () => showView(control.dataset.nav)));
  $("#player-select").addEventListener("change", updatePreviews);
  $("#opponent-select").addEventListener("change", updatePreviews);
  $("#start-match").addEventListener("click", startMatch);
  $("#roster-search").addEventListener("input", (event) => renderRoster(event.target.value));
  $("#clear-history").addEventListener("click", () => { state.history = []; localStorage.removeItem("aww-match-history"); renderHistory(); });
}

init().catch((error) => { document.body.innerHTML = `<main><h1>Could not start AWW</h1><p>${escapeHtml(error.message)}</p></main>`; });
