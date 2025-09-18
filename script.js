const form = document.getElementById('planner-form');
const steps = Array.from(document.querySelectorAll('.form-step'));
const progressBar = document.querySelector('.progress__bar');
const report = document.getElementById('report');
const reportActions = document.querySelector('.report__actions');
const printButton = document.getElementById('print-report');
const resetButton = document.getElementById('reset-form');
const scrollButtons = document.querySelectorAll('[data-scroll]');
const skipProtectionButtons = document.querySelectorAll('[data-skip-protection]');

let currentStep = 0;

const formatCurrency = (value) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const formatPercent = (value) => `${Math.round(value * 100)}%`;

const parseNumber = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const escapeHTML = (value = '') =>
  value
    .toString()
    .replace(/[&<>'"]/g, (char) =>
      (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        }[char]
      ) || char,
    );

const updateProgress = () => {
  const progress = (currentStep / (steps.length - 1)) * 100;
  progressBar.style.width = `${progress}%`;
};

const showStep = (index) => {
  currentStep = Math.min(Math.max(index, 0), steps.length - 1);
  steps.forEach((step, idx) => {
    step.classList.toggle('active', idx === currentStep);
  });
  updateProgress();
  steps[currentStep].scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const validateStep = (stepIndex) => {
  const fields = steps[stepIndex].querySelectorAll('input, select, textarea');
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
};

const investmentLabel = (value) =>
  (
    {
      cash: 'Primarily cash or savings',
      balanced: 'Balanced allocation',
      growth: 'Growth-oriented portfolio',
    }[value]
  ) || 'Not specified';

const buildReport = (data) => {
  const incomes = [
    { label: 'Primary salary / wages', value: parseNumber(data.incomeSalary) },
    { label: 'Secondary income', value: parseNumber(data.incomeSecondary) },
    { label: 'Bonus or commissions', value: parseNumber(data.incomeBonus) },
    { label: 'Other recurring income', value: parseNumber(data.incomeOther) },
  ];
  const totalIncome = incomes.reduce((sum, item) => sum + item.value, 0);

  const expenses = [
    { label: 'Housing', value: parseNumber(data.expenseHousing) },
    { label: 'Transportation', value: parseNumber(data.expenseTransport) },
    { label: 'Groceries & dining', value: parseNumber(data.expenseFood) },
    { label: 'Insurance premiums', value: parseNumber(data.expenseInsurance) },
    { label: 'Debt payments', value: parseNumber(data.expenseDebt) },
    { label: 'Lifestyle & discretionary', value: parseNumber(data.expenseLifestyle) },
    { label: 'Education & childcare', value: parseNumber(data.expenseEducation) },
    { label: 'Healthcare', value: parseNumber(data.expenseHealth) },
  ];
  const totalExpenses = expenses.reduce((sum, item) => sum + item.value, 0);
  const monthlySavings = parseNumber(data.monthlySavings);
  const netCashFlow = totalIncome - totalExpenses;
  const surplusAfterSavings = netCashFlow - monthlySavings;
  const savingsRate = totalIncome ? monthlySavings / totalIncome : 0;
  const annualSavings = monthlySavings * 12;
  const investmentPreference = data.currentInvestment || '';
  const assumedReturnRate =
    investmentPreference === 'growth'
      ? 0.08
      : investmentPreference === 'balanced'
      ? 0.05
      : 0;

  const projectionHorizon = 10;
  let projectionBalance = 0;
  const projectionPoints = Array.from({ length: projectionHorizon }, (_, index) => {
    const year = index + 1;
    projectionBalance = (projectionBalance + annualSavings) * (1 + assumedReturnRate);
    return { year, balance: projectionBalance };
  });
  const maxProjectionBalance = projectionPoints.reduce(
    (max, point) => Math.max(max, point.balance),
    0,
  );
  const projectionChart =
    monthlySavings > 0 && maxProjectionBalance > 0
      ? `<div class="projection-chart">
          ${projectionPoints
            .map((point) => {
              const width = maxProjectionBalance
                ? Math.min(Math.max((point.balance / maxProjectionBalance) * 100, 8), 100)
                : 0;
              return `
                <div class="projection-row">
                  <span>Year ${point.year}</span>
                  <div class="projection-bar">
                    <div class="projection-bar__fill" style="width: ${width}%"></div>
                  </div>
                  <strong>${formatCurrency(point.balance)}</strong>
                </div>
              `;
            })
            .join('')}
        </div>`
      : `<p class="projection-empty">Add monthly savings to preview long-term growth.</p>`;

  const assets = [
    { label: 'Cash & emergency savings', value: parseNumber(data.assetCash) },
    { label: 'Taxable investments', value: parseNumber(data.assetInvestments) },
    { label: 'Retirement accounts', value: parseNumber(data.assetRetirement) },
    { label: 'Real estate equity', value: parseNumber(data.assetRealEstate) },
    { label: 'Business & other assets', value: parseNumber(data.assetOther) },
  ];
  const totalAssets = assets.reduce((sum, item) => sum + item.value, 0);

  const liabilities = [
    { label: 'Mortgage balance', value: parseNumber(data.debtMortgage) },
    { label: 'Student loans', value: parseNumber(data.debtStudent) },
    { label: 'Credit cards & personal loans', value: parseNumber(data.debtCredit) },
    { label: 'Other liabilities', value: parseNumber(data.debtOther) },
  ];
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const emergencyTargetMonths = parseNumber(data.emergencyTarget) || 6;
  const emergencyCoverage = totalExpenses
    ? parseNumber(data.assetCash) / totalExpenses
    : 0;

  const age = parseNumber(data.age);
  const retirementAge = parseNumber(data.retirementAge);
  const yearsToRetirement = retirementAge && age ? retirementAge - age : null;
  const desiredRetirementIncome = parseNumber(data.retirementIncome);

  const recommendations = [];

  if (netCashFlow <= 0) {
    recommendations.push(
      'Cash flow is negative—review discretionary spending and look for opportunities to trim expenses within the next 30 days.',
    );
  } else if (surplusAfterSavings < 0) {
    recommendations.push(
      'Spending and savings exceed income. Rebalance monthly savings targets or reduce expenses to avoid funding goals with debt.',
    );
  } else if (surplusAfterSavings < totalIncome * 0.05) {
    recommendations.push(
      'Surplus after savings is narrow. Consider automating a “first 5%” increase to savings to grow the buffer.',
    );
  }

  if (savingsRate < 0.15) {
    recommendations.push(
      'Increase monthly savings to at least 15% of income to stay on track for medium- and long-term goals.',
    );
  }

  if (emergencyCoverage < emergencyTargetMonths) {
    const gap = Math.max(emergencyTargetMonths - emergencyCoverage, 0).toFixed(1);
    recommendations.push(
      `Boost emergency reserves by approximately ${formatCurrency(
        Math.max(totalExpenses * emergencyTargetMonths - parseNumber(data.assetCash), 0),
      )} to cover an additional ${gap} months of essential expenses.`,
    );
  }

  if (yearsToRetirement !== null) {
    if (yearsToRetirement < 0) {
      recommendations.push(
        'Retirement age entered is below current age. Review assumptions for the retirement timeline.',
      );
    } else if (yearsToRetirement < 15 && savingsRate < 0.2) {
      recommendations.push(
        'With retirement approaching, push savings above 20% and review investment mix for income generation.',
      );
    }
  }

  if (parseNumber(data.debtCredit) > totalIncome * 2) {
    recommendations.push(
      'Elevated revolving debt detected. Explore consolidation or accelerated payoff strategies.',
    );
  }

  if (data.riskTolerance === 'conservative') {
    recommendations.push(
      'Keep portfolios diversified with an emphasis on capital preservation while layering guaranteed income sources.',
    );
  }

  if (data.estatePlanning === 'notyet') {
    recommendations.push(
      'Initiate estate planning to establish wills, powers of attorney, and beneficiary reviews.',
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      'Financial foundation appears strong. Continue monitoring cash flow quarterly and revisit goals annually.',
    );
  }

  const goalHighlights = [
    data.shortTermGoals && `Next 12-36 months: ${escapeHTML(data.shortTermGoals)}`,
    data.longTermGoals && `7+ year priorities: ${escapeHTML(data.longTermGoals)}`,
    data.impactGoals && `Impact focus: ${escapeHTML(data.impactGoals)}`,
  ].filter(Boolean);

  const planningNotes = [
    data.concerns && `Key concerns: ${escapeHTML(data.concerns)}`,
    data.lifeEvents && `Upcoming milestones: ${escapeHTML(data.lifeEvents)}`,
    data.profileNotes && `Advisor insights: ${escapeHTML(data.profileNotes)}`,
  ].filter(Boolean);

  const today = new Date();
  const preparedDate = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="report__header">
      <h2>${escapeHTML(data.fullName || 'Financial Plan')}</h2>
      <p>Prepared ${preparedDate} • Household status: ${escapeHTML(
        data.householdStatus || 'Not provided',
      )}</p>
      <div class="metrics">
        <div class="metric">
          <span>Total monthly income</span>
          <strong>${formatCurrency(totalIncome)}</strong>
        </div>
        <div class="metric">
          <span>Monthly commitments</span>
          <strong>${formatCurrency(totalExpenses + monthlySavings)}</strong>
        </div>
        <div class="metric">
          <span>Current savings rate</span>
          <strong>${formatPercent(savingsRate)}</strong>
        </div>
        <div class="metric">
          <span>Net worth</span>
          <strong>${formatCurrency(netWorth)}</strong>
        </div>
      </div>
    </div>
    <div class="report__grid">
      <article class="card">
        <h3>Savings outlook</h3>
        <p>
          Current investment mix: <strong>${escapeHTML(
            investmentLabel(investmentPreference),
          )}</strong>
        </p>
        <p>
          Projected growth assumes ${formatPercent(assumedReturnRate)} annual return on ${formatCurrency(
            monthlySavings,
          )} monthly savings.
        </p>
        ${projectionChart}
      </article>
      <article class="card">
        <h3>Cash flow pulse</h3>
        <ul class="data-list">
          ${incomes
            .map(
              (item) => `
                <li>
                  <strong>${formatCurrency(item.value)}</strong>
                  <span>${item.label}</span>
                </li>
              `,
            )
            .join('')}
        </ul>
        <div class="tag">Net cash flow: ${formatCurrency(netCashFlow)}</div>
        <p>
          After current savings contributions of ${formatCurrency(
            monthlySavings,
          )}, surplus remaining each month is ${formatCurrency(surplusAfterSavings)}.
        </p>
      </article>

      <article class="card">
        <h3>Essential expenses</h3>
        <ul class="data-list">
          ${expenses
            .map(
              (item) => `
                <li>
                  <strong>${formatCurrency(item.value)}</strong>
                  <span>${item.label}</span>
                </li>
              `,
            )
            .join('')}
        </ul>
        <p>Total monthly lifestyle spending: ${formatCurrency(totalExpenses)}</p>
      </article>

      <article class="card">
        <h3>Balance sheet</h3>
        <p>
          Assets total ${formatCurrency(totalAssets)} versus liabilities of ${formatCurrency(
    totalLiabilities,
  )}, yielding a net worth of ${formatCurrency(netWorth)}.
        </p>
        <ul class="data-list">
          ${assets
            .map(
              (item) => `
                <li>
                  <strong>${formatCurrency(item.value)}</strong>
                  <span>${item.label}</span>
                </li>
              `,
            )
            .join('')}
        </ul>
        <hr />
        <ul class="data-list">
          ${liabilities
            .map(
              (item) => `
                <li>
                  <strong>${formatCurrency(item.value)}</strong>
                  <span>${item.label}</span>
                </li>
              `,
            )
            .join('')}
        </ul>
        <p>
          Emergency reserves cover ${emergencyCoverage.toFixed(1)} months versus a target of ${emergencyTargetMonths} months.
        </p>
      </article>

      <article class="card">
        <h3>Goal tracker</h3>
        ${goalHighlights.length
          ? `<ul class="data-list">${goalHighlights
              .map((goal) => `<li>${goal}</li>`)
              .join('')}</ul>`
          : '<p>No goals captured yet. Use this space to align on what matters most.</p>'}
        ${yearsToRetirement !== null
          ? `<p>Retirement horizon: ${yearsToRetirement} years • Desired income: ${formatCurrency(
              desiredRetirementIncome,
            )}</p>`
          : ''}
        <p>Risk comfort: <strong>${escapeHTML(data.riskTolerance || 'Not captured')}</strong></p>
        <p>Investment posture: <strong>${escapeHTML(
          investmentLabel(investmentPreference),
        )}</strong></p>
        ${data.planningHorizon
          ? `<p>Planning horizon focus: ${escapeHTML(data.planningHorizon)}</p>`
          : ''}
      </article>

      <article class="card">
        <h3>Protection review</h3>
        <ul class="data-list">
          <li>
            <strong>${formatCurrency(parseNumber(data.lifeInsurance))}</strong>
            <span>Life insurance coverage</span>
          </li>
          <li>
            <strong>${formatCurrency(parseNumber(data.disabilityInsurance))}</strong>
            <span>Monthly disability benefit</span>
          </li>
          <li>
            <strong>${escapeHTML(data.estatePlanning || 'No update')}</strong>
            <span>Estate planning status</span>
          </li>
        </ul>
        ${planningNotes.length
          ? `<p>${planningNotes.join(' • ')}</p>`
          : '<p>No additional risk notes captured.</p>'}
      </article>

      <article class="card">
        <h3>Immediate next steps</h3>
        <ol>
          ${recommendations.map((item) => `<li>${item}</li>`).join('')}
        </ol>
        <p>
          Revisit this plan quarterly to capture life changes and update projections. Sharing this summary with your advisor will ensure ongoing accountability.
        </p>
      </article>
    </div>
  `;
};

const generatePlan = () => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  report.innerHTML = buildReport(data);
  reportActions.hidden = false;
  report.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

steps.forEach((step) => {
  step.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        showStep(currentStep + 1);
      }
    });
  });

  step.querySelectorAll('[data-prev]').forEach((button) => {
    button.addEventListener('click', () => {
      showStep(currentStep - 1);
    });
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(currentStep)) return;
  generatePlan();
});

skipProtectionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    generatePlan();
  });
});

printButton?.addEventListener('click', () => {
  window.print();
});

resetButton?.addEventListener('click', () => {
  form.reset();
  showStep(0);
  report.innerHTML = `
    <div class="report__placeholder">
      <h3>Financial plan preview</h3>
      <p>
        Complete the discovery to reveal a personalized plan including cash flow insights, balance sheet, retirement readiness, and action items.
      </p>
    </div>
  `;
  reportActions.hidden = true;
});

scrollButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetSelector = button.getAttribute('data-scroll');
    const target = targetSelector === 'body' ? document.body : document.querySelector(targetSelector);
    target?.scrollIntoView({ behavior: 'smooth' });
  });
});

showStep(0);
