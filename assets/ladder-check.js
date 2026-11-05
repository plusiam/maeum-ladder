/* =========================================================
   마음 사다리 · 칸별 규칙 판정 (서버·AI 없이 기기 안에서만 동작)
   - 볼 수 있는 것: 물음표, "~구나" 단정, 감정 낱말 수, 도움 낱말, 개수
   - 볼 수 없는 것: 말이 얼마나 따뜻한지 → 짝·관찰자·선생님이 봐요
   ========================================================= */

const LadderCheck = (() => {
  // 감정 낱말 묶음 (같은 묶음은 한 개로 셈)
  const FEELS = [
    /(^|[^대])화\s*(가\s*)?(나|났|난|낼)/, /짜증/, /슬(프|퍼|픈|펐)/, /속상/, /아(프|파|픈)/, /졸(려|리|린)|피곤/,
    /긴장|떨(려|리|린)/, /귀찮/, /서운|섭섭/, /실망/, /쑥스|부끄|창피/, /기분\s*(이\s*)?(나쁘|나빠|나쁜|안\s*좋)/,
    /싫(?!으면|다면)/, /불안/, /아쉽|아쉬/, /심심/, /당황/, /억울/, /걱정/, /외로|쓸쓸/, /부럽|부러|질투/,
    /미안/, /무섭|무서|겁/, /설레|설렘|신나|신난|기뻐|기쁘|기쁜|행복/, /우울/, /놀라|놀랐/
  ];
  const ASK_HELP = /(도와|도움|도울|해\s*줄|해줄|해\s*주면|해주면|필요|원하|바라|뭘\s*해|무엇을\s*해|뭐\s*해)/;
  const DECIDE = /(줄게|줄께|할게|할께|해\s*줄게)/;
  // "말해 줄래?"는 마음을 묻는 말이므로 도움 낱말에서 뺀다
  const asksHelp = (t) => ASK_HELP.test(t.replace(/(말|얘기|이야기)\s*해\s*(줄|주|줘)/g, ""));

  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  const hasQ = (t) => /[?？][\s"'”’)]*$/.test(t);
  const feelCount = (t) => FEELS.filter((re) => re.test(t)).length;
  const feelIds = (t) => FEELS.map((re, k) => (re.test(t) ? k : -1)).filter((k) => k >= 0);
  const isJudge = (t) => /구나[.!\s"'”’]*$|구나[.!]/.test(t) && !hasQ(t);

  const R = (ok, msg, code) => ({ ok, msg, code });

  // 1층: 짐작을 질문으로
  function rung1(text) {
    const t = clean(text);
    if (!t) return R(false, "한 문장을 써 보세요.", "empty");
    if (isJudge(t)) return R(false, "'~구나.'는 아직 단정하는 말이에요. 짐작한 마음 끝에 물음표를 붙여 질문으로 바꿔요.", "judge");
    if (!hasQ(t)) return R(false, "끝에 물음표(?)를 붙여 질문으로 만들어요.", "noq");
    const f = feelCount(t);
    if (f === 0) return R(false, "짐작한 마음 낱말이 없어요. 1층은 '혹시 ○○니?'처럼 내가 짐작한 마음 하나를 넣어 물어요.", "nofeel");
    if (f >= 2) return R(false, "마음을 여러 개 보기로 주었어요. 짐작한 마음 하나만 넣어 물어봐요.", "options");
    return R(true, "짐작을 질문으로 바꿨어요. 이제 친구가 '맞아' 또는 '아니야'라고 답할 수 있어요.", "ok");
  }

  // 2층: 마음을 직접 묻기
  function rung2(text) {
    const t = clean(text);
    if (!t) return R(false, "한 문장을 써 보세요.", "empty");
    if (isJudge(t)) return R(false, "'~구나.'는 단정하는 말이에요. 친구에게 물어봐요.", "judge");
    if (!hasQ(t)) return R(false, "끝에 물음표(?)를 붙여 물어봐요.", "noq");
    if (asksHelp(t)) return R(false, "도움을 묻는 말은 3층이에요. 먼저 친구의 마음을 물어봐요.", "help");
    const f = feelCount(t);
    if (f >= 2) return R(false, "'○○해, ○○해?'처럼 보기를 주었어요. 답을 정하지 말고 친구가 말하게 해요.", "options");
    if (f === 1) return R(false, "짐작한 마음 낱말이 들어 있어요. 그건 1층 질문이에요. 마음 낱말을 빼고 물어봐요.", "feel");
    if (/^(너\s*)?(괜찮|괜챦)(아|니|지)\s*[?？]$/.test(t)) return R(false, "'괜찮아?'는 '응'으로만 답하기 쉬워요. 어떤 마음인지, 무슨 일인지 물어봐요.", "yesno");
    return R(true, "답을 정하지 않고 물었어요. 이제 친구가 자기 마음을 직접 말할 수 있어요.", "ok");
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
  //  items: [{ text, checks: [bool, bool, bool] }]
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

  // 짐작이 비밀 마음과 같은지 (1층 대답을 고를 때)
  const sameFeel = (text, card) => card.feelKeys.some((k) => clean(text).includes(k));

  // 1층 질문에 대한 친구의 대답 고르기
  //  비밀 마음과 같으면 "응, 맞아", 흔한 짐작과 같으면 카드의 대답, 그 밖이면 짧게 아니라고
  function reply1(text, card) {
    if (sameFeel(text, card)) return "응, 맞아. 어떻게 알았어?";
    const mine = feelIds(clean(text)), common = feelIds(card.check);
    if (mine.some((k) => common.includes(k))) return card.checkReply;
    return "음… 그건 아니야.";
  }

  return { rung1, rung2, rung3, helps, sameFeel, reply1, feelCount, feelIds, hasQ };
})();
