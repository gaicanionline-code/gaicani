/* ══════════════════════════════════════════════════════════════════
   server-games-patch.js
   ──────────────────────────────────────────────────────────────────
   HOW TO INTEGRATE:
   1. Add the two Maps after your existing requires at the top of server.js:

       const gameBySocket = new Map();   // socketId  → gameId
       const gameById     = new Map();   // gameId    → gameState

   2. Add the helper functions (generateMathQuestion, rand,
      checkTTTWinner, getRPSWinner) anywhere in server.js OUTSIDE of
      io.on('connection', ...).

   3. Paste the socket event handlers INSIDE your existing
       io.on('connection', socket => { ... })  block.

   4. Make sure your server uses  socket.partner  to hold the reference
      to the paired socket object (most Omegle-style servers do).
      If yours uses a different variable name, update the one line
      marked  ← ADAPT THIS  below.
   ══════════════════════════════════════════════════════════════════ */


/* ── STEP 1 – Add these two Maps near the top of server.js ───────── */
const gameBySocket = new Map(); // socketId  → gameId string
const gameById     = new Map(); // gameId    → game object


/* ── STEP 2 – Helper functions (outside io.on) ───────────────────── */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMathQuestion() {
  const ops = ['+', '-', '*'];
  const op  = ops[rand(0, 2)];
  let a, b, answer;

  if (op === '+') {
    a = rand(1, 50); b = rand(1, 50); answer = a + b;
  } else if (op === '-') {
    a = rand(10, 99); b = rand(1, a);  answer = a - b;
  } else {
    a = rand(2, 12);  b = rand(2, 12); answer = a * b;
  }

  const display = op === '*' ? `${a} × ${b}` : `${a} ${op} ${b}`;
  return { display, answer };
}

function checkTTTWinner(board) {
  const LINES = [
    [0,1,2],[3,4,5],[6,7,8],   // rows
    [0,3,6],[1,4,7],[2,5,8],   // cols
    [0,4,8],[2,4,6],           // diagonals
  ];
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { symbol: board[a], line: [a,b,c] };
  }
  return null;
}

/** Returns 'p1' | 'p2' | 'draw' */
function getRPSWinner(c1, c2) {
  if (c1 === c2) return 'draw';
  if (
    (c1 === 'rock'     && c2 === 'scissors') ||
    (c1 === 'scissors' && c2 === 'paper')    ||
    (c1 === 'paper'    && c2 === 'rock')
  ) return 'p1';
  return 'p2';
}

/* ── 🎭 TRUTH OR DARE — Georgian content pools ────────────────────
   TRUTHS: personal questions (same tone/list as facts.txt/questions.txt).
   DARES:  online-only challenges — everything is doable purely through
   the chat window (typing, emoji, quick word games), nothing physical
   or off-platform, so it's safe for two strangers chatting online. ── */
const TOD_TRUTHS = [
  'რას ვერ აპატიებთ საუკეთესო მეგობარს?',
  'საუკეთესო საჩუქარი, რომელიც მიგიღიათ მეგობრებისგან?',
  'რითი აფასებთ ადამიანებს?',
  'რა გაღიზიანებთ ყველაზე მეტად ადამიანებში?',
  'რა მეტსახელს გიწოდებდნენ მშობლები ბავშვობაში?',
  'რა თვისებით ამაყობთ ყველაზე მეტად საკუთარ თავში?',
  'ვინ გინდოდათ გამხდარიყავით ბავშვობაში?',
  'რომელი მოგონება გითბობთ სულს მძიმე დღეებში?',
  'რაზე გეცინებათ გულიანად?',
  'როგორ აგვარებთ კონფლიქტებს?',
  'თქვენი საყვარელი პერსონაჟი წიგნიდან ან ფილმიდან?',
  'როგორია თქვენი საოცნებო სამსახური?',
  'რა არის თქვენი ყველაზე დიდი მიღწევა?',
  'ბოლოს რატომ იტირეთ?',
  'რისი შეცვლა გსურდათ წარსულში?',
  'რომელი თვისების შეცვლას ისურვებდით საკუთარ თავში?',
  'რა არის თქვენი ყველაზე უცნაური ფობია?',
  'რომელ სამ ზედსართავ სახელს გამოიყენებდით საკუთარი თავის დასახასიათებლად?',
  'როგორია თქვენი იდეალური დილა?',
  'რა არის გადაჭარბებული ჩვენს საზოგადოებაში?',
  'რომელ კითხვაზე არ უპასუხებდით არასოდეს?',
  'რა არის თქვენთვის ყველაზე გაუგებარი რამ მსოფლიოში?',
  'რა არის თქვენი ყველაზე გიჟური ოცნება?',
  'რა იყო შენი პირველი შთაბეჭდილება ამ ჩატზე?',
  'დიდი წვეულებები გირჩევნია თუ ვიწრო წრეში მეგობრებთან ყოფნა?',
  'რა არის შენი მთავარი წესი ცხოვრებაში?',
  'რისი გეშინია ყველაზე მეტად?',
  'რომელი სუპერძალა გინდოდა რომ გქონდეს და რატომ?',
  'რას აკეთებდი, რომ არავინ გიცნობდეს?',
  'ბოლო რაზე იცინე ისე, რომ თვალებში ცრემლი მოგივიდა?',
];

const TOD_DARES = [
  'დაწერე შენი სახელი პირიქით, ასოების უკუღმა.',
  'გამოგზავნე 5 ემოჯი, რომლებიც ახლანდელ განწყობას აღწერს.',
  'დაწერე მოკლე წინადადება მხოლოდ ემოჯებით და მოწინააღმდეგემ გამოიცნოს.',
  'დაწერე 3 სიტყვა, რომლებიც პირველი მოგივიდა თავში.',
  'მოწინააღმდეგეს გაუკეთე გულწრფელი კომპლიმენტი.',
  'დაწერე ხუმრობა (ხუმრობა/анекдот) ისე, რომ მოწინააღმდეგემ გაიცინოს.',
  'დაწერე შენი შემდეგი 3 შეტყობინება მხოლოდ დიდი ასოებით.',
  'აღწერე დღევანდელი დღე ერთი წინადადებით — მაგრამ ბოლოში-ვე უნდა დაარიფებდე.',
  'დაწერე ცნობილი ფილმის ან სერიალის სახელი ასოებით არეულად, ისე რომ გამოიცნონ.',
  'გამოთქვი (დაწერე) ვინმეს სახელი, ვისზეც ახლა ფიქრობ — ინიციალებით.',
  'დაწერე 5 წამის განმავლობაში ისე სწრაფად როგორც შეგიძლია — რაც არ უნდა გამოვიდეს.',
  'აღწერე შენი დღევანდელი განწყობა მხოლოდ ერთი ფერით.',
  'დაწერე პატარა კომპლიმენტი საკუთარ თავზე — რაზეც ამაყობ.',
  'გამოიცანი მოწინააღმდეგის საყვარელი ფერი და დაწერე რატომ ასე ფიქრობ.',
  'დაწერე „მადლობა“ 5 სხვადასხვა ენაზე.',
  'დაწერე შენი დღის ერთი უცნაური დეტალი.',
  'შექმენი პატარა 4-სტრიქონიანი რითმა ნებისმიერ თემაზე.',
  'დაწერე შენი ტოპ-3 საყვარელი სიმღერა ახლა.',
  'აღწერე საკუთარი თავი ერთი ცხოველით და ახსენი რატომ.',
  'დაწერე წინადადება, რომელშიც ყველა სიტყვა ერთი ასოთი იწყება.',
  'გამოთქვი ერთი რამ, რაზეც დღეს მადლიერი ხარ.',
  'დაწერე ერთი ტვიტის ზომის (280 სიმბოლომდე) ისტორია ამ ჩატის შესახებ.',
  'გამოგზავნე ემოჯი-სერია, რომელიც შენი ბოლო კვირას აღწერს.',
  'დაწერე რომელიმე სიმღერის ერთი სტრიქონი შენი სიტყვებით (არა ორიგინალი ტექსტი).',
  'დაასახელე ერთი წიგნი ან ფილმი, რომელიც ყველას ურჩევდი.',
];

// Avoids repeating the same prompt twice in a row within one game.
function pickTodPrompt(pool, lastText) {
  if (pool.length === 1) return pool[0];
  let text;
  do {
    text = pool[rand(0, pool.length - 1)];
  } while (text === lastText);
  return text;
}


/* ── STEP 3 – Paste these handlers inside  io.on('connection', socket => { ─ */

  // ── GAME REQUEST ─────────────────────────────────────────────────
  socket.on('game:request', ({ gameType }) => {
    const partner = socket.partner; // ← ADAPT THIS if your var name differs
    if (!partner) return;
    partner.emit('game:invite', { gameType, fromId: socket.id });
  });

  // ── GAME RESPONSE (accept / decline) ─────────────────────────────
  socket.on('game:response', ({ accepted, gameType, toId }) => {
    const requesterSocket = io.sockets.sockets.get(toId);
    if (!requesterSocket) return;

    if (!accepted) {
      requesterSocket.emit('game:declined');
      return;
    }

    // Build game state
    const gameId = `${toId}:${socket.id}`;
    const players = [toId, socket.id]; // players[0] = requester, players[1] = accepter

    let state;
    if (gameType === 'ttt') {
      state = {
        board: Array(9).fill(null),
        currentTurnSocketId: toId,    // requester (X) goes first
      };
    } else if (gameType === 'rps') {
      state = { choices: {} };
    } else if (gameType === 'math') {
      state = { question: generateMathQuestion(), answered: false };
    } else if (gameType === 'tod') {
      state = {
        currentTurnSocketId: toId,   // requester goes first
        prompt: null,                // { type: 'truth'|'dare', text }
        round: 1,
        lastTruth: null,
        lastDare: null,
      };
    }

    const game = { id: gameId, type: gameType, players, state };
    gameById.set(gameId, game);
    gameBySocket.set(toId,      gameId);
    gameBySocket.set(socket.id, gameId);

    // Notify both players — role only meaningful for TTT
    const roles = { [toId]: 'X', [socket.id]: 'O' };

    [toId, socket.id].forEach(pid => {
      const s = io.sockets.sockets.get(pid);
      if (s) s.emit('game:start', {
        gameId,
        gameType,
        role:       roles[pid] ?? null,
        opponentId: pid === toId ? socket.id : toId,
        state,
      });
    });
  });

  // ── GAME MOVE ─────────────────────────────────────────────────────
  socket.on('game:move', (data) => {
    const gameId = gameBySocket.get(socket.id);
    if (!gameId) return;
    const game = gameById.get(gameId);
    if (!game) return;

    const [p1Id, p2Id]    = game.players; // p1 = requester (X), p2 = accepter (O)
    const partnerId        = socket.id === p1Id ? p2Id : p1Id;
    const partnerSocket    = io.sockets.sockets.get(partnerId);

    // ── TIC TAC TOE ──────────────────────────────────────────────
    if (game.type === 'ttt') {
      const { index } = data;
      const { board, currentTurnSocketId } = game.state;

      if (currentTurnSocketId !== socket.id) return; // not your turn
      if (board[index] !== null) return;              // cell taken

      const symbol         = socket.id === p1Id ? 'X' : 'O';
      board[index]         = symbol;
      const winResult      = checkTTTWinner(board);
      const draw           = !winResult && board.every(Boolean);

      if (!winResult && !draw)
        game.state.currentTurnSocketId = partnerId;

      const update = {
        board,
        currentTurnSocketId: game.state.currentTurnSocketId,
        winnerSocketId: winResult ? socket.id : undefined,
        winLine:        winResult ? winResult.line : undefined,
        draw:           draw || undefined,
      };

      socket.emit('game:update', update);
      if (partnerSocket) partnerSocket.emit('game:update', update);

      if (winResult || draw) cleanupGame(game);

    // ── ROCK PAPER SCISSORS ──────────────────────────────────────
    } else if (game.type === 'rps') {
      if (game.state.choices[socket.id]) return; // already chose
      game.state.choices[socket.id] = data.choice;

      // Tell partner someone chose (without revealing what)
      if (partnerSocket)
        partnerSocket.emit('game:update', { opponentChose: true });

      if (Object.keys(game.state.choices).length === 2) {
        const c1     = game.state.choices[p1Id];
        const c2     = game.state.choices[p2Id];
        const result = getRPSWinner(c1, c2);
        const winnerSocketId =
          result === 'draw' ? null :
          result === 'p1'   ? p1Id : p2Id;

        const update = {
          choices:        game.state.choices,
          winnerSocketId,
          draw: result === 'draw',
        };
        socket.emit('game:update', update);
        if (partnerSocket) partnerSocket.emit('game:update', update);
        cleanupGame(game);
      }

    // ── MATH DUEL ────────────────────────────────────────────────
    } else if (game.type === 'math') {
      if (game.state.answered) return;
      const { answer: submitted } = data;

      if (submitted === game.state.question.answer) {
        game.state.answered = true;
        const update = {
          winnerSocketId: socket.id,
          answer:         game.state.question.answer,
          question:       game.state.question,
        };
        socket.emit('game:update', update);
        if (partnerSocket) partnerSocket.emit('game:update', update);
        cleanupGame(game);
      } else {
        socket.emit('game:update', { wrong: true });
      }

    // ── TRUTH OR DARE ──────────────────────────────────────────────
    } else if (game.type === 'tod') {
      const st = game.state;

      // Only the current player may act, and only in the right phase.
      if (st.currentTurnSocketId !== socket.id) return;

      if (!st.prompt && (data.choice === 'truth' || data.choice === 'dare')) {
        // Phase 1 → 2: they picked truth or dare, hand them a prompt.
        if (data.choice === 'truth') {
          st.prompt    = { type: 'truth', text: pickTodPrompt(TOD_TRUTHS, st.lastTruth) };
          st.lastTruth = st.prompt.text;
        } else {
          st.prompt   = { type: 'dare', text: pickTodPrompt(TOD_DARES, st.lastDare) };
          st.lastDare = st.prompt.text;
        }

        const update = {
          currentTurnSocketId: st.currentTurnSocketId,
          prompt: st.prompt,
          round:  st.round,
        };
        socket.emit('game:update', update);
        if (partnerSocket) partnerSocket.emit('game:update', update);

      } else if (st.prompt && data.done === true) {
        // Phase 2 → 1: they finished it — pass the turn to the other player.
        st.prompt = null;
        st.round  = (st.round || 1) + 1;
        st.currentTurnSocketId = partnerId;

        const update = {
          currentTurnSocketId: st.currentTurnSocketId,
          prompt: null,
          round:  st.round,
        };
        socket.emit('game:update', update);
        if (partnerSocket) partnerSocket.emit('game:update', update);
      }
    }
  });

  // ── REMATCH REQUEST ───────────────────────────────────────────────
  socket.on('game:rematch', ({ gameType, toId }) => {
    const target = io.sockets.sockets.get(toId);
    if (!target) return;
    target.emit('game:invite', { gameType, fromId: socket.id, isRematch: true });
  });

  // ── CLEAN UP WHEN PLAYER DISCONNECTS ─────────────────────────────
  // Add this inside the existing disconnect handler (or create one)
  // inside io.on('connection', socket => { ... })
  //
  //   socket.on('disconnect', () => {
  //     /* … your existing cleanup … */
  //     cleanupGameForSocket(socket.id);
  //   });
  //
  // And call cleanupGameForSocket from the 'next'/'skip' handler too
  // (when partner leaves voluntarily).


/* ── STEP 2b – Add cleanupGame helpers OUTSIDE io.on ──────────────── */

function cleanupGame(game) {
  game.players.forEach(pid => gameBySocket.delete(pid));
  gameById.delete(game.id);
}

function cleanupGameForSocket(socketId) {
  const gameId = gameBySocket.get(socketId);
  if (!gameId) return;
  const game = gameById.get(gameId);
  if (!game) { gameBySocket.delete(socketId); return; }

  const partnerId     = game.players.find(id => id !== socketId);
  const partnerSocket = partnerId && io.sockets.sockets.get(partnerId);
  if (partnerSocket) partnerSocket.emit('game:partnerLeft');

  cleanupGame(game);
}
