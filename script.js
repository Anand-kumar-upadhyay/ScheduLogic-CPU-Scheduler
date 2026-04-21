// ============================================================
//  ScheduLogic — CPU Scheduling Simulator
//  Algorithms: FCFS, SJF, SRTF, Round Robin, Priority (NP & P)
//  Features: Step Simulation, Algorithm Comparison, Best Suggestion
// ============================================================

const colorPalette = [
  '#FF3366', '#20A4F3', '#2EC4B6', '#FF9F1C',
  '#9D4EDD', '#06D6A0', '#F72585', '#4CC9F0',
  '#F4A261', '#E76F51', '#48CAE4', '#90BE6D'
];

let processCount = 0;
let pidColorMap   = {};

// Step-simulation state
let ganttStepsData = [];
let currentStep    = -1;
let isPlaying      = false;
let playTimer      = null;

// ============================================================
//  INITIALIZATION
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  onAlgorithmChange();
  for (let i = 0; i < 3; i++) addProcessRow();
});

// ============================================================
//  UI TOGGLE
// ============================================================
function onAlgorithmChange() {
  const algo       = document.getElementById('algoSelect').value;
  const isPriority = algo === 'priority_np' || algo === 'priority_p';
  const isRR       = algo === 'rr';

  document.getElementById('quantumGroup').classList.toggle('hidden', !isRR);
  document.getElementById('priorityHeader').classList.toggle('hidden', !isPriority);
  document.querySelectorAll('.priority-cell').forEach(c => c.classList.toggle('hidden', !isPriority));

  const labels = {
    fcfs:        'First Come First Serve (FCFS)',
    sjf:         'Shortest Job First — Non-Preemptive',
    srtf:        'Shortest Remaining Time First — Preemptive',
    rr:          'Round Robin Scheduling',
    priority_np: 'Priority Scheduling — Non-Preemptive',
    priority_p:  'Priority Scheduling — Preemptive'
  };
  const subs = {
    fcfs:        'Processes execute in order of arrival.',
    sjf:         'Shortest burst time runs next among arrived processes.',
    srtf:        'Preempts current process if a shorter job arrives.',
    rr:          'Each process gets a fixed time quantum in rotation.',
    priority_np: 'Highest priority (lowest number) runs to completion.',
    priority_p:  'Preempts if a higher-priority process arrives.'
  };

  document.getElementById('simTitle').textContent    = labels[algo] || '';
  document.getElementById('simSubtitle').textContent = subs[algo]   || '';
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('comparisonSection').classList.add('hidden');
}

// ============================================================
//  ROW MANAGEMENT
// ============================================================
function addProcessRow() {
  processCount++;
  const pid   = 'P' + processCount;
  const color = colorPalette[(processCount - 1) % colorPalette.length];
  pidColorMap[pid] = color;

  const algo       = document.getElementById('algoSelect').value;
  const isPriority = algo === 'priority_np' || algo === 'priority_p';
  const defaultBt  = Math.floor(Math.random() * 6) + 2;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="text" class="pid-input" value="${pid}"
        style="border-left: 3px solid ${color}; padding-left: 10px;">
    </td>
    <td><input type="number" class="at-input" min="0" value="0"></td>
    <td><input type="number" class="bt-input" min="1" value="${defaultBt}"></td>
    <td class="priority-cell${isPriority ? '' : ' hidden'}">
      <input type="number" class="pr-input" min="1" value="${processCount}">
    </td>
    <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
  `;
  document.getElementById('processBody').appendChild(tr);
}

function removeRow(btn) {
  if (document.getElementById('processBody').children.length > 1) {
    btn.closest('tr').remove();
  } else {
    alert('You must have at least one process.');
  }
}

function resetAll() {
  document.getElementById('processBody').innerHTML = '';
  processCount = 0; pidColorMap = {};
  for (let i = 0; i < 3; i++) addProcessRow();
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('comparisonSection').classList.add('hidden');
}

// ============================================================
//  SHARED: Parse process rows
// ============================================================
function parseProcesses() {
  const algo       = document.getElementById('algoSelect').value;
  const isPriority = algo === 'priority_np' || algo === 'priority_p';
  const rows       = document.getElementById('processBody').children;
  const processes  = [];

  for (let i = 0; i < rows.length; i++) {
    const pid = rows[i].querySelector('.pid-input').value.trim();
    const at  = parseInt(rows[i].querySelector('.at-input').value);
    const bt  = parseInt(rows[i].querySelector('.bt-input').value);
    const prEl = rows[i].querySelector('.pr-input');
    const pr  = prEl ? (parseInt(prEl.value) || i + 1) : i + 1;

    if (!pid)              { alert(`Row ${i + 1}: Process ID cannot be empty.`);   return null; }
    if (isNaN(at) || at < 0) { alert(`Row ${i + 1}: Arrival Time must be ≥ 0.`); return null; }
    if (isNaN(bt) || bt <= 0){ alert(`Row ${i + 1}: Burst Time must be > 0.`);    return null; }
    if (isPriority && (isNaN(pr) || pr < 1)) {
      alert(`Row ${i + 1}: Priority must be ≥ 1.`); return null;
    }

    const color = pidColorMap[pid] || colorPalette[i % colorPalette.length];
    pidColorMap[pid] = color;
    processes.push({ id: pid, at, bt, pr, color });
  }
  return processes;
}

// ============================================================
//  MAIN DISPATCHER
// ============================================================
function runSimulation() {
  const algo      = document.getElementById('algoSelect').value;
  const processes = parseProcesses();
  if (!processes) return;

  let result;
  switch (algo) {
    case 'fcfs':        result = fcfs(processes);        break;
    case 'sjf':         result = sjf(processes);         break;
    case 'srtf':        result = srtf(processes);        break;
    case 'rr': {
      const q = parseInt(document.getElementById('quantumInput').value);
      if (isNaN(q) || q <= 0) { alert('Time Quantum must be a positive integer.'); return; }
      result = roundRobin(processes, q);
      break;
    }
    case 'priority_np': result = priorityNP(processes);  break;
    case 'priority_p':  result = priorityP(processes);   break;
    default: return;
  }

  displayResults(processes, result.ganttBlocks, result.completionMap);
  initStepSimulation(result.ganttBlocks);
}

// ============================================================
//  ALGORITHM 1: FCFS
// ============================================================
function fcfs(processes) {
  const procs = [...processes].sort((a, b) => a.at - b.at);
  let time = 0;
  const ganttBlocks = [], completionMap = {};

  for (const p of procs) {
    if (time < p.at) {
      ganttBlocks.push({ id: 'Idle', start: time, end: p.at, color: 'idle' });
      time = p.at;
    }
    ganttBlocks.push({ id: p.id, start: time, end: time + p.bt, color: p.color });
    completionMap[p.id] = time + p.bt;
    time += p.bt;
  }
  return { ganttBlocks, completionMap };
}

// ============================================================
//  ALGORITHM 2: SJF (Non-Preemptive)
// ============================================================
function sjf(processes) {
  const procs = processes.map(p => ({ ...p }));
  const done  = new Set();
  let time    = 0;
  const ganttBlocks = [], completionMap = {};

  while (done.size < procs.length) {
    const ready = procs.filter(p => p.at <= time && !done.has(p.id));
    if (ready.length === 0) {
      const nextAt = Math.min(...procs.filter(p => !done.has(p.id)).map(p => p.at));
      ganttBlocks.push({ id: 'Idle', start: time, end: nextAt, color: 'idle' });
      time = nextAt; continue;
    }
    ready.sort((a, b) => a.bt - b.bt || a.at - b.at);
    const p = ready[0];
    ganttBlocks.push({ id: p.id, start: time, end: time + p.bt, color: p.color });
    completionMap[p.id] = time + p.bt;
    time += p.bt;
    done.add(p.id);
  }
  return { ganttBlocks, completionMap };
}

// ============================================================
//  ALGORITHM 3: SRTF (Preemptive SJF) — event-driven
// ============================================================
function srtf(processes) {
  const procs = processes.map(p => ({ ...p, remaining: p.bt }));
  const completionMap = {};
  const ganttBlocks   = [];
  let time = 0, done = 0, currentProc = null, sliceStart = 0;
  const n  = procs.length;

  while (done < n) {
    const ready = procs.filter(p => p.at <= time && p.remaining > 0);
    if (ready.length === 0) {
      const nextAt = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.at));
      if (currentProc) { ganttBlocks.push({ id: currentProc.id, start: sliceStart, end: time, color: currentProc.color }); currentProc = null; }
      ganttBlocks.push({ id: 'Idle', start: time, end: nextAt, color: 'idle' });
      time = nextAt; sliceStart = nextAt; continue;
    }
    ready.sort((a, b) => a.remaining - b.remaining || a.at - b.at);
    const next = ready[0];
    if (!currentProc)                    { sliceStart = time; }
    else if (currentProc.id !== next.id) { ganttBlocks.push({ id: currentProc.id, start: sliceStart, end: time, color: currentProc.color }); sliceStart = time; }
    currentProc = next;

    const futureArr = procs.filter(p => p.at > time && p.remaining > 0).map(p => p.at);
    const nextEvent = futureArr.length ? Math.min(...futureArr) : Infinity;
    const runUntil  = Math.min(time + next.remaining, nextEvent);
    next.remaining -= (runUntil - time);
    time = runUntil;

    if (next.remaining === 0) {
      ganttBlocks.push({ id: next.id, start: sliceStart, end: time, color: next.color });
      completionMap[next.id] = time;
      currentProc = null; sliceStart = time; done++;
    }
  }
  return { ganttBlocks: mergeBlocks(ganttBlocks), completionMap };
}

// ============================================================
//  ALGORITHM 4: Round Robin
// ============================================================
function roundRobin(processes, quantum) {
  const procs = [...processes].map(p => ({ ...p, remaining: p.bt })).sort((a, b) => a.at - b.at);
  const completionMap = {}, ganttBlocks = [];
  const queue = []; const inQueue = new Set();
  let time = 0, i = 0;

  while (i < procs.length && procs[i].at <= time) { queue.push(procs[i]); inQueue.add(procs[i].id); i++; }

  while (queue.length > 0 || i < procs.length) {
    if (queue.length === 0) {
      const nextAt = procs[i].at;
      ganttBlocks.push({ id: 'Idle', start: time, end: nextAt, color: 'idle' });
      time = nextAt;
      while (i < procs.length && procs[i].at <= time) { queue.push(procs[i]); inQueue.add(procs[i].id); i++; }
      continue;
    }
    const p       = queue.shift(); inQueue.delete(p.id);
    const runTime = Math.min(p.remaining, quantum);
    ganttBlocks.push({ id: p.id, start: time, end: time + runTime, color: p.color });
    time += runTime; p.remaining -= runTime;
    while (i < procs.length && procs[i].at <= time) {
      if (!inQueue.has(procs[i].id)) { queue.push(procs[i]); inQueue.add(procs[i].id); } i++;
    }
    if (p.remaining > 0) { queue.push(p); inQueue.add(p.id); }
    else { completionMap[p.id] = time; }
  }
  return { ganttBlocks, completionMap };
}

// ============================================================
//  ALGORITHM 5: Priority — Non-Preemptive
// ============================================================
function priorityNP(processes) {
  const procs = processes.map(p => ({ ...p }));
  const done  = new Set();
  let time    = 0;
  const ganttBlocks = [], completionMap = {};

  while (done.size < procs.length) {
    const ready = procs.filter(p => p.at <= time && !done.has(p.id));
    if (ready.length === 0) {
      const nextAt = Math.min(...procs.filter(p => !done.has(p.id)).map(p => p.at));
      ganttBlocks.push({ id: 'Idle', start: time, end: nextAt, color: 'idle' });
      time = nextAt; continue;
    }
    ready.sort((a, b) => a.pr - b.pr || a.at - b.at);
    const p = ready[0];
    ganttBlocks.push({ id: p.id, start: time, end: time + p.bt, color: p.color });
    completionMap[p.id] = time + p.bt;
    time += p.bt; done.add(p.id);
  }
  return { ganttBlocks, completionMap };
}

// ============================================================
//  ALGORITHM 6: Priority — Preemptive
// ============================================================
function priorityP(processes) {
  const procs = processes.map(p => ({ ...p, remaining: p.bt }));
  const completionMap = {}, ganttBlocks = [];
  let time = 0, done = 0, currentProc = null, sliceStart = 0;
  const n  = procs.length;

  while (done < n) {
    const ready = procs.filter(p => p.at <= time && p.remaining > 0);
    if (ready.length === 0) {
      const nextAt = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.at));
      if (currentProc) { ganttBlocks.push({ id: currentProc.id, start: sliceStart, end: time, color: currentProc.color }); currentProc = null; }
      ganttBlocks.push({ id: 'Idle', start: time, end: nextAt, color: 'idle' });
      time = nextAt; sliceStart = nextAt; continue;
    }
    ready.sort((a, b) => a.pr - b.pr || a.at - b.at);
    const next = ready[0];
    if (!currentProc)                    { sliceStart = time; }
    else if (currentProc.id !== next.id) { ganttBlocks.push({ id: currentProc.id, start: sliceStart, end: time, color: currentProc.color }); sliceStart = time; }
    currentProc = next;

    const futureArr = procs.filter(p => p.at > time && p.remaining > 0).map(p => p.at);
    const nextEvent = futureArr.length ? Math.min(...futureArr) : Infinity;
    const runUntil  = Math.min(time + next.remaining, nextEvent);
    next.remaining -= (runUntil - time);
    time = runUntil;

    if (next.remaining === 0) {
      ganttBlocks.push({ id: next.id, start: sliceStart, end: time, color: next.color });
      completionMap[next.id] = time;
      currentProc = null; sliceStart = time; done++;
    }
  }
  return { ganttBlocks: mergeBlocks(ganttBlocks), completionMap };
}

// ============================================================
//  HELPER: Merge consecutive same-ID blocks
// ============================================================
function mergeBlocks(blocks) {
  if (!blocks.length) return blocks;
  const merged = [{ ...blocks[0] }];
  for (let i = 1; i < blocks.length; i++) {
    const last = merged[merged.length - 1];
    if (last.id === blocks[i].id && last.end === blocks[i].start) last.end = blocks[i].end;
    else merged.push({ ...blocks[i] });
  }
  return merged;
}

// ============================================================
//  DISPLAY RESULTS
// ============================================================
function displayResults(processes, ganttBlocks, completionMap) {
  let totalWT = 0, totalTAT = 0, html = '';

  for (const p of processes) {
    const ct  = completionMap[p.id];
    const tat = ct - p.at;
    const wt  = tat - p.bt;
    totalWT  += wt; totalTAT += tat;
    html += `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.id}</td>
        <td>${p.at}</td><td>${p.bt}</td><td>${ct}</td><td>${tat}</td><td>${wt}</td>
      </tr>`;
  }

  const n         = processes.length;
  const totalTime = Math.max(...ganttBlocks.map(b => b.end));
  const burstSum  = processes.reduce((s, p) => s + p.bt, 0);
  const util      = ((burstSum / totalTime) * 100).toFixed(1);

  document.getElementById('avgWt').textContent     = (totalWT  / n).toFixed(2) + ' ms';
  document.getElementById('avgTat').textContent    = (totalTAT / n).toFixed(2) + ' ms';
  document.getElementById('cpuUtil').textContent   = util + '%';
  document.getElementById('totalTime').textContent = totalTime + ' ms';
  document.getElementById('resultBody').innerHTML  = html;

  // Render full Gantt first (no step filtering)
  renderGanttChart(ganttBlocks, totalTime, null);

  const sec = document.getElementById('resultsSection');
  sec.classList.remove('hidden');
  setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

// ============================================================
//  RENDER GANTT CHART (supports step-reveal via maxStep)
// ============================================================
function renderGanttChart(blocks, totalTime, maxStep) {
  const chart    = document.getElementById('ganttChart');
  const timeline = document.getElementById('timeline');
  chart.innerHTML = ''; timeline.innerHTML = '';
  if (!totalTime) return;

  const displayBlocks = (maxStep != null) ? blocks.slice(0, maxStep + 1) : blocks;
  const placedPcts    = [];

  displayBlocks.forEach((block, idx) => {
    const isCurrent = (maxStep != null) && (idx === maxStep);
    const duration  = block.end - block.start;
    const pct       = (duration / totalTime) * 100;

    const div = document.createElement('div');
    div.className = 'gantt-block';
    div.style.width    = `${pct}%`;
    div.style.minWidth = '32px';
    div.title = `${block.id} | t=${block.start} → t=${block.end} (${duration} ms)`;

    if (block.color === 'idle') {
      div.classList.add('gantt-idle');
      div.textContent = pct > 4 ? 'Idle' : '';
    } else {
      div.style.background = `linear-gradient(160deg, ${block.color}ee, ${block.color}88)`;
      div.textContent = block.id;
    }

    if (isCurrent) div.classList.add('gantt-active-step');
    chart.appendChild(div);

    // Time ticks
    const vals = idx === 0 ? [block.start, block.end] : [block.end];
    vals.forEach(val => {
      const leftPct = (val / totalTime) * 100;
      if (placedPcts.some(p => Math.abs(p - leftPct) < 4)) return;
      placedPcts.push(leftPct);
      const tick = document.createElement('div');
      tick.className = 'time-tick';
      if (leftPct >= 98) { tick.style.right = '0'; }
      else               { tick.style.left  = `${leftPct}%`; }
      tick.innerHTML = `<span>${val}</span>`;
      timeline.appendChild(tick);
    });
  });
}

// ============================================================
//  STEP SIMULATION
// ============================================================
function initStepSimulation(blocks) {
  ganttStepsData = blocks;
  currentStep    = blocks.length - 1; // start fully visible
  isPlaying      = false;
  clearTimeout(playTimer);

  document.getElementById('stepControls').classList.remove('hidden');
  document.getElementById('playBtn').textContent = '▶ Play';
  updateStepUI();
}

function playSimulation() {
  if (isPlaying) { pauseSimulation(); return; }
  if (currentStep >= ganttStepsData.length - 1) {
    currentStep = -1; // restart from beginning
  }
  isPlaying = true;
  document.getElementById('playBtn').textContent = '⏸ Pause';
  const totalTime = Math.max(...ganttStepsData.map(b => b.end));

  const tick = () => {
    if (currentStep >= ganttStepsData.length - 1) { pauseSimulation(); return; }
    currentStep++;
    renderGanttChart(ganttStepsData, totalTime, currentStep);
    updateStepUI();
    playTimer = setTimeout(tick, getStepDelay());
  };
  tick();
}

function pauseSimulation() {
  isPlaying = false;
  clearTimeout(playTimer);
  document.getElementById('playBtn').textContent = '▶ Play';
}

function stepBack() {
  pauseSimulation();
  if (currentStep > 0) {
    currentStep--;
    const totalTime = Math.max(...ganttStepsData.map(b => b.end));
    renderGanttChart(ganttStepsData, totalTime, currentStep);
    updateStepUI();
  }
}

function stepForward() {
  pauseSimulation();
  if (currentStep < ganttStepsData.length - 1) {
    currentStep++;
    const totalTime = Math.max(...ganttStepsData.map(b => b.end));
    renderGanttChart(ganttStepsData, totalTime, currentStep);
    updateStepUI();
  }
}

function rewindSimulation() {
  pauseSimulation();
  currentStep = 0;
  const totalTime = Math.max(...ganttStepsData.map(b => b.end));
  renderGanttChart(ganttStepsData, totalTime, currentStep);
  updateStepUI();
}

function onStepScrub() {
  pauseSimulation();
  currentStep = parseInt(document.getElementById('stepProgress').value) - 1;
  const totalTime = Math.max(...ganttStepsData.map(b => b.end));
  renderGanttChart(ganttStepsData, totalTime, currentStep);
  updateStepUI();
}

function getStepDelay() {
  const speed = parseInt(document.getElementById('stepSpeed').value);
  // speed 1=slow(1200ms) … 5=fast(100ms)
  return Math.max(100, 1400 - speed * 260);
}

function updateStepUI() {
  const block   = ganttStepsData[currentStep];
  const total   = ganttStepsData.length;
  const stepNum = currentStep + 1;

  document.getElementById('stepInfo').textContent =
    block
      ? `Step ${stepNum} / ${total} — ${block.id === 'Idle' ? 'CPU Idle' : `Executing ${block.id}`}  (t = ${block.start} → ${block.end})`
      : 'Ready';

  const prog = document.getElementById('stepProgress');
  prog.max   = total;
  prog.value = stepNum;

  document.getElementById('stepBack').disabled = currentStep <= 0;
  document.getElementById('stepFwd').disabled  = currentStep >= total - 1;
}

// ============================================================
//  COMPARE ALL ALGORITHMS
// ============================================================
function compareAllAlgorithms() {
  const processes = parseProcesses();
  if (!processes || processes.length === 0) { alert('Add at least one valid process.'); return; }

  const quantum = parseInt(document.getElementById('quantumInput').value) || 2;

  const algoDefs = [
    { key: 'fcfs',        label: 'FCFS',                     fn: () => fcfs(processes)          },
    { key: 'sjf',         label: 'SJF (Non-Preemptive)',     fn: () => sjf(processes)           },
    { key: 'srtf',        label: 'SRTF (Preemptive)',        fn: () => srtf(processes)          },
    { key: 'rr',          label: `Round Robin (q=${quantum})`, fn: () => roundRobin(processes, quantum) },
    { key: 'priority_np', label: 'Priority (Non-Preemptive)', fn: () => priorityNP(processes)   },
    { key: 'priority_p',  label: 'Priority (Preemptive)',    fn: () => priorityP(processes)     },
  ];

  const results = algoDefs.map(algo => {
    const { ganttBlocks, completionMap } = algo.fn();
    let totalWT = 0, totalTAT = 0;
    for (const p of processes) {
      const ct = completionMap[p.id];
      totalWT  += (ct - p.at) - p.bt;
      totalTAT += (ct - p.at);
    }
    const n         = processes.length;
    const totalTime = Math.max(...ganttBlocks.map(b => b.end));
    const burstSum  = processes.reduce((s, p) => s + p.bt, 0);
    return {
      key: algo.key, label: algo.label,
      avgWT:  totalWT  / n,
      avgTAT: totalTAT / n,
      util:   (burstSum / totalTime) * 100,
      totalTime
    };
  });

  renderComparisonTable(results);
  renderBestAlgorithmSuggestion(results);

  const sec = document.getElementById('comparisonSection');
  sec.classList.remove('hidden');
  setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function renderComparisonTable(results) {
  const minWT  = Math.min(...results.map(r => r.avgWT));
  const minTAT = Math.min(...results.map(r => r.avgTAT));
  const maxUtil = Math.max(...results.map(r => r.util));
  const minTime = Math.min(...results.map(r => r.totalTime));

  const html = results.map(r => `
    <tr>
      <td class="algo-label-cell">${r.label}</td>
      <td class="${r.avgWT   === minWT   ? 'best-cell' : ''}">${r.avgWT.toFixed(2)} ms${r.avgWT   === minWT   ? ' 🏆' : ''}</td>
      <td class="${r.avgTAT  === minTAT  ? 'best-cell' : ''}">${r.avgTAT.toFixed(2)} ms${r.avgTAT  === minTAT  ? ' 🏆' : ''}</td>
      <td class="${r.util    === maxUtil ? 'best-cell' : ''}">${r.util.toFixed(1)}%${r.util    === maxUtil ? ' 🏆' : ''}</td>
      <td class="${r.totalTime === minTime ? 'best-cell' : ''}">${r.totalTime} ms${r.totalTime === minTime ? ' 🏆' : ''}</td>
    </tr>`).join('');

  document.getElementById('comparisonTableBody').innerHTML = html;
}

function renderBestAlgorithmSuggestion(results) {
  // Rank each algorithm per metric; accumulate rank scores (lower = better)
  const scored = results.map(r => ({ ...r, score: 0 }));
  const metrics = [
    { key: 'avgWT',     higherBetter: false },
    { key: 'avgTAT',    higherBetter: false },
    { key: 'util',      higherBetter: true  },
    { key: 'totalTime', higherBetter: false },
  ];

  for (const { key, higherBetter } of metrics) {
    const sorted = [...scored].sort((a, b) =>
      higherBetter ? b[key] - a[key] : a[key] - b[key]);
    sorted.forEach((r, rank) => { scored.find(s => s.key === r.key).score += rank; });
  }

  scored.sort((a, b) => a.score - b.score);
  const best   = scored[0];
  const second = scored[1];

  const minWT   = Math.min(...results.map(r => r.avgWT));
  const minTAT  = Math.min(...results.map(r => r.avgTAT));
  const maxUtil = Math.max(...results.map(r => r.util));

  const wins = [];
  if (best.avgWT   === minWT)   wins.push('lowest average waiting time');
  if (best.avgTAT  === minTAT)  wins.push('lowest average turnaround time');
  if (best.util    === maxUtil) wins.push('highest CPU utilization');

  const reason = wins.length
    ? `It achieves the <strong>${wins.join('</strong> and <strong>')}</strong> among all algorithms.`
    : `It provides the <strong>best overall balance</strong> of waiting time, turnaround time, and CPU utilization.`;

  const tradeoff = second
    ? `Runner-up: <em>${second.label}</em> (Avg WT: ${second.avgWT.toFixed(2)} ms, Avg TAT: ${second.avgTAT.toFixed(2)} ms).`
    : '';

  document.getElementById('bestAlgoName').textContent    = best.label;
  document.getElementById('bestAlgoReason').innerHTML    = reason;
  document.getElementById('bestAlgoTradeoff').textContent = tradeoff;
  document.getElementById('bestAlgoStats').textContent   =
    `Avg WT: ${best.avgWT.toFixed(2)} ms  |  Avg TAT: ${best.avgTAT.toFixed(2)} ms  |  CPU: ${best.util.toFixed(1)}%`;
}
