(() => {
  'use strict';

  const STORAGE_KEY = 'say-clear-offline-v1';
  const $ = (id) => document.getElementById(id);
  const state = loadState();
  let activeScreen = 'home';
  let trainingIndex = Math.max(0, Math.min(13, (state.currentDay || 1) - 1));
  let trainingStep = 0;
  let trainingRating = 0;
  let timerId = null;
  let timerSeconds = 60;
  let timerContext = '';
  let recorder = { media: null, chunks: [], blob: null, url: null };
  let freeState = { framework: 'story', topic: null };
  let quizState = { index: 0, score: 0, answered: false };
  let challengeState = { topic: null, saved: false };
  let boundaryState = { index: 0, score: 0, answered: false };
  let toastTimer = null;

  const TRAININGS = [
    { day: 1, stage: '结构感', title: '三句话说清一件事', summary: '用“结果—原因—影响”把一件小事讲完整。', structure: '结果—原因—影响/行动', read: '今天的报告没有完成。上午临时增加了拍摄任务，原来的时间被打乱了。明天上午需要先补完报告，下午再做校对。', task: '读完后合上原文，用三句话说明：发生了什么、为什么、接下来怎么办。', tip: '先说结果，不要让听者等到最后才知道重点。' },
    { day: 2, stage: '结构感', title: '把原因说到点上', summary: '练习只保留一个最关键的原因。', structure: '结果—关键原因—影响', read: '小林今天没有按计划跑步。不是因为不想跑，而是昨晚临时加班到很晚，早上起床时身体还没有恢复。', task: '复述这件事，并说明为什么只保留这个原因就够了。', tip: '原因不是越多越好，先找到真正改变结果的那个原因。' },
    { day: 3, stage: '结构感', title: '说清楚后续影响', summary: '让表达从“发生了什么”落到“接下来做什么”。', structure: '结果—原因—影响/行动', read: '家里的冰箱突然不制冷了。检查后发现插头松动，重新插好后暂时恢复正常，但里面的食物已经不够安全，今天需要重新采购。', task: '复述时补上影响和下一步，不要停在问题本身。', tip: '一个清楚的结尾，通常包含影响、选择或下一步。' },
    { day: 4, stage: '画面感', title: '把“很热”说具体', summary: '用视觉、触觉和听觉替换抽象形容词。', structure: '感官细节', read: '下午在户外连续拍摄了三个小时。地面被太阳晒得发烫，汗水从后背流到腰间，衣服贴在身上，连手里的手机都发热得握不住。', task: '脱稿复述，并至少保留两种感官细节。', tip: '具体不是堆形容词，而是让别人看见、听见或感觉到。' },
    { day: 5, stage: '画面感', title: '把“很累”说具体', summary: '让身体感受和现场动作帮助别人理解。', structure: '感官细节', read: '忙完一天回到家，我把包放在门口，坐下后五分钟都没有起身。原本想做饭，打开冰箱看了一会儿，最后只泡了一碗面。', task: '复述时不要直接说“我很累”，让动作表现疲惫。', tip: '如果一个抽象词能被动作替代，就优先使用动作。' },
    { day: 6, stage: '画面感', title: '给表达加一个数据', summary: '练习使用时间、数量、距离或前后变化。', structure: '细节—数据锚点', read: '这次整理文件比想象中久。一个下午清理了 326 个重复文件，最后只留下 84 个真正需要保留的资料，之后找文件会快很多。', task: '复述时至少说出一个数字，并解释它说明了什么。', tip: '数据不是为了显得专业，而是帮助对方形成尺度感。' },
    { day: 7, stage: '画面感', title: '完整复述一个故事', summary: '把冲突、行动和结果连成一条线。', structure: '冲突—行动—结果', read: '台风来时，阳台上的花盆被风吹得摇摇欲坠。我先关好窗户，再把花盆移到墙边并固定住。风停后没有造成损失，也提醒我以后台风前要提前检查阳台。', task: '用“冲突—行动—结果”复述，不看原文说 60 秒以内。', tip: '故事不需要讲所有细节，只保留推动事情变化的部分。' },
    { day: 8, stage: '观点表达', title: '先把观点说出来', summary: '练习不绕圈，第一句就给结论。', structure: '观点—依据—建议', read: '我认为这个方案暂时不可行。它的成本已经超出预算，而且目前还没有经过小范围测试。建议先做一个低成本版本，再决定是否全面执行。', task: '先说自己的观点，再补一个依据和一个建议。', tip: '观点可以被讨论，但不能一直藏在铺垫后面。' },
    { day: 9, stage: '观点表达', title: '让观点有依据', summary: '把“我觉得”换成事实、数据或例子。', structure: '观点—事实—例子', read: '同样是说“这个方法有效”，可信度并不一样。说出使用次数、前后变化，或一个具体案例，别人就能判断你的结论从哪里来。', task: '对一个生活问题表达观点，并给出一个事实或例子。', tip: '依据不一定要复杂，但要能让别人检查或想象。' },
    { day: 10, stage: '观点表达', title: '把建议落到行动', summary: '让建议有对象、有步骤、有时间。', structure: '观点—依据—建议', read: '连续工作很久后，效率通常会下降。与其一边疲惫一边硬撑，不如先停下来休息，再把最紧急的任务拆成几个小段，明天集中处理。', task: '结尾提出一个今天或明天就能开始的小行动。', tip: '好的建议不是口号，而是下一步可以执行的动作。' },
    { day: 11, stage: '即兴表达', title: '随机词：等待', summary: '从一个词出发，连续表达 60 秒。', structure: '定义—例子—观点', read: '等待不一定是浪费时间。潮汕功夫茶里，水温、出汤和分享都需要一点等待；这段等待让人放慢，也让对话自然发生。', task: '围绕“等待”说 60 秒，可联系自己的生活、家庭或工作。', tip: '卡住时按“它是什么—我见过什么—我怎么看”继续。' },
    { day: 12, stage: '对话互动', title: '先接住，再追问', summary: '练习回应同事的情绪，不急着给建议。', structure: '情绪—事实—选择—确认', read: '同事说：“跨部门协作太难了，每次都要反复确认。”一个有效的回应可以是：“确实，沟通成本高会让人很累。具体卡在哪个环节？我们先把责任人和截止时间列出来。”', task: '先回应情绪，再问一个具体问题，最后给一个小行动。', tip: '共情不是附和，也不是马上解决，而是先让对方愿意继续说。' },
    { day: 13, stage: '对话互动', title: '把抽象问题问具体', summary: '用下切和平行帮助对方找到选择。', structure: '情绪—下切—平行—行动', read: '孩子说：“我不想写作业。”与其马上讲道理，不如先回应：“你现在挺烦的。”再问：“具体是哪一科、哪一步最难？”最后提供选择：“先做简单题，还是先看一道例题？”', task: '模拟一次家庭沟通，至少使用一次下切和一次平行提问。', tip: '先处理情绪，再处理问题；不要把建议变成命令。' },
    { day: 14, stage: '复盘巩固', title: '找出自己的下一步', summary: '回听前面的练习，形成下一个小目标。', structure: '结果—原因—影响—改进', read: '14 天练习的目的不是变成一个完美的演讲者，而是知道自己哪里更清楚了，哪里仍然容易卡住。下一阶段只选一个短板继续练，例如开头不清楚、细节不足或容易急着给建议。', task: '回听至少两段录音，写下一个进步点、一个问题和一个下周动作。', tip: '一次只改一个问题，才能知道什么方法真正有效。' }
  ];

  const TOPICS = [
    { word: '鬃狮蜥拒食', category: '兴趣', prompt: '用“情况—细节—判断”说清楚你会观察什么。' },
    { word: '爬宠箱环境', category: '兴趣', prompt: '从光照、温度、湿度中选两个角度表达。' },
    { word: '孩子的积木', category: '家庭', prompt: '从创造力、规则和亲子互动中选一个观点。' },
    { word: '冰箱里的鸡蛋', category: '日常', prompt: '从一个生活细节讲到一个实用建议。' },
    { word: '功夫茶的等待', category: '生活', prompt: '说说等待带来的价值，并给一个具体例子。' },
    { word: '慢的价值', category: '观点', prompt: '先定义“慢”，再说它什么时候有用。' },
    { word: '缺口的意义', category: '观点', prompt: '从一个物品或经历出发，讲出你的联想。' },
    { word: '重复的力量', category: '学习', prompt: '联系练习、工作或动物习性表达一个观点。' },
    { word: '一次临时安排', category: '工作', prompt: '用“结果—原因—影响”讲清它如何改变计划。' },
    { word: '一个没被听见的想法', category: '沟通', prompt: '先说事实，再说你希望对方怎么回应。' }
  ];

  const FRAMEWORKS = {
    story: { label: '故事', mark: '①', hint: '冲突—行动—结果' },
    event: { label: '事情', mark: '②', hint: '结果—原因—影响' },
    opinion: { label: '观点', mark: '③', hint: '观点—依据—建议' },
    dialog: { label: '对话', mark: '④', hint: '情绪—事实—选择' }
  };

  const QUIZES = [
    { text: '孩子说：“我不想写作业。”下面哪一句最适合作为第一回应？', quote: '目标：先降低对抗，再了解具体问题。', options: ['数学很重要，不能总是逃避。', '我听起来你现在挺烦的，具体是哪一部分最难？', '那就别写了，明天自己向老师解释。'], answer: 1, explain: '先回应情绪，再下切具体问题。这样不是纵容，而是让沟通继续进行。' },
    { text: '同事说：“这个项目太乱了。”你接下来最好的追问是什么？', quote: '目标：把抽象抱怨落到可以处理的环节。', options: ['你怎么总是觉得事情很难？', '大家都很忙，只能先这样。', '具体是目标、分工还是时间节点最乱？'], answer: 2, explain: '把“太乱”下切成目标、分工和时间节点，才容易找到行动。' },
    { text: '客户说：“你们的价格偏高。”哪种回应更稳妥？', quote: '目标：承认关注点，再了解真实取舍。', options: ['我们的价格一直都是这样。', '您比较关注价格，这确实是关键因素。您现在更看重总成本、功能还是服务？', '如果觉得贵，那就不用考虑了。'], answer: 1, explain: '先承认对方的关注点，再问优先级，才能把价格争论转成需求讨论。' },
    { text: '朋友分享一个好消息，你想继续聊下去，哪句最自然？', quote: '目标：让对方展开自己的经历。', options: ['那后来呢？你当时怎么想的？', '我也有类似经历。', '这没什么，很多人都能做到。'], answer: 0, explain: '“后来呢”和“当时怎么想的”能让对方补充过程和感受。' },
    { text: '同事提出一个方案，你不完全同意，哪句更有建设性？', quote: '目标：鼓励不等于无条件同意。', options: ['也对，就按你说的做。', '这个思路有价值，我担心成本和执行时间，可以先做小范围验证。', '这个方案肯定不行。'], answer: 1, explain: '先承认有效部分，再指出风险和验证动作，既不抬杠也不假装同意。' }
  ];

  const BOUNDARY_CASES = [
    { scene: '同事临时把自己负责的部分推给你，而你的工作也已经排满。', question: '这件事首先应该归到哪一类？', choices: ['我的课题', '对方的课题', '共同课题', '必须介入的事项'], answer: 1, explain: '对方是否完成自己的职责，首先是对方的课题。你的课题是明确边界、说明影响并完成自己的部分。', line: '我可以说明交付时间和影响，但不能替你完成这部分。' },
    { scene: '孩子想选择一个不符合父母期待、但安全合法的学习方向。', question: '父母最合适的角色是什么？', choices: ['替孩子决定', '提供信息和支持，选择由孩子承担', '完全不管', '要求孩子先实现父母的目标'], answer: 1, explain: '孩子的选择是他的课题，父母可以提供资源、提醒风险和支持，但不必把自己的焦虑变成控制。', line: '我可以帮你了解信息，但最后的选择需要你自己负责。' },
    { scene: '室友长期把空调温度调得很低，电费会由你们共同承担。', question: '这更接近哪一种情况？', choices: ['完全是我的课题', '完全是对方的课题', '共同课题', '与任何人都无关'], answer: 2, explain: '费用和生活规则会同时影响双方，因此要协商规则、共同承担结果。', line: '这会影响我们两个人，我们一起定一个温度和使用时间。' },
    { scene: '你发现一个未成年人可能正在遭受伤害，放手不管可能有严重后果。', question: '此时能不能只说“那是他的课题”？', choices: ['可以，谁承担后果谁负责', '可以，只要不涉及自己', '不能，应优先履行保护和求助责任', '只有对方同意才需要处理'], answer: 2, explain: '涉及安全、伤害和照护责任时，不能把课题分离当成袖手旁观，应先保护、提醒并寻求合适帮助。', line: '这关系到安全，我会先保证他脱离危险，再联系合适的人一起处理。' }
  ];

  function defaultState() {
    return { currentDay: 1, completedDates: [], trainingRecords: [], freeRecords: [], quizRecords: [], startDate: todayKey() };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Object.assign(defaultState(), saved || {});
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function todayKey(date = new Date()) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
  function formatDate(value) { return String(value || '').replace(/-/g, '/'); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function currentTraining() { return TRAININGS[trainingIndex] || TRAININGS[0]; }
  function currentDayNumber() { return Math.min(14, Math.max(1, state.currentDay || 1)); }
  function hasCompletedToday() { return state.completedDates.includes(todayKey()); }
  function calculateStreak() {
    const days = new Set(state.completedDates || []);
    const cursor = new Date();
    let total = 0;
    while (days.has(todayKey(cursor))) { total += 1; cursor.setDate(cursor.getDate() - 1); }
    return total;
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function showScreen(name) {
    activeScreen = name;
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === `${name}-screen`));
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.action === ({ home: 'go-home', train: 'start-today', free: 'show-free', records: 'show-records' }[name] || '')));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderHome() {
    const day = currentDayNumber();
    const item = TRAININGS[day - 1];
    const finishedAll = state.currentDay > 14;
    $('current-day').textContent = day;
    $('completed-count').textContent = state.completedDates.length;
    $('streak-count').textContent = calculateStreak();
    $('progress-fill').style.width = `${Math.min(100, (state.completedDates.length / 14) * 100)}%`;
    $('progress-title').textContent = finishedAll ? '14 天集训完成' : `从${item.stage}开始`;
    $('progress-subtitle').textContent = finishedAll ? '可以继续自由练习和复习' : (hasCompletedToday() ? '今天已完成，继续保持' : '今天完成一段脱稿复述');
    $('today-stage').textContent = `DAY ${String(item.day).padStart(2, '0')} · ${item.stage}`;
    $('today-title').textContent = finishedAll ? '复习最需要的一天' : item.title;
    $('today-summary').textContent = finishedAll ? '回听一段以前的练习，再把它重新说一遍。' : item.summary;
    $('today-button-text').textContent = hasCompletedToday() ? '继续今天的练习' : (finishedAll ? '开始复习' : '打开今天的练习');
  }

  function renderPlan() {
    const completedDays = new Set(state.trainingRecords.map((record) => record.day));
    $('plan-list').innerHTML = TRAININGS.map((item) => {
      const done = completedDays.has(item.day);
      const current = item.day === currentDayNumber() && !done;
      return `<button class="plan-item ${done ? 'completed' : ''} ${current ? 'current' : ''}" type="button" data-action="open-plan-day" data-day="${item.day}">
        <span class="plan-number">${item.day}</span><span class="plan-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.stage)} · ${escapeHtml(item.structure)}</small></span><span class="plan-badge">${done ? '已完成' : (current ? '今天' : '待练')}</span>
      </button>`;
    }).join('');
  }

  function renderTraining() {
    stopTimer();
    const item = currentTraining();
    $('train-stage').textContent = `DAY ${String(item.day).padStart(2, '0')} · ${item.stage}`;
    document.querySelectorAll('[data-step-indicator]').forEach((node) => {
      const step = Number(node.dataset.stepIndicator);
      node.classList.toggle('active', step === trainingStep);
      node.classList.toggle('done', step < trainingStep);
    });
    if (trainingStep === 0) renderReadStep(item);
    if (trainingStep === 1) renderRetellStep(item);
    if (trainingStep === 2) renderReviewStep(item);
  }

  function renderReadStep(item) {
    $('train-content').innerHTML = `<article class="training-card">
      <div class="training-meta"><span>第 ${item.day} 天 · ${escapeHtml(item.stage)}</span><span>约 3 分钟</span></div>
      <h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p>
      <div class="read-box">${escapeHtml(item.read)}</div>
      <span class="structure-chip">${escapeHtml(item.structure)}</span>
      <div class="instruction"><b>①</b><span>${escapeHtml(item.task)}</span></div>
      <button class="primary-button full" type="button" data-action="next-step">我读完了，开始复述 <b>→</b></button>
    </article>`;
  }

  function renderRetellStep(item) {
    const audio = recorder.url ? `<audio class="audio-preview" controls src="${recorder.url}"></audio>` : '';
    $('train-content').innerHTML = `<article class="training-card">
      <div class="training-meta"><span>第 ${item.day} 天 · 脱稿输出</span><span>约 5 分钟</span></div>
      <h2>合上原稿，用自己的话说</h2><p>${escapeHtml(item.tip)}</p>
      <div class="timer-panel"><div class="timer-label">建议连续表达 30—60 秒</div><div class="timer-display" data-timer-display>01:00</div><button class="timer-button" type="button" data-action="toggle-timer">开始计时</button></div>
      <div class="record-row"><button class="record-button" type="button" data-action="toggle-record">● 录音（可选）</button><span class="record-status" id="record-status">录音只保存在当前练习中</span></div>${audio}
      <div class="instruction"><b>②</b><span>先说主题，再按训练结构组织内容。卡住时不要重来，换一种说法继续。</span></div>
      <button class="primary-button full" type="button" data-action="next-step">完成复述，进入复盘 <b>→</b></button>
    </article>`;
    if (recorder.media) { const button = document.querySelector('[data-action="toggle-record"]'); button.classList.add('recording'); button.textContent = '■ 停止录音'; }
  }

  function renderReviewStep(item) {
    const old = state.trainingRecords.find((record) => record.day === item.day);
    const checks = old?.checks || [];
    const rating = old?.rating || 0;
    trainingRating = rating;
    $('train-content').innerHTML = `<article class="training-card">
      <div class="training-meta"><span>第 ${item.day} 天 · 自我复盘</span><span>约 2 分钟</span></div>
      <h2>听一遍，找到一个改进点</h2><p>不用追求完美，只找一个下一次可以改掉的问题。</p>
      <div class="review-list">
        ${['开头说清了主题或结论','至少说出了一个具体细节','没有逐句背诵原稿','结尾有影响、建议或下一步'].map((label, index) => `<label class="review-item"><input type="checkbox" data-review-check="${index}" ${checks.includes(index) ? 'checked' : ''}><span>${label}</span></label>`).join('')}
      </div>
      <div class="rating-label">今天的表达状态</div><div class="rating-row">${[1, 2, 3, 4, 5].map((value) => `<button class="rating-button ${rating === value ? 'selected' : ''}" type="button" data-action="set-rating" data-rating="${value}">${value}</button>`).join('')}</div>
      <div class="instruction"><b>③</b><span>记录一个具体动作，例如“下次开头先说结果”，不要只写“继续努力”。</span></div>
      <label class="field-label" for="training-notes">我的复盘（可选）</label><textarea id="training-notes" class="notes-input" placeholder="今天哪里顺？哪里卡？下一次改什么？">${escapeHtml(old?.notes || '')}</textarea>
      <button class="primary-button full" type="button" data-action="finish-today">完成今日打卡 <b>✓</b></button>
    </article>`;
  }

  function renderCompletion(item) {
    stopTimer();
    $('train-content').innerHTML = `<section class="completion-card"><div class="completion-icon">✓</div><h2>今天完成啦</h2><p>你已经完成第 ${item.day} 天。表达能力不是一次练出来的，是每天把一句话说清楚。</p><div class="button-row"><button class="secondary-button" type="button" data-action="show-records">查看记录</button><button class="primary-button" type="button" data-action="go-home">回到首页</button></div></section>`;
  }

  function chooseTraining(day) {
    trainingIndex = Math.max(0, Math.min(13, day - 1));
    trainingStep = 0;
    trainingRating = 0;
    recorderReset();
    renderTraining();
    showScreen('train');
  }

  function renderFrameworks() {
    $('framework-picker').innerHTML = Object.entries(FRAMEWORKS).map(([key, item]) => `<button class="framework-button ${freeState.framework === key ? 'selected' : ''}" type="button" data-action="select-framework" data-framework="${key}"><strong>${item.mark}</strong>${item.label}<small>${item.hint}</small></button>`).join('');
  }

  function randomTopic() { return TOPICS[Math.floor(Math.random() * TOPICS.length)]; }
  function renderFree() {
    if (!freeState.topic) freeState.topic = randomTopic();
    const item = FRAMEWORKS[freeState.framework];
    renderFrameworks();
    $('free-topic').textContent = freeState.topic.word;
    $('free-prompt').textContent = `${item.hint}。${freeState.topic.prompt}`;
  }

  function renderQuiz() {
    const quiz = QUIZES[quizState.index];
    if (!quiz) {
      $('quiz-content').innerHTML = `<section class="completion-card"><div class="completion-icon">★</div><h2>练习完成</h2><p>本轮得分：${quizState.score} / ${QUIZES.length}<br>记住：先听懂，再追问；先共情，再解决。</p><button class="primary-button full" type="button" data-action="restart-quiz">再练一轮</button></section>`;
      $('quiz-score').textContent = `${quizState.score} 分`;
      return;
    }
    $('quiz-score').textContent = `${quizState.score} 分`;
    $('quiz-content').innerHTML = `<article class="quiz-card"><div class="quiz-progress">第 ${quizState.index + 1} / ${QUIZES.length} 题</div><h2>${escapeHtml(quiz.text)}</h2><div class="quote-card">${escapeHtml(quiz.quote)}</div><div class="quiz-options">${quiz.options.map((option, index) => `<button class="quiz-option" type="button" data-action="answer-quiz" data-answer="${index}">${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</button>`).join('')}</div><div id="answer-feedback"></div></article>`;
  }

  function answerQuiz(answer) {
    const quiz = QUIZES[quizState.index];
    if (quizState.answered) return;
    quizState.answered = true;
    const correct = answer === quiz.answer;
    if (correct) quizState.score += 1;
    document.querySelectorAll('.quiz-option').forEach((button, index) => {
      button.disabled = true;
      if (index === quiz.answer) button.classList.add('correct');
      if (index === answer && !correct) button.classList.add('wrong');
    });
    $('answer-feedback').innerHTML = `<div class="answer-card"><strong>${correct ? '答对了。' : '可以再想一想。'}</strong>${escapeHtml(quiz.explain)}<button class="primary-button full" style="margin-top:12px" type="button" data-action="next-quiz">${quizState.index === QUIZES.length - 1 ? '查看结果' : '下一题'} <b>→</b></button></div>`;
  }

  function renderChallenge() {
    if (!challengeState.topic) challengeState.topic = randomTopic();
    $('challenge-content').innerHTML = `<article class="challenge-card"><div class="challenge-label">RANDOM WORD · ${escapeHtml(challengeState.topic.category)}</div><div class="challenge-word">${escapeHtml(challengeState.topic.word)}</div><p>${escapeHtml(challengeState.topic.prompt)}</p><div class="timer-panel"><div class="timer-label">准备好就开始，不停顿也不要重来</div><div class="timer-display" data-timer-display>01:00</div><button class="timer-button" type="button" data-action="toggle-timer">开始挑战</button></div><div class="challenge-hints"><div class="challenge-hint"><b>开头：</b>它是什么，或我为什么想到它？</div><div class="challenge-hint"><b>中间：</b>一个具体经历、画面或数据。</div><div class="challenge-hint"><b>结尾：</b>我的观点、建议或下一步。</div></div><div class="button-row"><button class="outline-button" type="button" data-action="new-challenge">换一个词</button><button class="primary-button" type="button" data-action="save-challenge">保存挑战</button></div></article>`;
  }

  function renderBoundary() {
    const item = BOUNDARY_CASES[boundaryState.index];
    if (!item) {
      $('boundary-content').innerHTML = `<section class="completion-card"><div class="completion-icon">✓</div><h2>边界判断完成</h2><p>本轮得分：${boundaryState.score} / ${BOUNDARY_CASES.length}<br>分清责任，不等于冷漠；共同承担的事情要一起协商。</p><button class="primary-button full" type="button" data-action="restart-boundary">再练一轮</button></section>`;
      return;
    }
    $('boundary-content').innerHTML = `<article class="boundary-card"><div class="boundary-top"><span class="boundary-tag">CASE ${String(boundaryState.index + 1).padStart(2, '0')}</span><span class="boundary-progress">${boundaryState.index + 1} / ${BOUNDARY_CASES.length}</span></div><div class="boundary-principle">先问自己：谁承担后果？谁拥有决定权？</div><h2>${escapeHtml(item.scene)}</h2><p class="boundary-question">${escapeHtml(item.question)}</p><div class="boundary-choices">${item.choices.map((choice, index) => `<button class="boundary-choice" type="button" data-action="answer-boundary" data-answer="${index}">${String.fromCharCode(65 + index)}　${escapeHtml(choice)}</button>`).join('')}</div><div id="boundary-feedback"></div></article>`;
  }

  function answerBoundary(answer) {
    const item = BOUNDARY_CASES[boundaryState.index];
    if (boundaryState.answered) return;
    boundaryState.answered = true;
    const correct = answer === item.answer;
    if (correct) boundaryState.score += 1;
    document.querySelectorAll('.boundary-choice').forEach((button, index) => {
      button.disabled = true;
      if (index === item.answer) button.classList.add('correct');
      if (index === answer && !correct) button.classList.add('wrong');
    });
    $('boundary-feedback').innerHTML = `<div class="answer-card"><strong>${correct ? '判断准确。' : '再看一层。'}</strong>${escapeHtml(item.explain)}<br><br><b>可以这样说：</b>“${escapeHtml(item.line)}”<button class="primary-button full" style="margin-top:12px" type="button" data-action="next-boundary">${boundaryState.index === BOUNDARY_CASES.length - 1 ? '查看结果' : '下一题'} <b>→</b></button></div>`;
  }

  function renderRecords() {
    const trainingCount = state.trainingRecords.length;
    const freeCount = state.freeRecords.length;
    const scores = state.trainingRecords.map((item) => item.rating).filter(Boolean);
    const average = scores.length ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1) : '—';
    const entries = [...state.trainingRecords.map((record) => ({ type: '每日', icon: '☀', title: `第 ${record.day} 天 · ${TRAININGS[record.day - 1]?.title || '训练'}`, date: record.date, extra: record.rating ? `${record.rating}/5 分` : '已完成' })), ...state.freeRecords.map((record) => ({ type: '自由', icon: '✎', title: record.topic, date: record.date, extra: record.framework }))].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);
    $('records-content').innerHTML = `<div class="stats-grid"><div class="stat-card"><strong>${state.completedDates.length}</strong><span>打卡天数</span></div><div class="stat-card"><strong>${trainingCount + freeCount}</strong><span>练习次数</span></div><div class="stat-card"><strong>${average}</strong><span>平均自评</span></div></div><div class="records-block"><div class="records-heading"><h2>最近练习</h2><span class="muted-text">本机保存</span></div>${entries.length ? `<div class="record-list">${entries.map((entry) => `<div class="record-entry"><span class="record-entry-icon">${entry.icon}</span><span class="record-entry-copy"><strong>${escapeHtml(entry.title)}</strong><small>${formatDate(entry.date)} · ${escapeHtml(entry.extra)}</small></span></div>`).join('')}</div>` : '<div class="empty-state">还没有练习记录。<br>从今天的 10 分钟训练开始吧。</div>'}</div><div class="data-actions"><button class="outline-button" type="button" data-action="export-data">导出我的记录</button><button class="danger-button" type="button" data-action="clear-data">清空记录</button></div>`;
  }

  function startTimer(context) {
    clearInterval(timerId);
    timerContext = context;
    timerSeconds = 60;
    updateTimer();
    timerId = setInterval(() => {
      timerSeconds -= 1;
      updateTimer();
      if (timerSeconds <= 0) {
        stopTimer();
        showToast('60 秒到了，进入复盘吧');
      }
    }, 1000);
    document.querySelectorAll('[data-action="toggle-timer"]').forEach((button) => { button.textContent = '暂停计时'; });
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    document.querySelectorAll('[data-action="toggle-timer"]').forEach((button) => { button.textContent = timerContext === 'challenge' ? '开始挑战' : '开始计时'; });
  }
  function updateTimer() {
    const value = `0${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, '0')}`;
    document.querySelectorAll('[data-timer-display]').forEach((node) => { node.textContent = value; });
  }

  async function toggleRecorder() {
    if (recorder.media) {
      recorder.media.recorder.stop();
      recorder.media.stream.getTracks().forEach((track) => track.stop());
      recorder.media = null;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showToast('当前打开方式不支持录音，文字练习仍可正常使用');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      recorder.chunks = [];
      recorder.media = { recorder: media, stream };
      media.ondataavailable = (event) => { if (event.data.size) recorder.chunks.push(event.data); };
      media.onstop = () => {
        recorder.blob = new Blob(recorder.chunks, { type: media.mimeType || 'audio/webm' });
        if (recorder.url) URL.revokeObjectURL(recorder.url);
        recorder.url = URL.createObjectURL(recorder.blob);
        renderTraining();
        showToast('录音完成，可以回听');
      };
      media.start();
      renderTraining();
      showToast('正在录音，说完后点停止');
    } catch (error) {
      showToast('没有获得麦克风权限，仍可使用文字练习');
    }
  }
  function recorderReset() {
    if (recorder.media) { recorder.media.recorder.stop(); recorder.media.stream.getTracks().forEach((track) => track.stop()); }
    if (recorder.url) URL.revokeObjectURL(recorder.url);
    recorder = { media: null, chunks: [], blob: null, url: null };
  }

  function finishTraining() {
    const item = currentTraining();
    const checks = [...document.querySelectorAll('[data-review-check]')].filter((input) => input.checked).map((input) => Number(input.dataset.reviewCheck));
    const notes = $('training-notes')?.value.trim() || '';
    const record = { day: item.day, date: todayKey(), rating: trainingRating || 0, checks, notes, hasAudio: Boolean(recorder.blob) };
    const existingIndex = state.trainingRecords.findIndex((entry) => entry.day === item.day);
    if (existingIndex >= 0) state.trainingRecords[existingIndex] = record; else state.trainingRecords.push(record);
    if (!hasCompletedToday()) state.completedDates.push(todayKey());
    if (item.day >= state.currentDay) state.currentDay = Math.min(15, item.day + 1);
    saveState();
    renderHome(); renderPlan(); renderRecords();
    renderCompletion(item);
    showToast('今日打卡已保存到本机');
  }

  function saveFree() {
    const notes = $('free-notes').value.trim();
    state.freeRecords.push({ date: todayKey(), framework: FRAMEWORKS[freeState.framework].label, topic: freeState.topic.word, notes });
    saveState(); renderRecords(); showToast('自由练习已保存');
  }

  function saveChallenge() {
    state.freeRecords.push({ date: todayKey(), framework: '60 秒挑战', topic: challengeState.topic.word, notes: '完成一次随机词即兴挑战' });
    saveState(); challengeState.saved = true; renderRecords(); showToast('挑战记录已保存');
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), app: '说清楚 · 离线练习', data: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `说清楚-练习记录-${todayKey()}.json`; link.click(); URL.revokeObjectURL(url); showToast('记录文件已导出');
  }

  function showHelp() {
    $('modal-body').innerHTML = '<p>这是一个手机优先的离线练习小软件。核心流程是：阅读一小段内容，合上原稿复述，再回听并完成复盘。</p><ul><li>每天点“今日打卡”，按阅读、复述、复盘三步完成。</li><li>“自由练习”可以换结构和关键词；“问答练习”训练先共情、再具体追问。</li><li>记录保存在当前设备的浏览器里，不需要账号和网络。</li><li>录音需要浏览器允许麦克风；即使不能录音，文字和计时练习仍然可用。</li><li>更换手机或浏览器前，可以在“我的记录”导出备份。</li></ul><p>建议先连续练 14 天，每次只改一个问题。</p>';
    $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'go-home') { stopTimer(); renderHome(); showScreen('home'); }
    else if (action === 'start-today') { chooseTraining(currentDayNumber()); }
    else if (action === 'show-plan') { renderPlan(); showScreen('plan'); }
    else if (action === 'show-free') { stopTimer(); renderFree(); showScreen('free'); }
    else if (action === 'show-quiz') { quizState = { index: 0, score: 0, answered: false }; renderQuiz(); showScreen('quiz'); }
    else if (action === 'show-challenge') { stopTimer(); challengeState = { topic: randomTopic(), saved: false }; renderChallenge(); showScreen('challenge'); }
    else if (action === 'show-boundary') { stopTimer(); boundaryState = { index: 0, score: 0, answered: false }; renderBoundary(); showScreen('boundary'); }
    else if (action === 'show-records') { stopTimer(); renderRecords(); showScreen('records'); }
    else if (action === 'show-help') showHelp();
    else if (action === 'close-modal') closeModal();
    else if (action === 'next-step') { trainingStep = Math.min(2, trainingStep + 1); renderTraining(); }
    else if (action === 'set-rating') { trainingRating = Number(target.dataset.rating); document.querySelectorAll('.rating-button').forEach((button) => button.classList.toggle('selected', button === target)); }
    else if (action === 'finish-today') finishTraining();
    else if (action === 'toggle-timer') { if (timerId) stopTimer(); else startTimer(activeScreen === 'challenge' ? 'challenge' : activeScreen); }
    else if (action === 'toggle-record') toggleRecorder();
    else if (action === 'select-framework') { freeState.framework = target.dataset.framework; renderFree(); }
    else if (action === 'random-topic') { freeState.topic = randomTopic(); renderFree(); }
    else if (action === 'save-free') saveFree();
    else if (action === 'answer-quiz') answerQuiz(Number(target.dataset.answer));
    else if (action === 'next-quiz') { quizState.index += 1; quizState.answered = false; renderQuiz(); }
    else if (action === 'restart-quiz') { quizState = { index: 0, score: 0, answered: false }; renderQuiz(); }
    else if (action === 'answer-boundary') answerBoundary(Number(target.dataset.answer));
    else if (action === 'next-boundary') { boundaryState.index += 1; boundaryState.answered = false; renderBoundary(); }
    else if (action === 'restart-boundary') { boundaryState = { index: 0, score: 0, answered: false }; renderBoundary(); }
    else if (action === 'new-challenge') { challengeState = { topic: randomTopic(), saved: false }; stopTimer(); renderChallenge(); }
    else if (action === 'save-challenge') saveChallenge();
    else if (action === 'open-plan-day') chooseTraining(Number(target.dataset.day));
    else if (action === 'export-data') exportData();
    else if (action === 'clear-data') { if (window.confirm('确定清空本机上的练习记录吗？')) { localStorage.removeItem(STORAGE_KEY); Object.assign(state, defaultState()); renderHome(); renderPlan(); renderRecords(); showToast('记录已清空'); } }
  });

  window.addEventListener('beforeunload', () => { if (recorder.media) recorder.media.recorder.stop(); if (recorder.url) URL.revokeObjectURL(recorder.url); });

  renderHome(); renderPlan(); renderRecords();
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();

