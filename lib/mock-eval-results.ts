import type { EvalResultsResponse, TestCaseResult } from './eval-result-types';

const VARS: Record<string, string>[] = [
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?We were approved for a loan through yall they said we needed to get a 50 dollar gift card for first time customersI understand you're excited about your loan approval. To ensure a smooth process, can you please confirm the exact amount of the loan you've been approved for?2000 for Kevin BenedictCould you kindly provide me with the name of the lender or financial institution that approved your loan?Ez cash loanIs there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.That's it please contact meOK. Got it. I'm sending you to a secure page to join JustAnswer for only $5 (fully-refundable). While you're filling out that form, I'll tell the Expert about your situation and then connect you two.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?P950 won't focus even tho the green focus square is displayedI understand you're having trouble focusing your P950 camera, even though the green focus square is displayed. Can you tell me what happens when you press the shutter button?pressing the shutter button halfway shows the green focus square bit the subject is fuzzyHave you tried cleaning the camera lens?yesIs there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.noOK. Got it. I'm sending you to a secure page to join JustAnswer for only CA$2 (fully-refundable). While you're filling out that form, I'll tell the Expert about your situation and then connect you two.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?Please take my email off all your list.  I am in transition to retirement and do not want any additional emails.I understand you're transitioning to retirement and want to reduce emails. Can you confirm the email address you'd like removed?jgardner@trinkote.comHave you checked your spam or junk folders to ensure our emails aren't being filtered there?If I do not want any of your emails why would i want to check my junk email file for your emails.Is there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?love youI'm here to help you with your question. Can you please tell me what you need assistance with?60392093What specific issue are you experiencing?",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?I never received any packageI understand you haven't received your package yet. Can you please provide me with your tracking number so I can look into this for you?9.40011E+21When was the expected delivery date?45327Is there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.no thanksOK. Got it. I'm sending you to a secure page to join JustAnswer for only $5 (fully-refundable). While you're filling out that form, I'll tell the Expert about your situation and then connect you two.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?I have anew debit card and Iwould like to give you the new numbers on my new debit cardI understand you want to update your debit card information. To ensure your account is updated correctly, can you please confirm the last four digits of your old debit card?5701Could you also provide the expiration date on your new debit card?45350Is there anything else the Computer Expert should know before I connect you? Rest assured that they'll be able to help you.that is allOK. Got it. I'm sending you to a secure page to join JustAnswer for only CA$2 (fully-refundable). While you're filling out that form, I'll tell the Computer Technician about your situation and then connect you two.",
  },
  {
    Pearl_User_Chat:
      "Welcome! What's going on with your BMW?Pull emergency cable for parking brake, now habe emf  parking brake mulfunvtion BMW parking brakeHow often do you use the emergency brake? Have you tried pumping the regular brake a few times?No havent tried to pump the brakes will try it tomorrow.What's the year and model of your BMW?",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?bottom of feet very painfull also what is your opinion on axonics deviceI'm sorry to hear that the bottoms of your feet are very painful. Can you tell me more about the pain? Is it a sharp pain, a dull ache, or something else?a burningHave you noticed anything that seems to make the pain better or worse?noIs there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?273043912414 tracking number. Just wasnted to make sure the delivery address is correctI understand you want to ensure your package is delivered to the correct address. To help the Expert assist you best, may I know the name on the package?PLEASE VERIFY SAN REAL ESTATE SERVICE INC 2851 S PARKER RD #114 AURORA,CO 80014Could you please provide the shipping carrier, such as USPS, FedEx, or UPS?FED EXIs there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.NO JUST VERIFY DELIVERY ADDRESSOK. Got it. I'm sending you to a secure page to join JustAnswer for only $5 (fully-refundable). While you're filling out that form, I'll tell the Expert about your situation and then connect you two.",
  },
  {
    Pearl_User_Chat:
      "Welcome! How can I help with your important question?what is the age requirement for st maartenI understand you want to travel to St. Maarten. To ensure the Expert can assist you best, may I ask what nationality you hold?whiteAre you traveling alone or with familyfriends?my grandson and myselfIs there anything else the Expert should know before I connect you? Rest assured that they'll be able to help you.",
  },
];

const OUTPUTS: string[] = [
  '{"Intro":"Hi, I\'m Pearl\\u2014the Loan Expert\'s AI chatbot. Do you still need help with your loan question? Now is the time to act, a verified Loan Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Loan Expert in minutes, 24/7","Closing":"Don\'t leave your loan issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your loan question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Camera Repair Expert\'s AI chatbot. Do you still need help with your camera focus question? Now is the time to act, a verified Camera Repair Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Camera Repair Expert in minutes, 24/7","Closing":"Don\'t leave your camera focus issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your camera focus question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Support Expert\'s AI chatbot. Do you still need help with your email removal question? Now is the time to act, a verified Support Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Support Expert in minutes, 24/7","Closing":"Don\'t leave your email removal issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your email removal question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Expert\'s AI chatbot. Do you still need help with your love question? Now is the time to act, a verified Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from an Expert in minutes, 24/7","Closing":"Don\'t leave your love issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your love question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Customer Service Expert\'s AI chatbot. Do you still need help with your package delivery question? Now is the time to act, a verified Customer Service Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Customer Service Expert in minutes, 24/7","Closing":"Don\'t leave your package delivery issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your package delivery question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Computer Technician\'s AI chatbot. Do you still need help with your payment update question? Now is the time to act, a verified Computer Technician is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Computer Technician in minutes, 24/7","Closing":"Don\'t leave your payment update issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your payment update question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Mechanic\'s AI chatbot. Do you still need help with your parking brake question? Now is the time to act, a verified Mechanic is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Mechanic in minutes, 24/7","Closing":"Don\'t leave your parking brake issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your parking brake question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Doctor\'s AI chatbot. Do you still need help with your foot pain question? Now is the time to act, a verified Doctor is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Doctor in minutes, 24/7","Closing":"Don\'t leave your foot pain issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your foot pain question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Customer Service Expert\'s AI chatbot. Do you still need help with your delivery address question? Now is the time to act, a verified Customer Service Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Customer Service Expert in minutes, 24/7","Closing":"Don\'t leave your delivery address issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your delivery address question? Get Expert help now!"}',
  '{"Intro":"Hi, I\'m Pearl\\u2014the Travel Expert\'s AI chatbot. Do you still need help with your travel age requirement question? Now is the time to act, a verified Travel Expert is available to give you fast, reliable 1-on-1 Expert guidance to help resolve your issue.","Bullet_1":"Fast answers from a Travel Expert in minutes, 24/7","Closing":"Don\'t leave your travel age requirement issue unresolved. Get Expert help in minutes!","SUBJECT_LINE":"Still dealing with your travel age requirement question? Get Expert help now!"}',
];

function buildTestCase(index: number, pass: boolean): TestCaseResult {
  const latency = 1200 + Math.round(Math.random() * 1800);
  const tokensPrompt = 130 + Math.round(Math.random() * 80);
  const tokensCompletion = 40 + Math.round(Math.random() * 30);
  const tokensTotal = tokensPrompt + tokensCompletion;

  return {
    id: `tc-${index}`,
    testIndex: index,
    vars: VARS[index],
    outputs: [
      {
        providerId: 'http://pmtapi.ord.pearl.local/api/v3/eval-runs/execute-prompt',
        promptLabel: undefined,
        rawOutput: OUTPUTS[index],
        status: pass ? 'pass' : 'fail',
        score: pass ? 1.0 : 0.0,
        namedScores: { functionCallValidation: pass ? 2 : 0 },
        graderReason: pass ? 'All assertions passed' : 'Assertion failed: missing required keys',
        assertions: [
          {
            metric: 'functionCallValidation',
            pass,
            score: pass ? 1.0 : 0.0,
            type: 'llm-rubric',
            value:
              "The output must contain: key 'SUBJECT_LINE' and the value, key 'Intro' and the value, key 'Bullet_1' and the value, key 'Closing' and the value",
            reason: pass
              ? "The output contains all required keys: 'SUBJECT_LINE', 'Intro', 'Bullet_1', and 'Closing', each with a corresponding value."
              : "The output is missing required key 'SUBJECT_LINE' or has an empty value.",
          },
          {
            metric: 'functionCallValidation',
            pass: true,
            score: 1.0,
            type: 'llm-rubric',
            value: "The output must use 'Hi,' if no first name is given",
            reason: "The Intro begins with 'Hi,' and no first name is used.",
          },
        ],
        metadata: {
          tokensPrompt,
          tokensCompletion,
          tokensTotal,
          latencyMs: latency,
          tokensPerSecond: Math.round(tokensTotal / (latency / 1000)),
          cost: parseFloat((tokensTotal * 0.000025).toFixed(6)),
        },
      },
    ],
  };
}

const MOCK_RESULTS: TestCaseResult[] = VARS.map((_, i) => {
  // tests 3 and 7 fail to exercise both states
  const pass = i !== 3 && i !== 7;
  return buildTestCase(i, pass);
});

const passedTests = MOCK_RESULTS.filter((r) => r.outputs[0].status === 'pass').length;
const failedTests = MOCK_RESULTS.length - passedTests;
const totalCost = MOCK_RESULTS.reduce((s, r) => s + r.outputs[0].metadata.cost, 0);
const avgLatency =
  MOCK_RESULTS.reduce((s, r) => s + r.outputs[0].metadata.latencyMs, 0) / MOCK_RESULTS.length;
const avgTokens =
  MOCK_RESULTS.reduce((s, r) => s + r.outputs[0].metadata.tokensTotal, 0) / MOCK_RESULTS.length;
const avgScore =
  MOCK_RESULTS.reduce((s, r) => s + r.outputs[0].score, 0) / MOCK_RESULTS.length;

export const MOCK_EVAL_RESULTS: Record<string, EvalResultsResponse> = {
  'eval-LiW-2026': {
    summary: {
      evalId: 'eval-LiW-2026',
      description: 'Business_Remarketing Email-2: Subject_Line Change',
      runAt: '2026-04-27T14:29:16Z',
      runBy: 'Unknown',
      promptIds: [{ promptId: 3774, versionId: 19636 }],
      providerCount: 1,
      totalTests: MOCK_RESULTS.length,
      passedTests,
      failedTests,
      passRate: Math.round((passedTests / MOCK_RESULTS.length) * 10000) / 100,
      avgScore: Math.round(avgScore * 100) / 100,
      totalCost: Math.round(totalCost * 10000) / 10000,
      avgLatencyMs: Math.round(avgLatency),
      avgTokens: Math.round(avgTokens),
    },
    results: MOCK_RESULTS,
  },
  sample: {
    summary: {
      evalId: 'sample',
      description: 'Sample Eval Run (Demo)',
      runAt: '2026-04-25T10:00:00Z',
      runBy: 'Veronica',
      promptIds: [{ promptId: 10000, versionId: 'mo024xy827as' }],
      providerCount: 1,
      totalTests: MOCK_RESULTS.length,
      passedTests,
      failedTests,
      passRate: Math.round((passedTests / MOCK_RESULTS.length) * 10000) / 100,
      avgScore: Math.round(avgScore * 100) / 100,
      totalCost: Math.round(totalCost * 10000) / 10000,
      avgLatencyMs: Math.round(avgLatency),
      avgTokens: Math.round(avgTokens),
    },
    results: MOCK_RESULTS,
  },
};
