// genStimList.js
// Generate learn and test list from stimuli CSV

async function genStimLists(csvPath, stimuliFolder) {
  const stimTable = await loadCSV(csvPath); // see helper below

  // Group by ID
  const idMap = new Map();
  stimTable.forEach(row => {
    console.log(row);
    const id = row.ID;
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(row);
  });

  // Split IDs into 4 categories: M_B, M_W, F_B, F_W
  const IDcat = { M_B: [], M_W: [], F_B: [], F_W: [] };
  for (let [id, rows] of idMap.entries()) {
    const g = rows[0].gender;
    const r = rows[0].race;
    const key = `${g}_${r}`;

    if (!(key in IDcat)) {
    console.warn("Unexpected key:", key, "ID:", id);
    continue; 
    }
    IDcat[key].push(id);
  }

  // Sample 12 per category → 3 blocks × 4
  const blockIDs = [[], [], []];
  for (let cat of ["M_B", "M_W", "F_B", "F_W"]) {
    const pool = jsPsych.randomization.shuffle(IDcat[cat]);
    for (let blk = 0; blk < 3; blk++) {
      blockIDs[blk] = blockIDs[blk].concat(pool.slice(blk * 4, blk * 4 + 4));
    }
  }

  // Build learnList
  const learnList = [];
  for (let blk = 0; blk < 3; blk++) {
    const ids = blockIDs[blk];
    for (let id of ids) {
      const pair = idMap.get(id);
      const chosen = jsPsych.randomization.sampleWithoutReplacement(pair, 1)[0];
      learnList.push({
        ...chosen,
        fullpath: `${stimuliFolder}/${chosen.filename}`,
        block: blk + 1
      });
    }
  }

  // Build remaining IDs for test-new
  const usedLearnIDs = new Set(learnList.map(d => d.ID));
  const remainingIDs = [...idMap.keys()].filter(id => !usedLearnIDs.has(id));

  const newIDcat = { M_B: [], M_W: [], F_B: [], F_W: [] };
  for (let id of remainingIDs) {
    const rows = idMap.get(id);
    const g = rows[0].gender;
    const r = rows[0].race;
    const key = `${g}_${r}`;
    newIDcat[key].push(id);
  }

  const blockNewIDs = [[], [], []];
  for (let cat of ["M_B", "M_W", "F_B", "F_W"]) {
    const pool = jsPsych.randomization.shuffle(newIDcat[cat]);
    for (let blk = 0; blk < 3; blk++) {
      blockNewIDs[blk] = blockNewIDs[blk].concat(pool.slice(blk * 4, blk * 4 + 4));
    }
  }

  // Build testList
  const testList = [];
  for (let blk = 0; blk < 3; blk++) {
    const learnSub = learnList.filter(row => row.block === blk + 1);

    const male = learnSub.filter(r => r.gender === "M");
    const female = learnSub.filter(r => r.gender === "F");

    const same_M = jsPsych.randomization.sampleWithoutReplacement(male, 4);
    const same_F = jsPsych.randomization.sampleWithoutReplacement(female, 4);
    const sameSet = same_M.concat(same_F);

    // old-old (same image)
    sameSet.forEach(row => {
      testList.push({ ...row, condition: "old-old", block: blk + 1 });
    });

    // old-new (different image from same ID)
    const usedSameIDs = new Set(sameSet.map(r => r.ID));
    const remainSet = learnSub.filter(r => !usedSameIDs.has(r.ID));
    remainSet.forEach(row => {
      const alt = idMap.get(row.ID).find(r => r.index !== row.index);
      testList.push({
        ...alt,
        fullpath: `${stimuliFolder}/${alt.filename}`,
        condition: "old-new",
        block: blk + 1
      });
    });

    // new
    blockNewIDs[blk].forEach(id => {
      const pair = idMap.get(id);
      const chosen = jsPsych.randomization.sampleWithoutReplacement(pair, 1)[0];
      testList.push({
        ...chosen,
        fullpath: `${stimuliFolder}/${chosen.filename}`,
        condition: "new",
        block: blk + 1
      });
    });
  }

  // Shuffle within each block
  const finalLearnList = jsPsych.randomization.shuffle(learnList);
  const finalTestList = [1, 2, 3].flatMap(blk =>
    jsPsych.randomization.shuffle(testList.filter(row => row.block === blk))
  );

  return { learnList: finalLearnList, testList: finalTestList };
}

// helper: load CSV as array of objects
async function loadCSV(path) {
  const res = await fetch(path);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true }).data;
  // Filter out empty rows
  return parsed.filter(row =>
    Object.values(row).some(value => value.trim() !== "")
  );
}