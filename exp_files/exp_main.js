// exp_main
// Old-New Experiment Version 2: Image
// by Qihao He, July 2025

/////////////////////////////////////////////////////////
// generate a random subject ID
var subj_id = Math.floor(Math.random() * 100000000);

// pavlovia
/*
const pavlovia_init = {
  type: jsPsychPavlovia,
  command: "init"
};

const pavlovia_finish = {
  type: jsPsychPavlovia,
  command: "finish"
};

const jsPsych = initJsPsych({
  override_safe_mode: true
});
*/

const jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function() {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "_");
    jsPsych.data.get().localSave('csv', `OldNew_v1People_${subj_id}_${timestamp}.csv`);
  }
});

jsPsych.data.addProperties({
  id: subj_id, 
  version: "Image"
}); 

// Initialize Parameters
const stimtime = 1000;      // ms
const blanktime = 500;      // ms
const learnnum = 16;
const testnum = learnnum * 2;
const blocknum = 3;         // 3
const fixationDuration = 800; 
const fixationCrossHtml = '<div style="font-size:50px;">+</div>'; 
const stimHeight = 457; // Height of the face images in pixels

/////////////////////////////////////////////////////////
// Learn trials
/**
 * Builds an array of jsPsych trials for the learning phase.
 *
 * @param {Array} learnStimuli_block An array of stimulus objects for the current block, filtered by block number.
 * @param {number} currentBlock The current block number.
 * @returns {Array} An array of jsPsych trial objects.
 */
function buildLearnTrials(learnStimuli_block, currentBlock) {
  let learnTimeline = [];
  
  // Rating scale configuration
  const numbers = [-3, -2, -1, 1, 2, 3]; 
  const bottomLabels = [
    'least<br>attractive', '', 'below<br>average', 'above<br>average', '', 'most<br>attractive'
  ]; 

  learnStimuli_block.forEach((stim, index) => { 
    // Calculate the overall sequence number for the trial
    const currentSequence = (currentBlock - 1) * learnnum + index + 1;

    // 1. Fixation trial
    const fixationTrial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: fixationCrossHtml,
      choices: "NO_KEYS", 
      trial_duration: fixationDuration,
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false
    };
    learnTimeline.push(fixationTrial);

    // 2. Show face trial
    const faceTrial = {
      type: jsPsychImageKeyboardResponse,
      stimulus: stim.fullpath, 
      stimulus_height: stimHeight, 
      choices: "NO_KEYS", 
      trial_duration: stimtime, 
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false, 
      on_load: function() {
        const img = document.querySelector('.jspsych-image-keyboard-response-stimulus');
        if (img) {
          img.style.objectFit = 'contain';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
        }
      }
    };
    learnTimeline.push(faceTrial);

    // 3. Rating trial
    const ratingTrial = {
      type: jsPsychHtmlKeyboardResponse, // Changed to HtmlKeyboardResponse for full control
      stimulus: function() {
        let html = '<p style="font-size: 24px; margin-bottom: 20px;">How attractive is this face?</p>'; 
        html += '<div style="display: flex; justify-content: center; width: 100%;">'; 

        numbers.forEach((num, idx) => {
          // Each button and its label are grouped in a flex item
          html += `<div style="display: flex; flex-direction: column; align-items: center;">`; // Adjusted margin
          // Square button style
          html += `<button class="rating-button jspsych-btn" data-response="${num}" `;
          html += `style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; `;
          html += `font-size: 24px; margin-bottom: 10px; cursor: pointer; border-radius: 5px;">${num}</button>`;
          // Bottom label below the button
          html += `<div style="text-align: center; font-size: 24px;">${bottomLabels[idx]}</div>`;
          html += `</div>`;
        });
        html += '</div>'; // Close main flex container

        return html;
      },
      choices: "NO_KEYS", // No keyboard input to end trial, will be handled by button clicks
      trial_duration: null, // Trial will end on button click, so no duration limit
      response_ends_trial: true, // Crucial: button click should end the trial

      data: {
        task: "learn_rating",
        block: currentBlock,
        face_name: stim.filename,
        age_of_stim: stim.age,
        race_of_stim: stim.race,
        sequence: currentSequence,
        // Initialize response and rt, these will be overwritten by finishTrial
        response: null,
        rt: null
      },
      on_load: function() {
        // Attach event listeners to the custom buttons
        const buttons = document.querySelectorAll('.rating-button');
        const start_time = performance.now(); // Record start time when buttons appear

        buttons.forEach(button => {
          button.addEventListener('click', function() {
            const end_time = performance.now();
            const rt = end_time - start_time;
            const response_value = parseInt(this.getAttribute('data-response'));

            // Correct way to end trial and add data in jsPsych v8
            jsPsych.finishTrial({
              response: response_value,
              rt: rt
            });
          });
        });
      },
    };
    learnTimeline.push(ratingTrial);

    // 4. Blank screen trial
    const blankTrial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '', 
      choices: "NO_KEYS",
      trial_duration: blanktime,
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false
    };
    learnTimeline.push(blankTrial);
  });

  return learnTimeline;
}

/////////////////////////////////////////////////////////
// Test trials
/**
 * Builds an array of jsPsych trials for the test phase.
 *
 * @param {Array} testStimuli_block An array of stimulus objects for the current block, filtered by block number.
 * @param {number} currentBlock The current block number.
 * @returns {Array} An array of jsPsych trial objects.
 */
function buildTestTrials(testStimuli_block, currentBlock) {
  let testTimeline = [];

  const numbers = [-3, -2, -1, 1, 2, 3];
  // Determine old/new labels order based on subj_id parity (similar to MATLAB Seriesnum)
  const isSubjIdOdd = (subj_id % 2) === 1; // Get subj_id 

  const baseLabels = {
    old: ['surely', 'old'],
    guess_old: ['guess', 'old'],
    guess_new: ['guess', 'new'],
    new: ['surely', 'new']
  };

  const currentBottomLabels = isSubjIdOdd ?
    [ // Odd subj_id: normal order (old on left, new on right)
      baseLabels.old, '', baseLabels.guess_old, baseLabels.guess_new, '', baseLabels.new
    ] :
    [ // Even subj_id: flipped order (new on left, old on right)
      baseLabels.new, '', baseLabels.guess_new, baseLabels.guess_old, '', baseLabels.old
    ];

  testStimuli_block.forEach((stim, index) => {
    // Calculate the overall sequence number for the trial (similar to MATLAB's i)
    // Note: Assuming test sequence continues from learn sequence.
    // If test sequence should restart per block, adjust (currentBlock-1) * testnum + index + 1
    const currentSequence = (currentBlock - 1) * testnum + index + 1; // Test sequence within block

    // 1. Fixation trial
    const fixationTrial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: fixationCrossHtml,
      choices: "NO_KEYS",
      trial_duration: fixationDuration,
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false
    };
    testTimeline.push(fixationTrial);

    // 2. Show face trial
    const faceTrial = {
      type: jsPsychImageKeyboardResponse,
      stimulus: stim.fullpath,
      stimulus_height: stimHeight,
      choices: "NO_KEYS",
      trial_duration: stimtime,
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false,
      on_load: function() {
        const img = document.querySelector('.jspsych-image-keyboard-response-stimulus');
        if (img) {
          img.style.objectFit = 'contain';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
        }
      }
    };
    testTimeline.push(faceTrial);

    // 3. Rating trial (Old/New Judgment)
    const judgmentTrial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        let html = '<p style="font-size: 24px; margin-bottom: 20px;">Was this Image shown in the study phase?</p>';
        html += '<div style="display: flex; justify-content: center; width: 100%;">';

        numbers.forEach((num, idx) => {
          // Each button and its labels are grouped in a flex item
          html += `<div style="display: flex; flex-direction: column; align-items: center; margin: 0 8px;">`; // Match learn phase spacing
          // Square button style
          html += `<button class="rating-button jspsych-btn" data-response="${num}" `;
          html += `style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; `;
          html += `font-size: 24px; margin-bottom: 10px; cursor: pointer; border-radius: 5px; padding: 0;">${num}</button>`;

          // Bottom labels below the button
          const labelsForThisButton = currentBottomLabels[idx];
          if (labelsForThisButton && labelsForThisButton.length > 0) {
            html += `<div style="text-align: center; font-size: 24px;">`; 
            labelsForThisButton.forEach(line => {
              html += `<div>${line}</div>`; // Each line in a new div
            });
            html += `</div>`;
          } else {
            html += `<div style="text-align: center; font-size: 16px;">&nbsp;</div>`; // Empty div to maintain spacing
          }
          html += `</div>`;
        });
        html += '</div>';

        return html;
      },
      choices: "NO_KEYS",
      trial_duration: null,
      response_ends_trial: true,

      data: {
        task: "test_judgment",
        block: currentBlock,
        face_name: stim.filename,
        age_of_stim: stim.age,
        race_of_stim: stim.race,
        face_condition: stim.condition, // Record the true condition ("old-old", "new", etc.)
        sequence: currentSequence,
        response: null, // Numeric response from -3 to 3
        rt: null,
        sub_judgment: null, // Subject's categorized judgment ("old" or "new")
        correct: null // 0 or 1
      },
      on_load: function() {
        const buttons = document.querySelectorAll('.rating-button');
        const start_time = performance.now();

        buttons.forEach(button => {
          button.addEventListener('click', function() {
            const end_time = performance.now();
            const rt = end_time - start_time;
            const response_value = parseInt(this.getAttribute('data-response'));

            // Determine subject's judgment ("old" or "new") based on response and counterbalance
            let subJudgement;
            if (isSubjIdOdd) { // Odd subj_id: - is old, + is new
              subJudgement = response_value < 0 ? "old" : "new";
            } else { // Even subj_id: - is new, + is old
              subJudgement = response_value < 0 ? "new" : "old";
            }

            // Determine correctness
            let correct;
            let trueCondition = stim.condition; // e.g., "old-old", "old-new", "new"
            // Normalize true condition to "old" or "new" for comparison
            const normalizedTrueCondition = (trueCondition === "old-old") ? "old" : "new";

            correct = (subJudgement === normalizedTrueCondition) ? 1 : 0;

            jsPsych.finishTrial({
              response: response_value,
              rt: rt,
              sub_judgment: subJudgement,
              correct: correct
            });
          });
        });
      },
    };
    testTimeline.push(judgmentTrial);

    // 4. Blank screen trial
    const blankTrial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '',
      choices: "NO_KEYS",
      trial_duration: blanktime,
      on_start: function() {
        document.body.style.cursor = "none";
      },
      on_finish: function() {
          document.body.style.cursor = "default"; 
      }, 
      record_data: false
    };
    testTimeline.push(blankTrial);
  });

  return testTimeline;
}

/////////////////////////////////////////////////////////
// data summary
const summary_data = {
  type: jsPsychCallFunction, 
  func: function() {
    const allData = jsPsych.data.get().values();
    const testData = allData.filter(d => d.task === 'test_judgment' && d.correct !== null && d.rt !== null);

    if (testData.length === 0) {
      console.warn("No valid test data found for summary calculation.");
      return; 
    }

    // Basic Statistics
    const correctVals = testData.map(d => d.correct);
    const rtVals = testData.map(d => d.rt);

    const accuracy = correctVals.reduce((sum, val) => sum + val, 0) / correctVals.length;
    const meanRT = rtVals.reduce((sum, val) => sum + val, 0) / rtVals.length;

    // SDT Calculations using jStat
    const epsilon = 0.000001; 
    let hits = 0;
    let miss = 0;
    let fa = 0;
    let cr = 0;

    testData.forEach(trial => {
      const trueCondition = trial.face_condition; 
      const subJudgement = trial.sub_judgment; 

      const isOldStim = (trueCondition === "old-old");
      const isNewStim = (trueCondition === "new" || trueCondition === "old-new");
      const respOld = (subJudgement === "old"); 

      if (isOldStim && respOld) {
        hits++;
      } else if (isOldStim && !respOld) {
        miss++;
      } else if (isNewStim && respOld) {
        fa++;
      } else if (isNewStim && !respOld) {
        cr++;
      }
    });

    let hitRate = hits / (hits + miss);
    let faRate = fa / (fa + cr);

    if (hits + miss === 0) {
        hitRate = 0;
    }
    if (fa + cr === 0) {
        faRate = 0;
    }

    if (hitRate === 1) hitRate = 1 - epsilon;
    if (hitRate === 0) hitRate = epsilon;
    if (faRate === 1) faRate = 1 - epsilon;
    if (faRate === 0) faRate = epsilon;

    const zHit = jStat.normal.inv(hitRate, 0, 1);
    const zFA = jStat.normal.inv(faRate, 0, 1);

    const dPrime = zHit - zFA;
    const criterion = - 0.5 * (zHit + zFA);

    jsPsych.data.addProperties({
      accuracy: accuracy,
      meanRT: meanRT,
      hitRate: hitRate,
      faRate: faRate,
      dPrime: dPrime,
      criterion: criterion
    });
  },
};

/////////////////////////////////////////////////////////
// START ASYNC MAIN FUNCTION
async function startExperiment() {

  // 1. Load stimuli list
  let learnStimuli = [];
  let testStimuli = [];

  await genStimLists("exp_files/OldNewStimList.csv", "exp_files/img/Stimuli").then(lists => {
    learnStimuli = lists.learnList;
    testStimuli = lists.testList;
  });

  // 2. Preload stimuli
  const imagePaths = [...learnStimuli, ...testStimuli].map(s => s.fullpath);
  const preload = {
    type: jsPsychPreload,
    images: imagePaths,
  };

  // 3. Preload instruction images
  const instruction_list = [
    'exp_files/img/Instruction_v2/Start.png',
    'exp_files/img/Instruction_v2/Demo.png',
    'exp_files/img/Instruction_v2/Learn.png',
    'exp_files/img/Instruction_v2/Test.png',
    'exp_files/img/Instruction_v2/End.png'
  ];
  const loadInstruction = {
    type: jsPsychPreload,
    images: instruction_list
  };

  // 4. Define instruction screens
  const instructionStart = {
    type: jsPsychImageKeyboardResponse,
    stimulus: 'exp_files/img/Instruction_v2/Start.png',
    stimulus_height: 600,
    choices: [' '], 
    record_data: false
  };

  const instructionDemo = {
    type: jsPsychImageKeyboardResponse,
    stimulus: 'exp_files/img/Instruction_v2/Demo.png',
    stimulus_height: 500,
    choices: [' '], 
    record_data: false
  };

  const instructionLearn = {
    type: jsPsychImageKeyboardResponse,
    stimulus: 'exp_files/img/Instruction_v2/Learn.png',
    stimulus_height: 600,
    choices: [' '], 
    record_data: false
  };

  const instructionTest = {
    type: jsPsychImageKeyboardResponse,
    stimulus: 'exp_files/img/Instruction_v2/Test.png',
    stimulus_height: 600,
    choices: [' '], 
    record_data: false
  };

  const instructionEnd = {
    type: jsPsychImageKeyboardResponse,
    stimulus: 'exp_files/img/Instruction_v2/End.png',
    stimulus_height: 600,
    choices: [' '], 
    record_data: false
  };

  // 5. Participant information
  const getPartiInfo = {
    type: jsPsychSurvey,
    survey_json: { 
      title: "Please provide the following demographic information.",
      pages: [
        {
          name: 'page1', 
          elements: [ 
            {
              type: 'text', 
              name: 'age',
              title: "Age:",
              inputType: 'number', 
              isRequired: true // Renamed from 'required' to 'isRequired' for SurveyJS
            }
          ]
        },
        {
          name: 'page2', 
          elements: [ 
            {
              type: 'dropdown', 
              name: 'gender',
              title: "Gender:",
              choices: ["Female", "Male", "Others/Prefer not to say"],
              isRequired: true
            },
            {
              type: 'dropdown', 
              name: 'handedness',
              title: "Handedness:",
              choices: ["Left", "Right", "Ambidextrous"],
              isRequired: true
            }
          ]
        },
        {
          name: 'page3', 
          elements: [ 
            {
              type: 'dropdown', 
              name: 'race',
              title: "Race/Ethnicity:",
              choices: ['White/European-American', 'Black/African-American', 'East Asian (e.g., Chinese, Korean, Japanese)', 
                        'South Asian (e.g., Indian, Pakistani, Bangladeshi)', 'Hispanic/Latinx', 'Middle Eastern/North African', 
                        'Native American/Alaska Native', 'Pacific Islander/Native Hawaiian', 'Mixed/Biracial', 'Others/Prefer not to say'],
              isRequired: true
            }
          ]
        }
      ],
    },
    on_finish: function(data){
      surveyResponse = data.response;

      const age = surveyResponse.age;
      const gender = surveyResponse.gender;
      const handedness = surveyResponse.handedness;
      const race = surveyResponse.race;

      console.log("age:", age, "gender:", gender, "handedness:", handedness, "race:", race);

      // Save participant info to data
      jsPsych.data.addProperties({
          age: age,
          gender: gender,
          handedness: handedness
      }); 
      
    }
  };
  // 6. Chinrest
  const chinrest = {
    type: jsPsychVirtualChinrest,
    blindspot_reps: 4,
    resize_units: "deg",
    pixels_per_unit: 35.15,
    item_path: "exp_files/img/card.jpg",
    viewing_distance_report: 'none',
    on_finish: function (data) {
      window.scale_factor = data.scale_factor;
    }
  };

  /////////////////////////////////////////////////////////
  // Timeline
  let timeline = [];
  // timeline.unshift(pavlovia_init);

  timeline.push(preload);
  timeline.push(loadInstruction);
  timeline.push(getPartiInfo);
  timeline.push(chinrest);
  timeline.push(instructionStart);
  timeline.push(instructionDemo);


  for (let blk = 1; blk <= blocknum; blk++) {
    timeline.push(instructionLearn);

    const blk_learn = buildLearnTrials(learnStimuli.filter(s => s.block == blk), blk);
    timeline.push(...blk_learn);

    timeline.push(instructionTest);

    const blk_test = buildTestTrials(testStimuli.filter(s => s.block == blk), blk);
    timeline.push(...blk_test);

  }

  timeline.push(summary_data);
  timeline.push(instructionEnd);
  // timeline.push(pavlovia_finish);

  // 7. Start experiment
  jsPsych.run(timeline);
}

// Call the async main function to start
startExperiment();
