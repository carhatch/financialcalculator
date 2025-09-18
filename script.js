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
  const investmentPreference = data.currentInvestment || '';
  const assumedReturnRate =
    investmentPreference === 'growth'
      ? 0.08
      : investmentPreference === 'balanced'
      ? 0.05
      : 0;

  const investableBalance =
    parseNumber(data.assetCash) +
    parseNumber(data.assetInvestments) +
    parseNumber(data.assetRetirement) +
    parseNumber(data.assetOther);

  const projectionHorizon = 10;
  const years = Array.from({ length: projectionHorizon + 1 }, (_, index) => index);

  const computeProjection = (annualContribution, rate) => {
    let balance = investableBalance;
    return years.map((year, idx) => {
      if (idx === 0) {
        return { year, balance };
      }
      balance = balance * (1 + rate) + annualContribution;
      return { year, balance };
    });
  };

  const currentAnnualSavings = monthlySavings * 12;
  const currentSeries = computeProjection(currentAnnualSavings, assumedReturnRate);

  const recommendedMonthlySavings = Math.max(monthlySavings, totalIncome * 0.15);
  const recommendedReturnRate = Math.max(assumedReturnRate, 0.08);
  const recommendedAnnualSavings = recommendedMonthlySavings * 12;
  const recommendedSeries = computeProjection(
    recommendedAnnualSavings,
    recommendedReturnRate,
  );

  const maxProjectionBalance = Math.max(
    0,
    ...currentSeries.map((point) => point.balance),
    ...recommendedSeries.map((point) => point.balance),
  );

  const chartWidth = 640;
  const chartHeight = 320;
  const chartPadding = { top: 20, right: 32, bottom: 48, left: 72 };

  const xScale = (year) =>
    chartPadding.left +
    (year / projectionHorizon) * (chartWidth - chartPadding.left - chartPadding.right);

  const yScale = (value) => {
    if (!maxProjectionBalance) {
      return chartHeight - chartPadding.bottom;
    }
    const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    return chartHeight - chartPadding.bottom - (value / maxProjectionBalance) * usableHeight;
  };

  const buildPath = (series) =>
    series
      .map((point, idx) => {
        const command = idx === 0 ? 'M' : 'L';
        return `${command}${xScale(point.year).toFixed(2)} ${yScale(point.balance).toFixed(2)}`;
      })
      .join(' ');

  const currentPath = buildPath(currentSeries);
  const recommendedPath = buildPath(recommendedSeries);

  const xTickInterval = Math.max(1, Math.round(projectionHorizon / 5));
  const xTicks = years.filter((year) => year % xTickInterval === 0);

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) =>
    (maxProjectionBalance / yTickCount) * index,
  );

  const finalCurrentBalance = currentSeries[currentSeries.length - 1]?.balance || 0;
  const finalRecommendedBalance = recommendedSeries[recommendedSeries.length - 1]?.balance || 0;
  const additionalGrowth = Math.max(finalRecommendedBalance - finalCurrentBalance, 0);

  const projectionChart =
    maxProjectionBalance > 0
      ? `<div class="projection-graph">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Savings projections over time">
            <g class="projection-grid">
              ${yTicks
                .map((tick) => {
                  const y = yScale(tick);
                  return `<line x1="${chartPadding.left}" x2="${chartWidth - chartPadding.right}" y1="${y.toFixed(
                    2,
                  )}" y2="${y.toFixed(2)}" />`;
                })
                .join('')}
              ${xTicks
                .map((tick) => {
                  const x = xScale(tick);
                  return `<line y1="${chartPadding.top}" y2="${chartHeight - chartPadding.bottom}" x1="${x.toFixed(
                    2,
                  )}" x2="${x.toFixed(2)}" />`;
                })
                .join('')}
            </g>
            <line class="projection-axis" x1="${chartPadding.left}" y1="${chartHeight - chartPadding.bottom}" x2="${chartWidth - chartPadding.right}" y2="${chartHeight - chartPadding.bottom}" />
            <line class="projection-axis" x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartHeight - chartPadding.bottom}" />
            <path class="projection-line projection-line--current" d="${currentPath}" />
            <path class="projection-line projection-line--recommended" d="${recommendedPath}" />
            <g class="projection-markers projection-markers--current">
              ${currentSeries
                .map((point) => {
                  const x = xScale(point.year);
                  const y = yScale(point.balance);
                  return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" />`;
                })
                .join('')}
            </g>
            <g class="projection-markers projection-markers--recommended">
              ${recommendedSeries
                .map((point) => {
                  const x = xScale(point.year);
                  const y = yScale(point.balance);
                  return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" />`;
                })
                .join('')}
            </g>
            <g class="projection-labels projection-labels--x">
              ${xTicks
                .map((tick) => {
                  const x = xScale(tick);
                  return `<text x="${x.toFixed(2)}" y="${chartHeight - chartPadding.bottom + 24}" text-anchor="middle">Year ${tick}</text>`;
                })
                .join('')}
            </g>
            <g class="projection-labels projection-labels--y">
              ${yTicks
                .map((tick) => {
                  const y = yScale(tick);
                  return `<text x="${chartPadding.left - 12}" y="${(y + 6).toFixed(
                    2,
                  )}" text-anchor="end">${formatCurrency(tick)}</text>`;
                })
                .join('')}
            </g>
            <text class="projection-axis-label" x="${
              chartPadding.left +
              (chartWidth - chartPadding.left - chartPadding.right) / 2
            }" y="${chartHeight - 10}" text-anchor="middle">Time (years)</text>
            <text class="projection-axis-label" transform="rotate(-90)" x="${-
              (chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) / 2)
            }" y="${chartPadding.left - 52}" text-anchor="middle">Value</text>
          </svg>
          <div class="projection-legend">
            <span class="legend-item"><span class="legend-swatch legend-swatch--current"></span>Current contributions (${formatCurrency(
              monthlySavings,
            )}/mo @ ${formatPercent(assumedReturnRate)})</span>
            <span class="legend-item"><span class="legend-swatch legend-swatch--recommended"></span>Recommended plan (${formatCurrency(
              recommendedMonthlySavings,
            )}/mo @ ${formatPercent(recommendedReturnRate)})</span>
          </div>
        </div>`
      : `<p class="projection-empty">Enter savings and asset details to preview long-term growth.</p>`;

  const projectionComparison =
    additionalGrowth > 0
      ? `Following the recommended path could build approximately ${formatCurrency(
          finalRecommendedBalance,
        )} in ${projectionHorizon} years — about ${formatCurrency(
          additionalGrowth,
        )} more than continuing with the current approach.`
      : `At the current settings, both paths are projected to reach about ${formatCurrency(
          finalCurrentBalance,
        )} in ${projectionHorizon} years.`;

  const recommendationCopy =
    recommendedMonthlySavings > monthlySavings && recommendedMonthlySavings > 0
      ? `Increasing monthly savings to ${formatCurrency(
          recommendedMonthlySavings,
        )} and aiming for ${formatPercent(
          recommendedReturnRate,
        )} growth aligns with long-term goals.`
      : recommendedMonthlySavings > 0
      ? `Maintaining monthly savings of ${formatCurrency(
          monthlySavings,
        )} while targeting ${formatPercent(
          recommendedReturnRate,
        )} growth keeps you on the advised track.`
      : 'Add monthly savings to begin compounding progress toward your goals.';

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
        <p>${recommendationCopy}</p>
        <p>${projectionComparison}</p>
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
