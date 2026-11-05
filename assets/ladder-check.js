/* =========================================================
   마음 사다리 · 칸별 규칙 판정 (v3 '사실이·기분이' 사다리)
   - 서버·AI 없이 기기 안에서만 동작합니다.
   - 1층 사실이: 친구 첫말 속 사실 낱말이 들어 있고, 확인하는 말("~라는 말이지?")로 맺었는가
   - 2층 기분이: 기분 낱말로 마음을 알아주거나, 기분을 묻는가
   - 3층 도움 묻기: 도움 낱말 + 물음표, 정해 버리지 않았는가
   - 볼 수 없는 것: 말이 얼마나 따뜻한지, 장단이 자세 → 관찰자·짝·선생님이 봐요
   ========================================================= */

const LadderCheck = (() => {
  // 감정 낱말 묶음 (같은 묶음은 한 개로 셈)
  const FEELS = [
    /(^|[^대])화\s*(가\s*)?(나|났|난|낼)/, /짜증/, /슬(프|퍼|픈|펐)/, /속상/, /아(프|파|픈)/, /졸(려|리|린)|피곤/,
    /긴장|떨(려|리|린|렸)/, /귀찮/, /서운|섭섭/, /실망/, /쑥스|부끄|창피/, /기분\s*(이\s*)?(나쁘|나빠|나쁜|안\s*좋)/,
    /싫(?!으면|다면)/, /불안/, /아쉽|아쉬/, /심심/, /당황/, /억울/, /걱정/, /외로|외롭|쓸쓸/, /부럽|부러|질투/,
    /미안/, /무섭|무서|겁|두렵|두려/, /설레|설렘|신나|신난|기뻐|기쁘|기쁜|행복|즐겁|즐거|들뜨|들떠/, /우울|울적/, /놀라|놀랐/,
    /(속|마음)\s*(이\s*)?안\s*좋/, /힘(들|드|든)|지(쳤|친|치)/, /답답|불편|부담|초조|조마조마/,
    /서럽|서러|상처|미워/, /민망|무안/, /그립|그리워|허전/, /샘\s*(나|난)|약\s*(올라|오르)|분(하|해)|열\s*받|삐(졌|친|져|쳐)|토라/,
    /뿌듯|고마|반가|감동|후련|안심|편안/, /재밌|재미|웃겨|웃긴/, /배\s*(가\s*)?(고파|고프)/
  ];
  const ASK_HELP = /(도와|도움|도울|해\s*줄|해줄|해\s*주면|해주면|필요|원하|바라|뭘\s*해|무엇을\s*해|뭐\s*해)/;
  const DECIDE = /(줄게|줄께|할게|할께|해\s*줄게)/;
  // 듣기 전에 정해 버리는 말(판단·무시·훈계)의 흔한 표지
  const CUT = /(별거|별것|그냥\s*(해|참|주워|넘어|대충)|대충\s*해|원래|조심\s*(좀|했어야)|했어야지|해야지|신경\s*쓰지\s*마|빨리\s*(해|봐|옮겨)|조용히\s*해|그러게)/;
  // 답을 열어 둔 질문 표지
  const OPEN = /(어떤|어떻|어때|어땠|무슨|무엇|뭐|뭘|왜|웬일|(말|얘기|이야기)\s*해\s*(줄|주|줘)|들려\s*(줄|주|줘))/;

  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  const hasQ = (t) => /[?？][\s"'”’)]*$/.test(t);
  const feelIds = (t) => FEELS.map((re, k) => (re.test(t) ? k : -1)).filter((k) => k >= 0);
  const feelCount = (t) => feelIds(t).length;
  const asksHelp = (t) => ASK_HELP.test(t.replace(/(말|얘기|이야기)\s*해\s*(줄|주|줘)/g, ""));
  const R = (ok, msg, code) => ({ ok, msg, code });

  // 1층 사실이: 들은 말 되짚기
  function fact(text, card) {
    const t = clean(text);
    if (!t) return R(false, "한 문장을 써 보세요.", "empty");
    if (CUT.test(t)) return R(false, "판단이나 충고가 들어 있어요. 그건 출발 칸의 말이에요. 친구가 한 말만 되짚어요.", "cut");
    if (asksHelp(t)) return R(false, "도움을 묻는 말은 3층이에요. 먼저 친구가 한 말을 되짚어요.", "help");
    const own = feelIds(clean(card.first));
    if (feelIds(t).some((k) => !own.includes(k))) return R(false, "기분을 말했네요. 그건 2층(기분이)이에요. 먼저 친구가 한 말의 사실만 되짚어요.", "feel");
    if (!card.factKeys.some((k) => t.includes(k))) return R(false, "친구가 한 말을 다시 짚어 줘요. 친구가 말한 낱말을 넣어 '~라는 말이지?'처럼요.", "nofact");
    if (!hasQ(t) && !/구나[.!\s]*$/.test(t)) return R(false, "끝을 '~라는 말이지?'처럼 확인하는 말로 맺어요.", "noq");
    return R(true, "들은 말을 되짚었어요. 친구는 '내 말을 듣고 있구나' 하고 느껴서 더 이야기할 수 있어요.", "ok");
  }

  // 2층 기분이: 마음 알아주기 (말해 주기 또는 묻기)
  function feel(text) {
    const t = clean(text);
    if (!t) return R(false, "한 문장을 써 보세요.", "empty");
    if (CUT.test(t)) return R(false, "판단이나 충고가 들어 있어요. 친구의 기분을 알아주는 말로 바꿔요.", "cut");
    const f = feelCount(t);
    if (f >= 2 && /아니면/.test(t)) return R(false, "'○○해, 아니면 ○○해?'처럼 보기를 주었어요. 들은 말에서 읽은 기분 하나를 말해 주거나 기분을 물어봐요.", "options");
    if (f >= 1) return R(true, "들은 말에서 기분을 읽어 말해 줬어요. 맞으면 친구가 '응' 하고, 다르면 바로잡아 줄 거예요.", "ok");
    if (/(기분|마음|느낌)/.test(t) && OPEN.test(t)) return R(true, "친구의 기분을 물었어요. 이제 친구가 자기 기분을 직접 말할 수 있어요.", "ok-ask");
    if (asksHelp(t)) return R(false, "도움을 묻는 말은 3층이에요. 먼저 친구의 기분을 알아줘요.", "help");
    if (/(그랬구나|그렇구나|그랬어\?|정말\?|진짜\?)/.test(t)) return R(false, "'그랬구나'는 좋은 맞장구(장단이)예요. 한 걸음 더: 들은 말에서 읽은 기분을 넣어 '~해서 ~하겠다'처럼 말해 줘요.", "nod");
    return R(false, "기분이 들어 있지 않아요. '~해서 ~하겠다'처럼 기분을 말해 주거나, '그때 기분이 어땠어?'처럼 물어봐요.", "nofeel");
  }

  // 3층: 도움 묻기
  function rung3(text) {
    const t = clean(text);
    if (!t) return R(false, "한 문장을 써 보세요.", "empty");
    if (DECIDE.test(t) && !hasQ(t)) return R(false, "도움을 정해 버렸어요. 무엇을 해 줄지 친구에게 물어봐요.", "decide");
    if (!hasQ(t)) return R(false, "끝에 물음표(?)를 붙여 물어봐요.", "noq");
    if (!asksHelp(t)) return R(false, "도움을 묻는 말이 없어요. '내가 어떻게 도와줄까?'처럼 물어봐요.", "nohelp");
    return R(true, "도움을 물었어요. 친구가 바라는 것을 들을 수 있어요. '괜찮아'라는 대답도 존중해요.", "ok");
  }

  // 도울 방법: 세 가지 이상 + 기준 세 가지 점검
  function helps(items) {
    const filled = items.map((x, k) => ({ ...x, k, text: clean(x.text) })).filter((x) => x.text.length >= 2);
    const uniq = [...new Map(filled.map((x) => [x.text.replace(/\s/g, ""), x])).values()];
    const checked = uniq.filter((x) => x.checks.every(Boolean));
    if (uniq.length < 3) return R(false, `도울 방법을 세 가지 이상 써요. (지금 ${uniq.length}가지)`, "few");
    if (checked.length < 3) {
      const need = uniq.filter((x) => !x.checks.every(Boolean)).map((x) => x.k + 1);
      return R(false, `${need.join(", ")}번 방법을 세 가지 기준으로 점검해 보세요. 기준에 안 맞으면 고쳐 써도 돼요.`, "unchecked");
    }
    return R(true, `세 가지 기준을 지킨 도울 방법 ${checked.length}가지를 찾았어요.`, "ok");
  }

  const sameFeel = (text, card) => card.feelKeys.some((k) => clean(text).includes(k));
  // 2층 대답: 기분을 물었거나 맞게 알아주면 feelYes, 다르게 말하면 친구가 바로잡음(feelNo)
  // 넓게 말한 기분(힘들다, 기분이 안 좋다 등)은 틀린 게 아니라 친구가 더 자세히 말해 줌
  const BROAD = /(힘들|힘드|힘든|지쳤|지친|(속|마음|기분)\s*(이\s*)?(안\s*좋|별로|나쁘|나빠))/;
  const core = (s) => s.replace(/^응\s*[,…!.]?\s*(맞아\s*[.…!]?\s*)?/, "");
  function replyFeel(text, card) {
    const t = clean(text);
    if (feelCount(t) === 0) return core(card.feelYes);                 // 기분을 물었으면 친구가 직접 말함
    if (sameFeel(t, card)) return card.feelYes;
    const ids = feelIds(t);
    if (BROAD.test(t) && ids.length === 1) return "응, 그런 것도 있어. 사실은 " + core(card.feelYes);
    return card.feelNo;                                               // 다르게 말하면 친구가 바로잡음
  }

  return { fact, feel, rung3, helps, sameFeel, replyFeel, feelCount, feelIds, hasQ };
})();
